import { useState, useEffect, useCallback, useRef } from 'react';
import { useChatData, saveCallToHistory } from '@/hooks/use-chat-data';
import useWebRTC from '@/hooks/use-webrtc';
import * as api from '@/lib/api';
import AppHeader from '@/components/AppHeader';
import ProfileScreen from '@/components/ProfileScreen';
import OfflineScreen from '@/components/OfflineScreen';
import ChatList from '@/components/ChatList';
import ChatWindow from '@/components/ChatWindow';
import EmptyState from '@/components/EmptyState';
import AuthScreen from '@/components/AuthScreen';
import NewChatDialog from '@/components/NewChatDialog';
import BottomNav, { type TabId } from '@/components/BottomNav';
import StatusScreen from '@/components/StatusScreen';
import CallsScreen from '@/components/CallsScreen';
import CallOverlay from '@/components/CallOverlay';
import IncomingCallOverlay from '@/components/IncomingCallOverlay';

interface IncomingCallData {
  id: string;
  caller_id: string;
  chat_id: string;
  call_type: 'voice' | 'video';
  sdp_offer: string;
  peer_name: string;
  peer_avatar: string;
  ice_candidates?: { id: string; candidate: string }[];
}

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chats');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);

  const {
    user, setUser,
    chats,
    activeChatId, setActiveChatId,
    messages,
    initialized,
    newChatOpen, setNewChatOpen,
    network,
    syncing, queueLength,
    handleSelectChat,
    handleSend,
    handleBack,
    handleDeleteMessage,
    handleLeaveChat,
    handleAuth,
    handleLogout,
    handleChatCreated,
  } = useChatData();

  const webrtc = useWebRTC(user?.user_id || null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user || !network.online) {
      if (incomingPollRef.current) clearInterval(incomingPollRef.current);
      return;
    }

    incomingPollRef.current = setInterval(async () => {
      if (webrtc.callState !== 'idle' || incomingCall) return;
      try {
        const res = await api.pollCall();
        if (res.call && res.call.callee_id === user.user_id && res.call.status === 'ringing') {
          setIncomingCall({
            id: res.call.id,
            caller_id: res.call.caller_id,
            chat_id: res.call.chat_id,
            call_type: res.call.call_type,
            sdp_offer: res.call.sdp_offer,
            peer_name: res.call.peer_name,
            peer_avatar: res.call.peer_avatar,
            ice_candidates: res.ice_candidates,
          });
        }
      } catch { /* noop */ }
    }, 2000);

    return () => { if (incomingPollRef.current) clearInterval(incomingPollRef.current); };
  }, [user, network.online, webrtc.callState, incomingCall]);

  const handleStartCall = useCallback((chat: typeof chats[0], type: 'voice' | 'video') => {
    if (!chat.partnerId || webrtc.callState !== 'idle') return;
    saveCallToHistory(chat, type, 'outgoing');
    webrtc.startCall(chat.partnerId, chat.id, type, chat.name, chat.avatar);
  }, [chats, webrtc]);

  const handleCallFromChat = useCallback((type: 'voice' | 'video') => {
    const chat = chats.find(c => c.id === activeChatId);
    if (chat) handleStartCall(chat, type);
  }, [chats, activeChatId, handleStartCall]);

  const handleAcceptIncoming = useCallback(() => {
    if (!incomingCall) return;
    const chat = chats.find(c => c.id === incomingCall.chat_id);
    if (chat) saveCallToHistory(chat, incomingCall.call_type, 'incoming');
    webrtc.acceptCall(incomingCall);
    setIncomingCall(null);
  }, [incomingCall, chats, webrtc]);

  const handleRejectIncoming = useCallback(() => {
    if (!incomingCall) return;
    const chat = chats.find(c => c.id === incomingCall.chat_id);
    if (chat) saveCallToHistory(chat, incomingCall.call_type, 'missed');
    webrtc.rejectCurrentCall(incomingCall.id);
    setIncomingCall(null);
  }, [incomingCall, chats, webrtc]);

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  if (!initialized) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md">
            <img src="https://cdn.poehali.dev/projects/2bf6d4f6-893f-48e1-986c-00c5bd829ead/files/79b23ae2-2716-4535-95e2-0056b3f1b56f.jpg" alt="Того" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm text-muted-foreground">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuth={handleAuth} />;

  if (!network.online && chats.length === 0 && initialized) return <OfflineScreen />;

  const activeChat = chats.find(c => c.id === activeChatId);
  const inChat = !!activeChatId;

  return (
    <div className="h-screen flex flex-col bg-background">
      <AppHeader
        displayName={user.display_name}
        online={network.online}
        quality={network.quality}
        syncing={syncing}
        queueLength={queueLength}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'chats' && (
          <>
            <aside className={`w-full lg:w-80 border-r border-border bg-card flex-shrink-0 ${inChat ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'}`}>
              <ChatList chats={chats} activeChatId={activeChatId} onSelect={handleSelectChat} onNewChat={() => setNewChatOpen(true)} />
            </aside>
            <main className={`flex-1 min-w-0 ${!inChat ? 'hidden lg:flex' : 'flex'} flex-col`}>
              {activeChat ? (
                <ChatWindow chat={activeChat} messages={messages} online={network.online} onSend={handleSend} onBack={handleBack} onCall={handleCallFromChat} onDeleteMessage={handleDeleteMessage} onLeaveChat={handleLeaveChat} />
              ) : (
                <EmptyState />
              )}
            </main>
          </>
        )}

        {activeTab === 'status' && (
          <div className="flex-1">
            <StatusScreen displayName={user.display_name} avatar={user.avatar} />
          </div>
        )}

        {activeTab === 'calls' && (
          <div className="flex-1">
            <CallsScreen chats={chats} onStartCall={handleStartCall} />
          </div>
        )}

        {activeTab === 'profile' && (
          <ProfileScreen user={user} onUpdate={setUser} onLogout={handleLogout} />
        )}
      </div>

      {!(inChat && activeTab === 'chats') && (
        <BottomNav active={activeTab} onChange={(tab) => { if (tab !== 'chats') setActiveChatId(null); setActiveTab(tab); }} unreadChats={totalUnread} />
      )}

      {webrtc.callState !== 'idle' && webrtc.callInfo && (
        <CallOverlay
          callState={webrtc.callState}
          callInfo={webrtc.callInfo}
          duration={webrtc.duration}
          muted={webrtc.muted}
          speakerOn={webrtc.speakerOn}
          onEnd={webrtc.endCurrentCall}
          onToggleMute={webrtc.toggleMute}
          onToggleSpeaker={webrtc.toggleSpeaker}
        />
      )}

      {incomingCall && webrtc.callState === 'idle' && (
        <IncomingCallOverlay
          peerName={incomingCall.peer_name}
          peerAvatar={incomingCall.peer_avatar}
          callType={incomingCall.call_type}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
        />
      )}

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onChatCreated={handleChatCreated} />
    </div>
  );
};

export default Index;
