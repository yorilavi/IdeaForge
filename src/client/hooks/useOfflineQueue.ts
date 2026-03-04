import { useState, useEffect, useCallback } from "preact/hooks";

const QUEUE_KEY = "ideaforge_offline_queue";

interface QueuedIdea {
  title: string;
  body: string;
  source: string;
  queuedAt: string;
}

function getQueue(): QueuedIdea[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedIdea[]): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue(onSynced: () => void) {
  const [queueSize, setQueueSize] = useState(getQueue().length);
  const [syncing, setSyncing] = useState(false);

  const enqueue = useCallback((title: string, body: string, source: string) => {
    const queue = getQueue();
    queue.push({ title, body, source, queuedAt: new Date().toISOString() });
    saveQueue(queue);
    setQueueSize(queue.length);
  }, []);

  const syncQueue = useCallback(async () => {
    const queue = getQueue();
    if (queue.length === 0 || syncing) return;

    setSyncing(true);
    const remaining: QueuedIdea[] = [];

    for (const item of queue) {
      try {
        const res = await fetch("/api/ideas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: item.title,
            body: item.body,
            source: item.source,
          }),
        });
        if (!res.ok) {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
        break; // Still offline, stop trying
      }
    }

    saveQueue(remaining);
    setQueueSize(remaining.length);
    setSyncing(false);

    if (remaining.length < queue.length) {
      onSynced();
    }
  }, [syncing, onSynced]);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = () => syncQueue();
    window.addEventListener("online", handleOnline);

    // Also listen for SW trigger
    if (navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", (e) => {
        if (e.data?.type === "TRIGGER_SYNC") syncQueue();
      });
    }

    // Try syncing on mount (in case we came back online while closed)
    if (navigator.onLine && getQueue().length > 0) {
      syncQueue();
    }

    return () => window.removeEventListener("online", handleOnline);
  }, [syncQueue]);

  return { enqueue, syncQueue, queueSize, syncing };
}
