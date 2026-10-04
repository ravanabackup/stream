import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { MediaConnection, DataConnection } from 'peerjs';
import {
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  Minimize2,
  Camera,
  Disc,
  StopCircle,
  MessageSquare,
  Mic,
  MicOff,
  Activity,
  Sparkles,
  Wifi,
  WifiOff,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  PeerSettings,
  ChatMessage,
  FloatingReaction,
  PeerDataMessage,
  StreamStats,
} from '../types';
import { getHostPeerId, getViewerPeerId } from '../utils/webrtcConfig';
import { soundFX } from '../utils/soundEffects';
import { StreamRecorder, RecorderState } from '../utils/recorder';
import { ChatPanel } from './ChatPanel';

interface ViewerViewProps {
  roomId: string;
  peerSettings: PeerSettings;
  onLeave: () => void;
}

export const ViewerView: React.FC<ViewerViewProps> = ({
  roomId,
  peerSettings,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'connected' | 'waiting' | 'failed' | 'disconnected'
  >('connecting');
  const [statusMessage, setStatusMessage] = useState('Connecting to broadcaster...');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [needsAudioUnlock, setNeedsAudioUnlock] = useState(false);
  const [volume, setVolume] = useState(1);
  const [volumeBoost, setVolumeBoost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<StreamStats>({
    fps: 0,
    resolution: 'Detecting...',
    rtt: 0,
    bitrate: '0 kbps',
    packetLoss: 0,
    timestamp: Date.now(),
  });

  // Talkback state
  const [talkbackAllowed, setTalkbackAllowed] = useState(true);
  const [isTalkingBack, setIsTalkingBack] = useState(false);
  const talkbackStreamRef = useRef<MediaStream | null>(null);

  // Chat & Reactions
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);

  // Snapshot toast
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  // Recorder
  const [recorderState, setRecorderState] = useState<RecorderState>({
    isRecording: false,
    durationSec: 0,
  });

  // Host metadata
  const [hostMeta, setHostMeta] = useState<{ title?: string; source?: string; quality?: string }>({});

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const dataConnRef = useRef<DataConnection | null>(null);
  const mediaConnRef = useRef<MediaConnection | null>(null);
  const recorderRef = useRef<StreamRecorder | null>(null);
  const audioGainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Keep screen awake using Screen Wake Lock API (crucial for mobile phones watching streams)
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {
        // WakeLock unsupported or denied
      }
    };
    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(console.warn);
      }
    };
  }, []);

  // Web Audio volume boost node
  const setupAudioGain = useCallback((mediaStream: MediaStream) => {
    try {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.warn);
      }
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(mediaStream);
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(volumeBoost ? 2.0 : volume, ctx.currentTime);
      audioGainNodeRef.current = gainNode;

      source.connect(gainNode);
      gainNode.connect(ctx.destination);
    } catch (e) {
      console.warn('Audio gain setup error:', e);
    }
  }, [volume, volumeBoost]);

  // Adjust volume / boost
  useEffect(() => {
    if (audioGainNodeRef.current && audioContextRef.current) {
      const targetGain = isMuted ? 0 : volumeBoost ? volume * 2.0 : volume;
      audioGainNodeRef.current.gain.setValueAtTime(
        targetGain,
        audioContextRef.current.currentTime
      );
    }
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, volumeBoost, isMuted]);

  // Establish WebRTC Connection to Host
  const connectToHost = useCallback(() => {
    setConnectionStatus('connecting');
    setStatusMessage('Connecting to PeerJS signaling...');

    const viewerPeerId = getViewerPeerId(roomId);
    const hostPeerId = getHostPeerId(roomId);

    const peerOptions: ConstructorParameters<typeof Peer>[1] = {
      debug: 1,
      config: {
        iceServers: peerSettings.stunServers.map((url) => ({ urls: url })),
      },
    };

    if (peerSettings.useCustomServer) {
      peerOptions.host = peerSettings.serverHost;
      peerOptions.port = peerSettings.serverPort;
      peerOptions.path = peerSettings.serverPath;
      peerOptions.secure = peerSettings.serverSecure;
    }

    const peer = new Peer(viewerPeerId, peerOptions);
    peerRef.current = peer;

    peer.on('open', () => {
      setStatusMessage('Locating broadcaster PC...');

      // 1. Connect DataChannel to Host
      const conn = peer.connect(hostPeerId, { reliable: true });
      dataConnRef.current = conn;

      conn.on('open', () => {
        setConnectionStatus('waiting');
        setStatusMessage('Connected to PC. Requesting media stream...');

        // Announce viewer info
        const deviceName = /iPhone|iPad|iPod/i.test(navigator.userAgent)
          ? 'iOS Device'
          : /Android/i.test(navigator.userAgent)
          ? 'Android Phone'
          : 'Browser Viewer';

        conn.send({ type: 'viewer_info', name: deviceName });

        // Start ping interval for latency measurement
        const pingInterval = setInterval(() => {
          if (conn.open) {
            conn.send({ type: 'ping', timestamp: Date.now() });
          }
        }, 3000);

        conn.on('close', () => {
          clearInterval(pingInterval);
        });
      });

      conn.on('data', (data: unknown) => {
        const msg = data as PeerDataMessage;
        if (!msg || !msg.type) return;

        if (msg.type === 'chat') {
          setMessages((prev) => [...prev, msg.message]);
          soundFX.playMessagePop();
        } else if (msg.type === 'reaction') {
          const newReaction: FloatingReaction = {
            id: Math.random().toString(),
            emoji: msg.emoji,
            x: 20 + Math.random() * 60,
          };
          setFloatingReactions((prev) => [...prev.slice(-10), newReaction]);
        } else if (msg.type === 'host_meta') {
          setHostMeta({
            title: msg.title,
            source: msg.source,
            quality: msg.quality,
          });
        } else if (msg.type === 'talkback_state') {
          setTalkbackAllowed(msg.active);
        } else if (msg.type === 'ping') {
          conn.send({ type: 'pong', timestamp: Date.now(), clientTimestamp: msg.timestamp });
        } else if (msg.type === 'pong') {
          const rtt = Date.now() - msg.clientTimestamp;
          setStats((prev) => ({ ...prev, rtt }));
        }
      });

      conn.on('close', () => {
        setConnectionStatus('disconnected');
        setStatusMessage('Broadcaster disconnected or ended the stream.');
      });

      conn.on('error', (err) => {
        console.warn('Data channel error:', err);
      });
    });

    // 2. Incoming Media Stream Call from Host
    peer.on('call', (call) => {
      mediaConnRef.current = call;

      // Viewer answers the call
      call.answer();

      call.on('stream', (remoteStream) => {
        setStream(remoteStream);
        setConnectionStatus('connected');
        setStatusMessage('Live Broadcast Active');

        if (videoRef.current) {
          videoRef.current.srcObject = remoteStream;

          // Attempt autoplay
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.log('Autoplay was prevented by browser audio policy:', error);
              // Show tap-to-unmute banner
              setNeedsAudioUnlock(true);
            });
          }
        }

        // Setup audio boost graph
        setupAudioGain(remoteStream);
      });

      call.on('close', () => {
        setConnectionStatus('disconnected');
        setStatusMessage('Broadcast ended.');
      });
    });

    peer.on('error', (err) => {
      console.error('Viewer PeerJS error:', err);
      if (err.type === 'peer-unavailable') {
        setConnectionStatus('failed');
        setStatusMessage('Broadcaster PC not found. Make sure the host has started broadcasting.');
      } else {
        setConnectionStatus('failed');
        setStatusMessage(`Connection issue: ${err.type || 'error'}`);
      }
    });
  }, [roomId, peerSettings, setupAudioGain]);

  // Connect on mount
  useEffect(() => {
    connectToHost();

    recorderRef.current = new StreamRecorder((recState) => {
      setRecorderState(recState);
    });

    return () => {
      if (dataConnRef.current) dataConnRef.current.close();
      if (mediaConnRef.current) mediaConnRef.current.close();
      if (peerRef.current) peerRef.current.destroy();
      if (audioContextRef.current) audioContextRef.current.close().catch(console.warn);
      if (talkbackStreamRef.current) {
        talkbackStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [connectToHost]);

  // Clean floating reactions
  useEffect(() => {
    if (floatingReactions.length > 0) {
      const timer = setTimeout(() => {
        setFloatingReactions((prev) => prev.slice(1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [floatingReactions]);

  // Poll WebRTC Stats for FPS and resolution
  useEffect(() => {
    if (connectionStatus !== 'connected' || !videoRef.current) return;

    const interval = setInterval(() => {
      if (videoRef.current) {
        const v = videoRef.current;
        if (v.videoWidth && v.videoHeight) {
          setStats((prev) => ({
            ...prev,
            resolution: `${v.videoWidth}x${v.videoHeight}`,
          }));
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [connectionStatus]);

  // User unlocks audio policy with user gesture
  const handleUnlockAudio = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(console.warn);
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setNeedsAudioUnlock(false);
  };

  // Push-to-Talk Talkback Microphone
  const startTalkback = async () => {
    if (!talkbackAllowed) return;
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      talkbackStreamRef.current = micStream;
      setIsTalkingBack(true);

      // Send talkback audio to Host via PeerJS call
      if (peerRef.current) {
        const hostPeerId = getHostPeerId(roomId);
        peerRef.current.call(hostPeerId, micStream);
      }
    } catch (err) {
      console.warn('Microphone permission for talkback denied:', err);
    }
  };

  const stopTalkback = () => {
    if (talkbackStreamRef.current) {
      talkbackStreamRef.current.getTracks().forEach((t) => t.stop());
      talkbackStreamRef.current = null;
    }
    setIsTalkingBack(false);
  };

  // Send Chat
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'Viewer (Phone)',
      isHost: false,
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    if (dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send({ type: 'chat', message: newMsg });
    }
  };

  // Send Reaction
  const handleSendReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      x: 30 + Math.random() * 40,
    };
    setFloatingReactions((prev) => [...prev.slice(-10), newReaction]);
    if (dataConnRef.current && dataConnRef.current.open) {
      dataConnRef.current.send({ type: 'reaction', emoji });
    }
  };

  // Take Snapshot
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const v = videoRef.current;
    if (!v.videoWidth || !v.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `streamcast-snapshot-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2500);
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch(console.warn);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.warn);
      setIsFullscreen(false);
    }
  };

  // Toggle Local Recording on Viewer side
  const toggleRecording = () => {
    if (!stream || !recorderRef.current) return;
    if (recorderState.isRecording) {
      recorderRef.current.stop();
    } else {
      recorderRef.current.start(stream);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-62px)] overflow-hidden bg-black text-slate-100 select-none">
      {/* Video Stage */}
      <div className="relative flex-1 flex flex-col justify-between overflow-hidden bg-black">
        {/* Top Floating Controls Bar */}
        <div className="absolute top-0 left-0 right-0 z-30 p-3 sm:p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur-md ${
                connectionStatus === 'connected'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse" />
                  LIVE
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  {connectionStatus.toUpperCase()}
                </>
              )}
            </span>

            {hostMeta.source && (
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-lg bg-black/60 text-slate-300 text-[11px] font-mono border border-white/10 backdrop-blur-md">
                {hostMeta.source.toUpperCase()}
              </span>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Stats Toggle */}
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded-xl backdrop-blur-md border transition ${
                showStats
                  ? 'bg-indigo-600/80 text-white border-indigo-500'
                  : 'bg-black/50 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Stream Telemetry Stats"
            >
              <Activity className="w-4 h-4" />
            </button>

            {/* Fit / Cover mode toggle */}
            <button
              onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
              className="px-2.5 py-1.5 rounded-xl bg-black/50 hover:bg-black/70 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition"
              title="Switch Fit Mode (Letterbox / Fill Screen)"
            >
              {fitMode === 'contain' ? 'Fit Screen' : 'Fill Screen'}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-slate-300 hover:text-white backdrop-blur-md border border-white/10 transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="relative flex-1 flex items-center justify-center w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full ${
              fitMode === 'contain' ? 'object-contain' : 'object-cover'
            }`}
          />

          {/* Audio Autoplay Blocked Banner */}
          {needsAudioUnlock && (
            <div className="absolute inset-x-4 top-20 z-40 mx-auto max-w-md animate-bounce">
              <button
                onClick={handleUnlockAudio}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm shadow-2xl flex items-center justify-center gap-2.5 border border-white/20 cursor-pointer"
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span>Tap to Enable Audio Output</span>
              </button>
            </div>
          )}

          {/* Connection / Waiting Screen */}
          {connectionStatus !== 'connected' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 backdrop-blur-md space-y-4">
              {connectionStatus === 'connecting' || connectionStatus === 'waiting' ? (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Connecting to Feed...</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">{statusMessage}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <WifiOff className="w-8 h-8" />
                  </div>
                  <div className="max-w-xs">
                    <h3 className="text-lg font-bold text-white">Broadcast Not Found</h3>
                    <p className="text-xs text-slate-400 mt-1">{statusMessage}</p>
                  </div>
                  <button
                    onClick={connectToHost}
                    className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Try Reconnecting</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Floating Emoji Reactions Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
            {floatingReactions.map((item) => (
              <div
                key={item.id}
                style={{ left: `${item.x}%`, bottom: '40px' }}
                className="absolute text-5xl animate-float-reaction select-none"
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Telemetry Stats Overlay */}
          {showStats && (
            <div className="absolute top-16 left-4 z-30 p-3.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/10 text-xs font-mono space-y-1.5 text-slate-300">
              <div className="font-bold text-indigo-400 mb-1 border-b border-white/10 pb-1">
                Stream Telemetry
              </div>
              <div>Resolution: <span className="text-white">{stats.resolution}</span></div>
              <div>Latency (RTT): <span className="text-emerald-400 font-bold">{stats.rtt} ms</span></div>
              <div>Status: <span className="text-white">{connectionStatus}</span></div>
              <div>Codec: <span className="text-slate-400">VP8 / Opus WebRTC</span></div>
            </div>
          )}

          {/* Snapshot Confirmation Toast */}
          {snapshotTaken && (
            <div className="absolute top-16 right-4 z-40 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xl animate-fadeIn">
              <Check className="w-3.5 h-3.5" />
              <span>Screenshot Saved!</span>
            </div>
          )}
        </div>

        {/* Bottom Viewer Controls Dock */}
        <div className="relative z-30 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent flex flex-wrap items-center justify-between gap-3">
          {/* Audio Volume Controls */}
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/10">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="text-slate-300 hover:text-white transition"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4 text-slate-300" />
              ) : (
                <Volume2 className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-16 sm:w-24 accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-slate-700"
            />

            {/* 200% Boost Button */}
            <button
              onClick={() => setVolumeBoost(!volumeBoost)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${
                volumeBoost
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Boost volume up to 200% for quiet PC feeds"
            >
              200% Boost
            </button>
          </div>

          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-2xl border border-white/10">
            {['🔥', '❤️', '👏', '🚀'].map((em) => (
              <button
                key={em}
                onClick={() => handleSendReaction(em)}
                className="text-base sm:text-lg hover:scale-125 active:scale-95 transition-transform p-1"
              >
                {em}
              </button>
            ))}
          </div>

          {/* Tools: Talkback, Snapshot, Record, Chat */}
          <div className="flex items-center gap-2">
            {/* Talkback Push-to-Talk (Phone to PC intercom!) */}
            {talkbackAllowed && (
              <button
                onMouseDown={startTalkback}
                onMouseUp={stopTalkback}
                onTouchStart={startTalkback}
                onTouchEnd={stopTalkback}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold select-none transition ${
                  isTalkingBack
                    ? 'bg-rose-600 text-white animate-pulse shadow-lg shadow-rose-600/40'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-white/10'
                }`}
                title="Hold to speak to broadcaster PC"
              >
                {isTalkingBack ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-indigo-400" />}
                <span className="hidden sm:inline">{isTalkingBack ? 'Transmitting...' : 'Push to Talk'}</span>
              </button>
            )}

            {/* Snapshot */}
            <button
              onClick={takeSnapshot}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition"
              title="Capture Screenshot"
            >
              <Camera className="w-4 h-4" />
            </button>

            {/* Viewer Recording */}
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-1 p-2 rounded-xl border transition ${
                recorderState.isRecording
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Record stream locally to file"
            >
              {recorderState.isRecording ? <StopCircle className="w-4 h-4" /> : <Disc className="w-4 h-4 text-rose-400" />}
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2 rounded-xl border transition ${
                isChatOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10'
              }`}
              title="Open Chat"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Drawer */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendReaction={handleSendReaction}
        isHost={false}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};
