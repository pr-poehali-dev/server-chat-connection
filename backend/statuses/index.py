import json
import os
import psycopg2
import base64
import boto3
import uuid

S = os.environ.get('MAIN_DB_SCHEMA', 'public')
U = f'"{S}".users'
ST = f'"{S}".statuses'

def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def parse_body(event):
    raw = event.get('body') or ''
    if not raw or not raw.strip():
        return {}
    if event.get('isBase64Encoded'):
        try:
            raw = base64.b64decode(raw).decode('utf-8')
        except Exception:
            pass
    try:
        return json.loads(raw)
    except Exception:
        try:
            return json.loads(base64.b64decode(raw).decode('utf-8'))
        except Exception:
            return {}

def handler(event, context):
    """Статусы пользователей — публикация и просмотр (живут 24 часа)"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-User-Id', 'Access-Control-Max-Age': '86400'}, 'body': ''}

    headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'}
    method = event.get('httpMethod', 'GET')
    params = event.get('queryStringParameters', {}) or {}
    body = parse_body(event)
    action = params.get('action', '') or body.get('action', '')
    req_headers = event.get('headers', {}) or {}
    user_id = req_headers.get('x-user-id', '') or body.get('user_id', '') or params.get('user_id', '')

    conn = get_db()
    cur = conn.cursor()

    if action == 'list':
        if not user_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id required'})}

        cur.execute(f"""
            SELECT s.id, s.user_id, s.type, s.content, s.image_url, s.created_at,
                   u.display_name, u.avatar
            FROM {ST} s
            JOIN {U} u ON u.id = s.user_id
            WHERE s.expires_at > now()
            ORDER BY s.created_at DESC
            LIMIT 200
        """)

        rows = cur.fetchall()
        conn.close()

        by_user = {}
        for r in rows:
            uid = str(r[1])
            if uid not in by_user:
                by_user[uid] = {
                    'user_id': uid,
                    'display_name': r[6],
                    'avatar': r[7],
                    'is_mine': uid == user_id,
                    'statuses': []
                }
            by_user[uid]['statuses'].append({
                'id': str(r[0]),
                'type': r[2],
                'content': r[3],
                'image_url': r[4],
                'created_at': r[5].isoformat(),
            })

        result = sorted(by_user.values(), key=lambda x: (not x['is_mine'], x['statuses'][0]['created_at'] if x['statuses'] else ''), reverse=True)
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'users': result})}

    if method == 'POST' and action == 'publish':
        content = body.get('content', '').strip()
        status_type = body.get('type', 'text')
        image_data = body.get('image_data', '')
        image_url = None

        if not user_id or not content:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id and content required'})}

        if image_data:
            try:
                s3 = boto3.client('s3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                if ',' in image_data:
                    image_data = image_data.split(',', 1)[1]
                img_bytes = base64.b64decode(image_data)
                key = f'statuses/{uuid.uuid4().hex}.jpg'
                s3.put_object(Bucket='files', Key=key, Body=img_bytes, ContentType='image/jpeg')
                image_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/files/{key}"
                status_type = 'image'
            except Exception as e:
                print(f"[STATUSES] S3 upload error: {e}")

        cur.execute(
            f"INSERT INTO {ST} (user_id, type, content, image_url) VALUES (%s::uuid, %s, %s, %s) RETURNING id, created_at, expires_at",
            (user_id, status_type, content, image_url)
        )
        row = cur.fetchone()
        conn.commit()
        conn.close()

        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({
            'id': str(row[0]),
            'type': status_type,
            'content': content,
            'image_url': image_url,
            'created_at': row[1].isoformat(),
            'expires_at': row[2].isoformat(),
        })}

    if method == 'POST' and action == 'remove':
        status_id = body.get('status_id', '')
        if not user_id or not status_id:
            conn.close()
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'user_id and status_id required'})}

        cur.execute(f"UPDATE {ST} SET expires_at = now() WHERE id = %s::uuid AND user_id = %s::uuid", (status_id, user_id))
        conn.commit()
        conn.close()
        return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'ok': True})}

    conn.close()
    return {'statusCode': 200, 'headers': headers, 'body': json.dumps({'service': 'statuses', 'status': 'ok'})}
