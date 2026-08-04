'use client';

import { io, type Socket } from 'socket.io-client';
import { tokenStore } from './api';

/**
 * Shared socket.io connection to the API for realtime messaging. One socket per
 * tab, reused across conversations. The access token is read fresh on every
 * (re)connect via the dynamic `auth` callback, so a token refresh survives a
 * reconnect. Connects to the API origin directly (not the /api rewrite).
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket'],
      auth: (cb) => cb({ token: tokenStore.getAccess() ?? '' }),
    });
  }
  if (!socket.connected) socket.connect();
  return socket;
}
