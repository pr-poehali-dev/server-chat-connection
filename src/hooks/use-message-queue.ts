import { useState, useEffect, useCallback, useRef } from 'react';
import { Message, addToQueue, getQueue, removeFromQueue, saveMessage } from '@/lib/storage';

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
    for (const msg of pending) {
      try {
        await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));
        const updated = { ...msg, status: 'delivered' as const };
        await saveMessage(updated);
        await removeFromQueue(msg.id);
        setQueue(prev => prev.filter(m => m.id !== msg.id));
      } catch {
        const failed = { ...msg, status: 'failed' as const };
        await saveMessage(failed);
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
