CREATE TABLE IF NOT EXISTS "t_p37596662_server_chat_connecti".statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "t_p37596662_server_chat_connecti".users(id),
  type varchar(10) NOT NULL DEFAULT 'text',
  content text NOT NULL,
  image_url text,
  created_at timestamp without time zone DEFAULT now(),
  expires_at timestamp without time zone DEFAULT now() + interval '24 hours'
);