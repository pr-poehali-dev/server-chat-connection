import json
import os
import psycopg2

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
U = f'"{S}".users'
M = f'"{S}".messages'
CM = f'"{S}".chat_members'

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event, context):
    """Отправка и получение сообщений в чатах"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body', '{}') or '{}')
    req_headers = event.get('headers', {})
    all_params = event.get('queryStringParameters', {}) or {}
    user_id = req_headers.get('x-user-id', '') or body.get('user_id', '') or all_params.get('user_id', '')

    conn = get_db()
    cur = conn.cursor()

    if method == 'POST' and path == '/send':
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

    if method == 'GET' and path == '/list':
        params = event.get('queryStringParameters', {}) or {}
        chat_id = params.get('chat_id', '')
        after = params.get('after', '')
        limit = int(params.get('limit', '50'))

        if not chat_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'chat_id required'})}

        if after:
            cur.execute(f"""
                SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
                FROM {M} m JOIN {U} u ON u.id = m.sender_id
                WHERE m.chat_id = %s::uuid AND m.created_at > %s::timestamp
                ORDER BY m.created_at ASC LIMIT %s
            """, (chat_id, after, limit))
        else:
            cur.execute(f"""
                SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
                FROM {M} m JOIN {U} u ON u.id = m.sender_id
                WHERE m.chat_id = %s::uuid
                ORDER BY m.created_at DESC LIMIT %s
            """, (chat_id, limit))

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

    if method == 'POST' and path == '/sync':
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

    if method == 'GET' and path == '/poll':
        params = event.get('queryStringParameters', {}) or {}
        after = params.get('after', '')

        if not user_id or not after:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'messages': []})}

        cur.execute(f"""
            SELECT m.id, m.chat_id, m.sender_id, m.text, m.status, m.created_at, u.display_name, u.avatar
            FROM {M} m
            JOIN {U} u ON u.id = m.sender_id
            JOIN {CM} cm ON cm.chat_id = m.chat_id AND cm.user_id = %s::uuid
            WHERE m.created_at > %s::timestamp AND m.sender_id != %s::uuid
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

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'messages', 'status': 'ok'})}