import { useState } from 'react';
import { useChatData } from '@/hooks/use-chat-data';
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

const Index = () => {
  const [activeTab, setActiveTab] = useState<TabId>('chats');

  const {
    user, setUser,
    chats,
    activeChatId, setActiveChatId,
    messages,
    initialized,
    newChatOpen, setNewChatOpen,
    activeCall, setActiveCall,
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
    handleStartCall,
    handleCallFromChat,
  } = useChatData();

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

      {activeCall && (
        <CallOverlay chat={activeCall.chat} callType={activeCall.type} onEnd={() => setActiveCall(null)} />
      )}

      <NewChatDialog open={newChatOpen} onClose={() => setNewChatOpen(false)} onChatCreated={handleChatCreated} />
    </div>
  );
};

export default Index;
