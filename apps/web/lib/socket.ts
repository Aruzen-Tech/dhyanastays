'use client';

import { io, type Socket } from 'socket.io-client';
import { getToken } from './api';

/**
 * Shared socket.io connection to the API for realtime messaging. One socket per
 * tab, reused across conversations. The access token is read fresh on every
 * (re)connect via the async `auth` callback (uses the same token source as the
 * REST client, so custom-JWT and Auth0 modes both work, and a token refresh
 * survives a reconnect). Connects to the API origin directly (not the /api
 * rewrite). Transports default to polling→websocket upgrade for reliability —
 * websocket-only silently fails to connect wherever the WS upgrade is blocked.
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      // Default transports (['polling','websocket']) — starts on HTTP long-poll
      // then upgrades to WS. Robust across proxies/dev setups where a direct WS
      // upgrade fails; websocket-only would just never connect there.
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: (cb) => {
        getToken()
          .then((t) => cb({ token: t ?? '' }))
          .catch(() => cb({ token: '' }));
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      socket.on('connect', () => console.info('[socket] connected', socket?.id));
      socket.on('disconnect', (r) => console.info('[socket] disconnected:', r));
      socket.on('connect_error', (e) =>
        console.warn('[socket] connect_error:', e.message),
      );
      socket.on('unauthorized', () =>
        console.warn('[socket] unauthorized — bad/expired token'),
      );
    }
  }
  if (!socket.connected) socket.connect();
  return socket;
}
