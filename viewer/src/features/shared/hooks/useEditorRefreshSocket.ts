import { useEffect, useRef } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

function getEditorBaseUrl(): string | null {
  const url =
    import.meta.env.VITE_EDITOR_API_URL ??
    (import.meta.env.DEV ? 'http://localhost:5001/api/export/dataset' : null);
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Subscribes to the editor's `/topic/metadata` socket and fires `onRefresh`
 * when the editor publishes a new dataset version. Safe to use in production
 * too (no-op when no editor URL is configured).
 */
export function useEditorRefreshSocket(onRefresh: () => void): void {
  // Connect once and keep `onRefresh` current via a ref so callers can pass
  // an inline callback without causing reconnects.
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const baseUrl = getEditorBaseUrl();
    if (!baseUrl) return;
    const socket = new SockJS(`${baseUrl}/ws`);
    const stompClient = Stomp.over(socket);
    stompClient.connect({}, () => {
      stompClient.subscribe('/topic/metadata', () => {
        onRefreshRef.current();
      });
    });
    return () => {
      try {
        stompClient?.disconnect?.();
      } catch {
        // ignore
      }
    };
  }, []);
}
