ALTER TABLE t_p37596662_server_chat_connecti.messages ADD COLUMN hidden_for_all boolean DEFAULT false;
ALTER TABLE t_p37596662_server_chat_connecti.messages ADD COLUMN hidden_at timestamp without time zone;
ALTER TABLE t_p37596662_server_chat_connecti.messages ADD COLUMN hidden_by uuid;
ALTER TABLE t_p37596662_server_chat_connecti.chat_members ADD COLUMN left_at timestamp without time zone;
