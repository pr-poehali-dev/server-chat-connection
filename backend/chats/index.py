import json
import os
import psycopg2

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
U = f'"{S}".users'
C = f'"{S}".chats'
CM = f'"{S}".chat_members'
M = f'"{S}".messages'

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event, context):
    """Управление чатами — создание, получение списка чатов пользователя"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    body = json.loads(event.get('body', '{}') or '{}')
    req_headers = event.get('headers', {})
    params = event.get('queryStringParameters', {}) or {}
    user_id = req_headers.get('x-user-id', '') or body.get('user_id', '') or params.get('user_id', '')

    conn = get_db()
    cur = conn.cursor()

    if method == 'GET' and path == '/list':
        if not user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id required'})}

        cur.execute(f"""
            SELECT c.id, c.is_group, c.name,
                   u2.id, u2.username, u2.display_name, u2.avatar, u2.is_online,
                   (SELECT text FROM {M} WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1),
                   (SELECT created_at FROM {M} WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1),
                   (SELECT COUNT(*) FROM {M} WHERE chat_id = c.id AND sender_id != %s::uuid AND status = 'sent')
            FROM {C} c
            JOIN {CM} cm ON cm.chat_id = c.id AND cm.user_id = %s::uuid
            LEFT JOIN {CM} cm2 ON cm2.chat_id = c.id AND cm2.user_id != %s::uuid
            LEFT JOIN {U} u2 ON u2.id = cm2.user_id
            ORDER BY (SELECT created_at FROM {M} WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) DESC NULLS LAST
        """, (user_id, user_id, user_id))

        chats = []
        for r in cur.fetchall():
            chat_name = r[2] if r[1] else (r[5] or r[4] or 'Чат')
            chat_avatar = r[6] or (chat_name[0].upper() if chat_name else '?')
            chats.append({
                'id': str(r[0]),
                'is_group': r[1],
                'name': chat_name,
                'partner_id': str(r[3]) if r[3] else None,
                'avatar': chat_avatar,
                'online': r[7] or False,
                'last_message': r[8] or '',
                'last_timestamp': r[9].isoformat() if r[9] else None,
                'unread': r[10] or 0,
            })

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'chats': chats})}

    if method == 'POST' and path == '/create':
        partner_id = body.get('partner_id', '')
        if not user_id or not partner_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id and partner_id required'})}

        cur.execute(f"""
            SELECT c.id FROM {C} c
            JOIN {CM} cm1 ON cm1.chat_id = c.id AND cm1.user_id = %s::uuid
            JOIN {CM} cm2 ON cm2.chat_id = c.id AND cm2.user_id = %s::uuid
            WHERE c.is_group = false
            LIMIT 1
        """, (user_id, partner_id))
        existing = cur.fetchone()

        if existing:
            chat_id = str(existing[0])
        else:
            cur.execute(f"INSERT INTO {C} (is_group) VALUES (false) RETURNING id")
            chat_id = str(cur.fetchone()[0])
            cur.execute(f"INSERT INTO {CM} (chat_id, user_id) VALUES (%s::uuid, %s::uuid)", (chat_id, user_id))
            cur.execute(f"INSERT INTO {CM} (chat_id, user_id) VALUES (%s::uuid, %s::uuid)", (chat_id, partner_id))
            conn.commit()

        cur.execute(f"SELECT id, username, display_name, avatar, is_online FROM {U} WHERE id = %s::uuid", (partner_id,))
        partner = cur.fetchone()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'chat_id': chat_id,
            'partner': {'id': str(partner[0]), 'username': partner[1], 'display_name': partner[2], 'avatar': partner[3], 'online': partner[4]} if partner else None
        })}

    if method == 'POST' and path == '/read':
        chat_id = body.get('chat_id', '')
        if user_id and chat_id:
            cur.execute(f"UPDATE {M} SET status = 'delivered' WHERE chat_id = %s::uuid AND sender_id != %s::uuid AND status = 'sent'", (chat_id, user_id))
            conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'chats', 'status': 'ok'})}