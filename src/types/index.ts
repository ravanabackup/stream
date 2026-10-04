export type BroadcastRole = 'host' | 'viewer' | 'select';

export type MediaSourceType = 'webcam' | 'screen' | 'canvas' | 'audio-only';

export type QualityPreset = '1080p' | '720p' | '480p' | '360p';

export interface StreamStats {
  fps: number;
  resolution: string;
  rtt: number; // ms
  bitrate: string; // kbps or mbps
  packetLoss: number; // percentage
  codec?: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  isHost: boolean;
  text: string;
  timestamp: number;
}

export interface FloatingReaction {
  id: string;
  emoji: string;
  x: number; // percentage 10-90%
}

export interface ViewerInfo {
  id: string;
  name: string;
  connectedAt: number;
  ping?: number;
}

export interface PeerSettings {
  useCustomServer: boolean;
  serverHost: string;
  serverPort: number;
  serverPath: string;
  serverSecure: boolean;
  stunServers: string[];
  turnServer?: string;
  turnUsername?: string;
  turnCredential?: string;
}

export interface AudioProcessingSettings {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  systemAudio: boolean;
}

export type PeerDataMessage = 
  | { type: 'chat'; message: ChatMessage }
  | { type: 'reaction'; emoji: string }
  | { type: 'ping'; timestamp: number }
  | { type: 'pong'; timestamp: number; clientTimestamp: number }
  | { type: 'host_meta'; title: string; source: MediaSourceType; quality: string; hostName: string }
  | { type: 'viewer_info'; name: string }
  | { type: 'talkback_state'; active: boolean }
  | { type: 'kick' }
  | { type: 'end_stream' };
