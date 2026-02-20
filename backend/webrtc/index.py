import json
import os
import psycopg2

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
CALLS = f'"{S}".calls'
ICE = f'"{S}".ice_candidates'
U = f'"{S}".users'
CM = f'"{S}".chat_members'

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def parse_body(event):
    import base64 as b64
    raw = event.get('body') or ''
    if not raw or not raw.strip():
        return {}
    if event.get('isBase64Encoded'):
        try:
            raw = b64.b64decode(raw).decode('utf-8')
        except Exception:
            pass
    try:
        return json.loads(raw)
    except Exception:
        pass
    try:
        decoded = b64.b64decode(raw).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return {}

def handler(event, context):
    """WebRTC сигналинг для голосовых и видеозвонков в мессенджере Того"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    body = parse_body(event)
    action = params.get('action', '') or body.get('action', '')
    req_headers = event.get('headers', {}) or {}
    user_id = req_headers.get('x-user-id', '') or body.get('user_id', '') or params.get('user_id', '')

    conn = get_db()
    cur = conn.cursor()

    if method == 'POST' and action == 'initiate':
        callee_id = body.get('callee_id', '')
        chat_id = body.get('chat_id', '')
        call_type = body.get('call_type', 'voice')
        sdp_offer = body.get('sdp_offer', '')

        if not user_id or not callee_id or not chat_id or not sdp_offer:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id, callee_id, chat_id and sdp_offer required'})}

        cur.execute(f"UPDATE {CALLS} SET status = 'cancelled', ended_at = now() WHERE caller_id = %s::uuid AND status IN ('ringing', 'active')", (user_id,))
        cur.execute(f"UPDATE {CALLS} SET status = 'cancelled', ended_at = now() WHERE callee_id = %s::uuid AND status IN ('ringing', 'active')", (user_id,))

        cur.execute(
            f"INSERT INTO {CALLS} (caller_id, callee_id, chat_id, call_type, status, sdp_offer) VALUES (%s::uuid, %s::uuid, %s::uuid, %s, 'ringing', %s) RETURNING id, created_at",
            (user_id, callee_id, chat_id, call_type, sdp_offer)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'call_id': str(row[0]),
            'created_at': row[1].isoformat(),
        })}

    if method == 'POST' and action == 'answer':
        call_id = body.get('call_id', '')
        sdp_answer = body.get('sdp_answer', '')

        if not user_id or not call_id or not sdp_answer:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'call_id and sdp_answer required'})}

        cur.execute(f"UPDATE {CALLS} SET sdp_answer = %s, status = 'active', answered_at = now() WHERE id = %s::uuid AND callee_id = %s::uuid AND status = 'ringing'", (sdp_answer, call_id, user_id))
        updated = cur.rowcount
        conn.commit()
        conn.close()

        if updated == 0:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Call not found or already answered'})}

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'POST' and action == 'ice':
        call_id = body.get('call_id', '')
        candidate = body.get('candidate', '')

        if not user_id or not call_id or not candidate:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'call_id and candidate required'})}

        cur.execute(
            f"INSERT INTO {ICE} (call_id, sender_id, candidate) VALUES (%s::uuid, %s::uuid, %s)",
            (call_id, user_id, candidate)
        )
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'POST' and action == 'end':
        call_id = body.get('call_id', '')

        if not user_id or not call_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'call_id required'})}

        cur.execute(f"UPDATE {CALLS} SET status = 'ended', ended_at = now() WHERE id = %s::uuid AND (caller_id = %s::uuid OR callee_id = %s::uuid) AND status IN ('ringing', 'active')", (call_id, user_id, user_id))
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if method == 'POST' and action == 'reject':
        call_id = body.get('call_id', '')

        if not user_id or not call_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'call_id required'})}

        cur.execute(f"UPDATE {CALLS} SET status = 'rejected', ended_at = now() WHERE id = %s::uuid AND callee_id = %s::uuid AND status = 'ringing'", (call_id, user_id))
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    if action == 'poll':
        if not user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id required'})}

        cur.execute(f"""
            SELECT c.id, c.caller_id, c.callee_id, c.chat_id, c.call_type, c.status, c.sdp_offer, c.sdp_answer, c.created_at,
                   u.display_name, u.avatar
            FROM {CALLS} c
            JOIN {U} u ON u.id = CASE WHEN c.caller_id = %s::uuid THEN c.callee_id ELSE c.caller_id END
            WHERE (c.caller_id = %s::uuid OR c.callee_id = %s::uuid)
              AND c.status IN ('ringing', 'active')
              AND c.created_at > now() - interval '2 minutes'
            ORDER BY c.created_at DESC LIMIT 1
        """, (user_id, user_id, user_id))

        row = cur.fetchone()
        if not row:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'call': None})}

        call_id = str(row[0])
        caller_id = str(row[1])

        cur.execute(f"SELECT id, candidate FROM {ICE} WHERE call_id = %s::uuid AND sender_id != %s::uuid ORDER BY created_at ASC", (call_id, user_id))
        candidates = [{'id': str(r[0]), 'candidate': r[1]} for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'call': {
                'id': call_id,
                'caller_id': caller_id,
                'callee_id': str(row[2]),
                'chat_id': str(row[3]),
                'call_type': row[4],
                'status': row[5],
                'sdp_offer': row[6],
                'sdp_answer': row[7],
                'created_at': row[8].isoformat(),
                'peer_name': row[9],
                'peer_avatar': row[10],
            },
            'ice_candidates': candidates,
        })}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'webrtc', 'status': 'ok'})}
