import { PeerSettings } from '../types';

export const DEFAULT_PEER_SETTINGS: PeerSettings = {
  useCustomServer: false,
  serverHost: '0.peerjs.com',
  serverPort: 443,
  serverPath: '/',
  serverSecure: true,
  stunServers: [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
    'stun:stun3.l.google.com:19302',
    'stun:stun4.l.google.com:19302',
    'stun:openrelay.metered.ca:80',
  ],
};

const ADJECTIVES = ['quick', 'bright', 'cyber', 'swift', 'hyper', 'sonic', 'neon', 'stellar', 'silent', 'amber', 'vivid', 'cosmic'];
const NOUNS = ['fox', 'stream', 'pulse', 'beacon', 'spark', 'wave', 'signal', 'hawk', 'nexus', 'prism', 'falcon', 'echo'];

export function generateRoomId(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${adj}-${noun}-${num}`;
}

export function sanitizeRoomId(roomId: string): string {
  return roomId.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 32);
}

export function getHostPeerId(roomId: string): string {
  const clean = sanitizeRoomId(roomId);
  return `sc_${clean}_host`;
}

export function getViewerPeerId(roomId: string): string {
  const clean = sanitizeRoomId(roomId);
  const rand = Math.random().toString(36).substring(2, 7);
  return `sc_${clean}_v_${rand}`;
}

/**
 * Returns full shareable URL preserving GitHub Pages subdirectory
 */
export function getBroadcastUrl(roomId: string, role: 'viewer' | 'host' = 'viewer'): string {
  const url = new URL(window.location.href);
  url.searchParams.set('room', sanitizeRoomId(roomId));
  if (role === 'host') {
    url.searchParams.set('role', 'host');
  } else {
    url.searchParams.delete('role');
  }
  url.hash = '';
  return url.toString();
}

/**
 * Parses room and role from query string or hash for GitHub Pages compatibility
 */
export function parseInitialParams(): { roomId: string | null; role: 'host' | 'viewer' | null } {
  try {
    const url = new URL(window.location.href);
    let roomId = url.searchParams.get('room');
    let roleParam = url.searchParams.get('role');

    // Also check hash fallback (e.g. #room=xyz or #/watch?room=xyz)
    if (!roomId && url.hash) {
      const hashStr = url.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashStr.includes('?') ? hashStr.split('?')[1] : hashStr);
      roomId = hashParams.get('room') || (hashStr.startsWith('room=') ? hashStr.split('=')[1] : null);
      if (!roleParam) roleParam = hashParams.get('role');
    }

    let role: 'host' | 'viewer' | null = null;
    if (roleParam === 'host') {
      role = 'host';
    } else if (roomId) {
      // Default to viewer if a room is in URL and role wasn't specified as host
      role = 'viewer';
    }

    return {
      roomId: roomId ? sanitizeRoomId(roomId) : null,
      role,
    };
  } catch (e) {
    console.error('Failed to parse URL params:', e);
    return { roomId: null, role: null };
  }
}

export function updateUrl(roomId: string | null, role: 'host' | 'viewer' | null) {
  try {
    const url = new URL(window.location.href);
    if (roomId) {
      url.searchParams.set('room', sanitizeRoomId(roomId));
      if (role === 'host') {
        url.searchParams.set('role', 'host');
      } else {
        url.searchParams.delete('role');
      }
    } else {
      url.searchParams.delete('room');
      url.searchParams.delete('role');
    }
    window.history.replaceState({}, '', url.toString());
  } catch {
    // Ignore history errors if any
  }
}
