
CREATE TABLE "t_p37596662_server_chat_connecti".calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES "t_p37596662_server_chat_connecti".users(id),
    callee_id UUID NOT NULL REFERENCES "t_p37596662_server_chat_connecti".users(id),
    chat_id UUID NOT NULL REFERENCES "t_p37596662_server_chat_connecti".chats(id),
    call_type VARCHAR(10) NOT NULL DEFAULT 'voice',
    status VARCHAR(20) NOT NULL DEFAULT 'ringing',
    sdp_offer TEXT,
    sdp_answer TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    answered_at TIMESTAMP,
    ended_at TIMESTAMP
);

CREATE TABLE "t_p37596662_server_chat_connecti".ice_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES "t_p37596662_server_chat_connecti".calls(id),
    sender_id UUID NOT NULL,
    candidate TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_calls_callee_status ON "t_p37596662_server_chat_connecti".calls(callee_id, status) WHERE status IN ('ringing', 'active');
CREATE INDEX idx_calls_caller_status ON "t_p37596662_server_chat_connecti".calls(caller_id, status) WHERE status IN ('ringing', 'active');
CREATE INDEX idx_ice_call_id ON "t_p37596662_server_chat_connecti".ice_candidates(call_id, sender_id);
