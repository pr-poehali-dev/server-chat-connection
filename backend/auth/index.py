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
    """Регистрация и авторизация пользователей мессенджера Того по телефону"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    body = parse_body(event)
    action = params.get('action', '') or body.get('action', '')
    print(f"[AUTH] {method} action={action} body_keys={list(body.keys())} isBase64={event.get('isBase64Encoded')}")

    conn = get_db()
    cur = conn.cursor()

    if method == 'POST' and action == 'register':
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

    if method == 'POST' and action == 'login':
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

    if method == 'POST' and action == 'search':
        raw_query = body.get('query', '').strip()
        user_id = body.get('user_id', '')

        if not raw_query or len(raw_query) < 2:
            conn.close()
            return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': []})}

        phone_query = clean_phone(raw_query)
        name_pattern = f'%{raw_query}%'

        if phone_query and len(phone_query) >= 5:
            cur.execute(
                f"SELECT id, phone, display_name, avatar, is_online FROM {U} WHERE (phone LIKE %s OR LOWER(display_name) LIKE LOWER(%s)) AND id::text != %s LIMIT 20",
                (f'%{phone_query}%', name_pattern, user_id)
            )
        else:
            cur.execute(
                f"SELECT id, phone, display_name, avatar, is_online FROM {U} WHERE LOWER(display_name) LIKE LOWER(%s) AND id::text != %s LIMIT 20",
                (name_pattern, user_id)
            )
        users = [{'id': str(r[0]), 'phone': r[1], 'display_name': r[2], 'avatar': r[3], 'online': r[4]} for r in cur.fetchall()]
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': users})}

    if method == 'POST' and action == 'update_profile':
        user_id = body.get('user_id', '')
        display_name = body.get('display_name', '').strip()
        avatar = body.get('avatar', '').strip()

        if not user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id required'})}

        if display_name:
            if not avatar:
                avatar = display_name[0].upper()
            cur.execute(f"UPDATE {U} SET display_name = %s, avatar = %s WHERE id = %s::uuid RETURNING id, phone, display_name, avatar", (display_name, avatar, user_id))
        elif avatar:
            cur.execute(f"UPDATE {U} SET avatar = %s WHERE id = %s::uuid RETURNING id, phone, display_name, avatar", (avatar, user_id))
        else:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'display_name or avatar required'})}

        row = cur.fetchone()
        conn.commit()
        conn.close()

        if not row:
            return {'statusCode': 404, 'headers': headers, 'body': json.dumps({'error': 'user not found'})}

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'user_id': user_id, 'phone': row[1], 'display_name': row[2], 'avatar': row[3]})}

    if method == 'POST' and action == 'status':
        user_id = body.get('user_id', '')
        is_online = body.get('online', False)

        if user_id:
            cur.execute(f"UPDATE {U} SET is_online = %s, last_seen = now() WHERE id = %s::uuid", (is_online, user_id))
            conn.commit()

        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'auth', 'status': 'ok'})}