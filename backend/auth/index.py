import json
import os
import hashlib
import uuid
import re
import psycopg2

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
U = f'"{S}".users'

def clean_phone(phone):
    digits = re.sub(r'\D', '', phone)
    if digits.startswith('8') and len(digits) == 11:
        digits = '7' + digits[1:]
    if not digits.startswith('7'):
        digits = '7' + digits
    return '+' + digits if len(digits) >= 10 else ''

def hash_password(password):
    salt = uuid.uuid4().hex
    return hashlib.sha256((salt + password).encode()).hexdigest() + ':' + salt

def verify_password(stored, provided):
    hash_val, salt = stored.split(':')
    return hash_val == hashlib.sha256((salt + provided).encode()).hexdigest()

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def handler(event, context):
    """Регистрация и авторизация пользователей мессенджера по телефону"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    raw_body = event.get('body') or ''
    if event.get('isBase64Encoded') and raw_body:
        import base64
        raw_body = base64.b64decode(raw_body).decode('utf-8')
    try:
        body = json.loads(raw_body) if raw_body.strip() else {}
    except Exception:
        body = {}

    conn = get_db()
    cur = conn.cursor()

    if method == 'POST' and path == '/register':
        phone = clean_phone(body.get('phone', ''))
        display_name = body.get('display_name', '').strip()
        password = body.get('password', '')

        if not phone or len(phone) < 11:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите корректный номер телефона'})}

        if not password or len(password) < 4:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Пароль минимум 4 символа'})}

        if not display_name:
            display_name = phone

        avatar = display_name[0].upper()

        cur.execute(f"SELECT id FROM {U} WHERE phone = %s", (phone,))
        if cur.fetchone():
            conn.close()
            return {'statusCode': 409, 'headers': headers, 'body': json.dumps({'error': 'Этот номер уже зарегистрирован'})}

        username = phone.replace('+', '')
        pw_hash = hash_password(password)
        cur.execute(
            f"INSERT INTO {U} (username, phone, display_name, password_hash, avatar, is_online) VALUES (%s, %s, %s, %s, %s, true) RETURNING id",
            (username, phone, display_name, pw_hash, avatar)
        )
        user_id = str(cur.fetchone()[0])
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'user_id': user_id, 'phone': phone, 'display_name': display_name, 'avatar': avatar})}

    if method == 'POST' and path == '/login':
        phone = clean_phone(body.get('phone', ''))
        password = body.get('password', '')

        if not phone:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Введите номер телефона'})}

        cur.execute(f"SELECT id, username, display_name, password_hash, avatar, phone FROM {U} WHERE phone = %s", (phone,))
        row = cur.fetchone()
        if not row or not verify_password(row[3], password):
            conn.close()
            return {'statusCode': 401, 'headers': headers, 'body': json.dumps({'error': 'Неверный номер или пароль'})}

        cur.execute(f"UPDATE {U} SET is_online = true, last_seen = now() WHERE id = %s", (row[0],))
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'user_id': str(row[0]), 'phone': row[5], 'display_name': row[2], 'avatar': row[4]})}

    if method == 'POST' and path == '/search':
        query = clean_phone(body.get('query', ''))
        user_id = body.get('user_id', '')

        if not query or len(query) < 5:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': []})}

        cur.execute(
            f"SELECT id, phone, display_name, avatar, is_online FROM {U} WHERE phone LIKE %s AND id::text != %s LIMIT 20",
            (f'%{query}%', user_id)
        )
        users = [{'id': str(r[0]), 'phone': r[1], 'display_name': r[2], 'avatar': r[3], 'online': r[4]} for r in cur.fetchall()]
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': users})}

    if method == 'POST' and path == '/status':
        user_id = body.get('user_id', '')
        is_online = body.get('online', False)

        if user_id:
            cur.execute(f"UPDATE {U} SET is_online = %s, last_seen = now() WHERE id = %s::uuid", (is_online, user_id))
            conn.commit()

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'auth', 'status': 'ok'})}