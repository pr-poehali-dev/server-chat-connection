CREATE TABLE IF NOT EXISTS "t_p37596662_server_chat_connecti".push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "t_p37596662_server_chat_connecti".users(id),
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  UNIQUE(user_id, endpoint)
);