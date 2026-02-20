import json
import os
import psycopg2
from datetime import datetime

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
U = f'"{S}".users'
M = f'"{S}".messages'
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
    """Отправка и получение сообщений в чатах"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    body = parse_body(event)
    action = params.get('action', '') or body.get('action', '')
    req_headers = event.get('headers', {})
    user_id = req_headers.get('x-user-id', '') or body.get('user_id', '') or params.get('user_id', '')

    conn = get_db()
    cur = conn.cursor()

    if method == 'POST' and action == 'send':
        chat_id = body.get('chat_id', '')
        text = body.get('text', '').strip()
        client_id = body.get('client_id', '')

        if not user_id or not chat_id or not text:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id, chat_id and text required'})}

        cur.execute(
            f"INSERT INTO {M} (chat_id, sender_id, text, status) VALUES (%s::uuid, %s::uuid, %s, 'sent') RETURNING id, created_at",
            (chat_id, user_id, text)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'id': str(row[0]),
            'client_id': client_id,
            'chat_id': chat_id,
            'sender_id': user_id,
            'text': text,
            'status': 'sent',
            'created_at': row[1].isoformat(),
        })}

    if action == 'list':
        chat_id = params.get('chat_id', '') or body.get('chat_id', '')
        after = params.get('after', '') or body.get('after', '')
        limit = int(params.get('limit', '50'))

        if not chat_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'chat_id required'})}

        uid_filter = user_id or '00000000-0000-0000-0000-000000000000'
        if after:
            cur.execute(f"""
                SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
                FROM {M} m JOIN {U} u ON u.id = m.sender_id
                WHERE m.chat_id = %s::uuid AND m.created_at > %s::timestamp
                  AND m.hidden_for_all = false
                  AND (m.hidden_by IS NULL OR m.hidden_by != %s::uuid OR m.sender_id = %s::uuid)
                ORDER BY m.created_at ASC LIMIT %s
            """, (chat_id, after, uid_filter, uid_filter, limit))
        else:
            cur.execute(f"""
                SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
                FROM {M} m JOIN {U} u ON u.id = m.sender_id
                WHERE m.chat_id = %s::uuid
                  AND m.hidden_for_all = false
                  AND (m.hidden_by IS NULL OR m.hidden_by != %s::uuid OR m.sender_id = %s::uuid)
                ORDER BY m.created_at DESC LIMIT %s
            """, (chat_id, uid_filter, uid_filter, limit))

        rows = cur.fetchall()
        if not after:
            rows = list(reversed(rows))

        messages = [{
            'id': str(r[0]),
            'chat_id': str(r[1]),
            'sender_id': str(r[2]),
            'text': r[3],
            'status': r[4],
            'created_at': r[5].isoformat(),
            'sender_name': r[6],
            'sender_avatar': r[7],
        } for r in rows]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': messages})}

    if method == 'POST' and action == 'sync':
        msgs = body.get('messages', [])
        results = []
        for msg in msgs:
            chat_id = msg.get('chat_id', '')
            text = msg.get('text', '').strip()
            client_id = msg.get('client_id', '')
            if user_id and chat_id and text:
                cur.execute(
                    f"INSERT INTO {M} (chat_id, sender_id, text, status) VALUES (%s::uuid, %s::uuid, %s, 'sent') RETURNING id, created_at",
                    (chat_id, user_id, text)
                )
                row = cur.fetchone()
                results.append({'id': str(row[0]), 'client_id': client_id, 'status': 'sent', 'created_at': row[1].isoformat()})
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'results': results})}

    if action == 'poll':
        after = params.get('after', '') or body.get('after', '')

        if not user_id or not after:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': []})}

        cur.execute(f"""
            SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
            FROM {M} m
            JOIN {U} u ON u.id = m.sender_id
            JOIN {CM} cm ON cm.chat_id = m.chat_id AND cm.user_id = %s::uuid AND cm.left_at IS NULL
            WHERE m.created_at > %s::timestamp AND m.sender_id != %s::uuid
              AND m.hidden_for_all = false
            ORDER BY m.created_at ASC LIMIT 100
        """, (user_id, after, user_id))

        messages = [{
            'id': str(r[0]),
            'chat_id': str(r[1]),
            'sender_id': str(r[2]),
            'text': r[3],
            'status': r[4],
            'created_at': r[5].isoformat(),
            'sender_name': r[6],
            'sender_avatar': r[7],
        } for r in cur.fetchall()]

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': messages})}

    if method == 'POST' and action == 'delete_message':
        msg_id = body.get('msg_id', '')
        delete_for_all = body.get('for_all', False)

        if not user_id or not msg_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id and msg_id required'})}

        cur.execute(f"SELECT sender_id, created_at FROM {M} WHERE id = %s::uuid", (msg_id,))
        row = cur.fetchone()
        if not row:
            conn.close()
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'Message not found'})}

        sender_id = str(row[0])
        created_at = row[1]
        age_hours = (datetime.utcnow() - created_at).total_seconds() / 3600

        if delete_for_all:
            if sender_id != user_id:
                conn.close()
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Только автор может удалить для всех'})}
            if age_hours > 24:
                conn.close()
                return {'statusCode': 403, 'headers': headers, 'body': json.dumps({'error': 'Можно удалить для всех только в течение 24 часов'})}
            cur.execute(f"UPDATE {M} SET hidden_for_all = true, hidden_at = now(), hidden_by = %s::uuid WHERE id = %s::uuid", (user_id, msg_id))
        else:
            cur.execute(f"UPDATE {M} SET hidden_by = %s::uuid WHERE id = %s::uuid AND hidden_by IS NULL", (user_id, msg_id))

        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True, 'msg_id': msg_id, 'for_all': delete_for_all})}

    if method == 'POST' and action == 'leave_chat':
        chat_id = body.get('chat_id', '')
        if not user_id or not chat_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id and chat_id required'})}

        cur.execute(f"UPDATE {CM} SET left_at = now() WHERE chat_id = %s::uuid AND user_id = %s::uuid AND left_at IS NULL", (chat_id, user_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'messages', 'status': 'ok'})}