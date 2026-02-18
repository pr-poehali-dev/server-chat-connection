import { useState, useEffect, useCallback, useRef } from 'react';
import { type Message, addToQueue, getQueue, removeFromQueue, saveMessage } from '@/lib/storage';
import { syncMessages } from '@/lib/api';

export function useMessageQueue(online: boolean) {
  const [queue, setQueue] = useState<Message[]>([]);
  const [syncing, setSyncing] = useState(false);
  const processingRef = useRef(false);

  useEffect(() => {
    getQueue().then(setQueue);
  }, []);

  const enqueue = useCallback(async (msg: Message) => {
    await addToQueue(msg);
    await saveMessage(msg);
    setQueue(prev => [...prev, msg]);
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current || !online) return;
    processingRef.current = true;
    setSyncing(true);

    const pending = await getQueue();
    if (pending.length > 0) {
      try {
        const payload = pending.map(m => ({
          chat_id: m.chatId,
          text: m.text,
          client_id: m.id,
        }));
        const result = await syncMessages(payload);
        if (result.results) {
          for (const msg of pending) {
            const synced = result.results.find((r: { client_id: string }) => r.client_id === msg.id);
            if (synced) {
              const updated = { ...msg, status: 'delivered' as const };
              await saveMessage(updated);
              await removeFromQueue(msg.id);
            }
          }
        }
        setQueue([]);
      } catch {
        for (const msg of pending) {
          const failed = { ...msg, status: 'failed' as const };
          await saveMessage(failed);
        }
      }
    }

    processingRef.current = false;
    setSyncing(false);
  }, [online]);

  useEffect(() => {
    if (online && queue.length > 0) {
      processQueue();
    }
  }, [online, queue.length, processQueue]);

  return { queue, enqueue, syncing, queueLength: queue.length };
}

export default useMessageQueue;
