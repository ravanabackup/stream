import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { MediaConnection, DataConnection } from 'peerjs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Layers,
  Camera,
  QrCode,
  Copy,
  Check,
  Disc,
  StopCircle,
  Users,
  MessageSquare,
  Maximize2,
  Volume2,
  ExternalLink,
  PhoneCall,
  LogOut,
} from 'lucide-react';
import {
  MediaSourceType,
  QualityPreset,
  ChatMessage,
  FloatingReaction,
  ViewerInfo,
  PeerSettings,
  AudioProcessingSettings,
  PeerDataMessage,
} from '../types';
import { getHostPeerId, getBroadcastUrl } from '../utils/webrtcConfig';
import { createAudioVisualizer } from '../utils/audioVisualizer';
import { createTestMediaStream, TestStreamController } from '../utils/testMediaStream';
import { StreamRecorder, RecorderState } from '../utils/recorder';
import { soundFX } from '../utils/soundEffects';
import { ChatPanel } from './ChatPanel';

interface BroadcasterViewProps {
  roomId: string;
  initialSource: MediaSourceType;
  peerSettings: PeerSettings;
  audioSettings: AudioProcessingSettings;
  onOpenQR: () => void;
  onLeave: () => void;
}

export const BroadcasterView: React.FC<BroadcasterViewProps> = ({
  roomId,
  initialSource,
  peerSettings,
  audioSettings,
  onOpenQR,
  onLeave,
}) => {
  const [currentSource, setCurrentSource] = useState<MediaSourceType>(initialSource);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('720p');
  const [statusText, setStatusText] = useState('Initializing broadcaster...');
  const [isLive, setIsLive] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState<ViewerInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [recorderState, setRecorderState] = useState<RecorderState>({ isRecording: false, durationSec: 0 });
  const [allowTalkback, setAllowTalkback] = useState(true);
  const [streamUptime, setStreamUptime] = useState(0);

  // Video resolution / stats
  const [videoResolution, setVideoResolution] = useState('Loading...');

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const activeMediaConnections = useRef<Map<string, MediaConnection>>(new Map());
  const activeDataConnections = useRef<Map<string, DataConnection>>(new Map());
  const testStreamCtrlRef = useRef<TestStreamController | null>(null);
  const recorderRef = useRef<StreamRecorder | null>(null);
  const stopVisualizerRef = useRef<(() => void) | null>(null);

  const shareUrl = getBroadcastUrl(roomId, 'viewer');

  // Stream uptime timer
  useEffect(() => {
    let interval: number;
    if (isLive) {
      interval = window.setInterval(() => {
        setStreamUptime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Format seconds to HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Broadcast data message to all connected viewers
  const broadcastData = useCallback((msg: PeerDataMessage) => {
    activeDataConnections.current.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }, []);

  // Update tracks on all active WebRTC sender connections when stream changes
  const replaceTracksOnActiveCalls = useCallback((newStream: MediaStream) => {
    const videoTrack = newStream.getVideoTracks()[0];
    const audioTrack = newStream.getAudioTracks()[0];

    activeMediaConnections.current.forEach((mediaConn) => {
      const pc = mediaConn.peerConnection;
      if (pc) {
        pc.getSenders().forEach((sender) => {
          if (sender.track?.kind === 'video' && videoTrack) {
            sender.replaceTrack(videoTrack).catch(console.warn);
          } else if (sender.track?.kind === 'audio' && audioTrack) {
            sender.replaceTrack(audioTrack).catch(console.warn);
          }
        });
      }
    });
  }, []);

  // Initialize Media Stream based on source type
  const startStream = useCallback(async (sourceType: MediaSourceType) => {
    setStatusText(`Starting ${sourceType} capture...`);

    // Stop existing test controller if any
    if (testStreamCtrlRef.current) {
      testStreamCtrlRef.current.stop();
      testStreamCtrlRef.current = null;
    }

    // Stop existing stream tracks
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }

    try {
      let newStream: MediaStream;

      if (sourceType === 'screen') {
        // Capture screen + optional system audio
        newStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor',
          } as MediaTrackConstraints,
          audio: {
            echoCancellation: audioSettings.echoCancellation,
            noiseSuppression: audioSettings.noiseSuppression,
            autoGainControl: audioSettings.autoGainControl,
          },
        });

        // Listen for user stopping screen share from browser banner
        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.onended = () => {
            // Gracefully switch to test canvas if screen share is stopped
            startStream('canvas');
          };
        }

        // If screen share doesn't contain audio, try to capture microphone as well
        if (newStream.getAudioTracks().length === 0) {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: audioSettings.echoCancellation,
                noiseSuppression: audioSettings.noiseSuppression,
                autoGainControl: audioSettings.autoGainControl,
              },
            });
            micStream.getAudioTracks().forEach((track) => {
              newStream.addTrack(track);
            });
          } catch {
            console.log('Mic not added or permission declined');
          }
        }
      } else if (sourceType === 'webcam') {
        const videoConstraints: MediaTrackConstraints =
          qualityPreset === '1080p'
            ? { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } }
            : qualityPreset === '480p'
            ? { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } };

        newStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: {
            echoCancellation: audioSettings.echoCancellation,
            noiseSuppression: audioSettings.noiseSuppression,
            autoGainControl: audioSettings.autoGainControl,
          },
        });
      } else {
        // Canvas Test Generator
        const ctrl = createTestMediaStream(1280, 720, 30);
        testStreamCtrlRef.current = ctrl;
        newStream = ctrl.stream;
      }

      setStream(newStream);
      setCurrentSource(sourceType);

      // Attach to preview video element
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }

      // Update resolution string once video track is ready
      const vTrack = newStream.getVideoTracks()[0];
      if (vTrack) {
        const settings = vTrack.getSettings();
        if (settings.width && settings.height) {
          setVideoResolution(`${settings.width}x${settings.height}`);
        }
      }

      // Web Audio Visualizer setup
      if (stopVisualizerRef.current) {
        stopVisualizerRef.current();
        stopVisualizerRef.current = null;
      }
      const vis = createAudioVisualizer(newStream);
      if (vis && visualizerCanvasRef.current) {
        stopVisualizerRef.current = vis.renderToCanvas(visualizerCanvasRef.current, '#38bdf8');
      }

      // If calls are already active, replace their tracks!
      replaceTracksOnActiveCalls(newStream);

      // Notify viewers of source switch
      broadcastData({
        type: 'host_meta',
        title: `Room: ${roomId}`,
        source: sourceType,
        quality: qualityPreset,
        hostName: 'Broadcaster PC',
      });

      setStatusText('Broadcasting live feed');
      setIsLive(true);
    } catch (err: unknown) {
      console.error('Media capture error:', err);
      // If user denied camera/screen permission or device lacks camera, fallback to test pattern
      if (sourceType !== 'canvas') {
        setStatusText('Permission declined or camera unavailable. Switched to Test Pattern.');
        startStream('canvas');
      } else {
        setStatusText('Failed to start media feed.');
      }
    }
  }, [audioSettings, qualityPreset, replaceTracksOnActiveCalls, broadcastData, roomId, stream]);

  // Initialize PeerJS Host Connection
  useEffect(() => {
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

    const peer = new Peer(hostPeerId, peerOptions);
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log('Broadcaster PeerJS connected with ID:', id);
      setStatusText('Ready for viewer connections');
      soundFX.playLiveStart();
    });

    // When a viewer connects via DataChannel
    peer.on('connection', (conn) => {
      const viewerId = conn.peer;
      activeDataConnections.current.set(viewerId, conn);

      conn.on('open', () => {
        const newViewer: ViewerInfo = {
          id: viewerId,
          name: `Viewer ${activeDataConnections.current.size}`,
          connectedAt: Date.now(),
        };

        setViewers((prev) => [...prev.filter((v) => v.id !== viewerId), newViewer]);
        soundFX.playJoinChime();

        // Send host metadata
        conn.send({
          type: 'host_meta',
          title: `Stream ${roomId}`,
          source: currentSource,
          quality: qualityPreset,
          hostName: 'PC Host',
        });

        // Now initiate the media call to this viewer!
        // We use the currently active stream
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          const activeStream = localVideoRef.current.srcObject as MediaStream;
          const call = peer.call(viewerId, activeStream);
          activeMediaConnections.current.set(viewerId, call);

          // Listen for talkback stream from viewer if they transmit audio back!
          call.on('stream', (viewerStream) => {
            const talkbackAudio = new Audio();
            talkbackAudio.srcObject = viewerStream;
            talkbackAudio.play().catch(console.warn);
          });

          call.on('close', () => {
            activeMediaConnections.current.delete(viewerId);
          });
        }
      });

      // Handle viewer messages
      conn.on('data', (data: unknown) => {
        const msg = data as PeerDataMessage;
        if (!msg || !msg.type) return;

        if (msg.type === 'chat') {
          setMessages((prev) => [...prev, msg.message]);
          soundFX.playMessagePop();
          // Broadcast to all other viewers too!
          broadcastData(msg);
        } else if (msg.type === 'reaction') {
          const newReaction: FloatingReaction = {
            id: Math.random().toString(),
            emoji: msg.emoji,
            x: 20 + Math.random() * 60,
          };
          setFloatingReactions((prev) => [...prev.slice(-10), newReaction]);
          // Broadcast reaction to all other viewers
          broadcastData(msg);
        } else if (msg.type === 'viewer_info') {
          setViewers((prev) =>
            prev.map((v) => (v.id === viewerId ? { ...v, name: msg.name } : v))
          );
        }
      });

      conn.on('close', () => {
        activeDataConnections.current.delete(viewerId);
        activeMediaConnections.current.delete(viewerId);
        setViewers((prev) => prev.filter((v) => v.id !== viewerId));
        soundFX.playLeaveChime();
      });

      conn.on('error', (err) => {
        console.warn('Viewer connection error:', err);
      });
    });

    // Also handle direct incoming media calls (if a viewer initiates call)
    peer.on('call', (call) => {
      const viewerId = call.peer;
      activeMediaConnections.current.set(viewerId, call);

      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const activeStream = localVideoRef.current.srcObject as MediaStream;
        call.answer(activeStream);
      }

      call.on('stream', (viewerStream) => {
        const talkbackAudio = new Audio();
        talkbackAudio.srcObject = viewerStream;
        talkbackAudio.play().catch(console.warn);
      });

      call.on('close', () => {
        activeMediaConnections.current.delete(viewerId);
      });
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      if (err.type === 'unavailable-id') {
        setStatusText('Room ID already in use as host. Please choose another room name.');
      } else {
        setStatusText(`Connection issue: ${err.type || 'network'}`);
      }
    });

    // Kick off initial stream
    startStream(initialSource);

    // Init recorder
    recorderRef.current = new StreamRecorder((state) => {
      setRecorderState(state);
    });

    return () => {
      if (stopVisualizerRef.current) stopVisualizerRef.current();
      if (testStreamCtrlRef.current) testStreamCtrlRef.current.stop();
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      activeMediaConnections.current.forEach((call) => call.close());
      activeDataConnections.current.forEach((conn) => conn.close());
      peer.destroy();
    };
  }, [roomId, peerSettings, initialSource, broadcastData]);

  // Clean up floating reactions after animation ends
  useEffect(() => {
    if (floatingReactions.length > 0) {
      const timer = setTimeout(() => {
        setFloatingReactions((prev) => prev.slice(1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [floatingReactions]);

  // Toggle Microphone
  const toggleAudio = () => {
    if (!stream) return;
    const audioTracks = stream.getAudioTracks();
    const nextState = !isAudioMuted;
    audioTracks.forEach((track) => {
      track.enabled = !nextState;
    });
    if (testStreamCtrlRef.current) {
      testStreamCtrlRef.current.setAudioBeep(!nextState);
    }
    setIsAudioMuted(nextState);
  };

  // Toggle Video
  const toggleVideo = () => {
    if (!stream) return;
    const videoTracks = stream.getVideoTracks();
    const nextState = !isVideoPaused;
    videoTracks.forEach((track) => {
      track.enabled = !nextState;
    });
    setIsVideoPaused(nextState);
  };

  // Toggle Local Recording
  const toggleRecording = () => {
    if (!stream || !recorderRef.current) return;
    if (recorderState.isRecording) {
      recorderRef.current.stop();
    } else {
      recorderRef.current.start(stream);
    }
  };

  // Send Chat Message from Host
  const handleSendMessage = (text: string) => {
    const newMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'Host (PC)',
      isHost: true,
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, newMsg]);
    broadcastData({ type: 'chat', message: newMsg });
  };

  // Send Reaction from Host
  const handleSendReaction = (emoji: string) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      x: 30 + Math.random() * 40,
    };
    setFloatingReactions((prev) => [...prev.slice(-10), newReaction]);
    broadcastData({ type: 'reaction', emoji });
  };

  // Copy share URL
  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // Fullscreen video toggle
  const toggleFullscreen = () => {
    if (localVideoRef.current) {
      if (!document.fullscreenElement) {
        localVideoRef.current.requestFullscreen().catch(console.warn);
      } else {
        document.exitFullscreen().catch(console.warn);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-62px)] overflow-hidden bg-slate-950 text-slate-100">
      {/* Main Broadcast Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Top Broadcast Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 backdrop-blur-md">
          {/* Status & Timing */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold text-xs tracking-wider">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-live-pulse" />
              LIVE BROADCAST
            </div>
            <div className="text-xs font-mono text-slate-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              ⏱ {formatTime(streamUptime)}
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">{statusText}</span>
          </div>

          {/* Connected Viewers Pill */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-950/40 border border-indigo-800/40 text-indigo-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>{viewers.length} {viewers.length === 1 ? 'Viewer' : 'Viewers'} Connected</span>
            </div>

            {/* Talkback Mode Badge */}
            <button
              onClick={() => {
                const next = !allowTalkback;
                setAllowTalkback(next);
                broadcastData({ type: 'talkback_state', active: next });
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border transition ${
                allowTalkback
                  ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title="Allow viewers to use push-to-talk to speak to your PC"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Viewer Talkback: {allowTalkback ? 'ON' : 'OFF'}</span>
            </button>

            {/* End Stream Button */}
            <button
              onClick={onLeave}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition cursor-pointer"
              title="Stop broadcasting and leave"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">End Broadcast</span>
            </button>
          </div>
        </div>

        {/* Video Preview with Live Overlay & Reactions */}
        <div className="relative flex-1 min-h-[320px] bg-black rounded-3xl overflow-hidden border border-slate-800/80 shadow-2xl flex items-center justify-center group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // Muted locally on PC to prevent microphone acoustic feedback loop
            className={`w-full h-full object-contain ${isVideoPaused ? 'opacity-20 filter blur-sm' : ''}`}
          />

          {/* Paused state overlay */}
          {isVideoPaused && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-sm select-none">
              <VideoOff className="w-12 h-12 text-slate-500" />
              <div className="text-base font-bold text-slate-300">Video Feed Paused</div>
              <p className="text-xs text-slate-500">Viewers see a placeholder until resumed</p>
            </div>
          )}

          {/* Floating Emoji Reactions Overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {floatingReactions.map((item) => (
              <div
                key={item.id}
                style={{ left: `${item.x}%`, bottom: '20px' }}
                className="absolute text-4xl animate-float-reaction select-none"
              >
                {item.emoji}
              </div>
            ))}
          </div>

          {/* Live Video Overlays */}
          <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-none">
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-mono font-medium text-slate-200 border border-white/10">
              {currentSource === 'screen' ? '🖥 Screen Capture' : currentSource === 'webcam' ? '📷 Webcam' : '🎨 Test Pattern'}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[11px] font-mono text-slate-300 border border-white/10">
              {videoResolution}
            </span>
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition"
              title="Fullscreen Preview"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Bottom Audio Visualizer Bar overlay on Video */}
          <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/10">
              <Volume2 className={`w-3.5 h-3.5 ${isAudioMuted ? 'text-rose-400' : 'text-emerald-400'}`} />
              <canvas
                ref={visualizerCanvasRef}
                width={120}
                height={20}
                className="w-24 h-4 rounded"
              />
              <span className="text-[10px] font-mono text-slate-400">
                {isAudioMuted ? 'MUTED' : 'AUDIO ACTIVE'}
              </span>
            </div>

            {recorderState.isRecording && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-rose-600/90 text-white text-xs font-bold shadow-lg animate-pulse">
                <Disc className="w-4 h-4 animate-spin" />
                <span>REC {formatTime(recorderState.durationSec)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stream Source Selector & Quick Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Source Switching Buttons */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
            <button
              onClick={() => startStream('screen')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                currentSource === 'screen'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Share Screen</span>
            </button>

            <button
              onClick={() => startStream('webcam')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                currentSource === 'webcam'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Webcam</span>
            </button>

            <button
              onClick={() => startStream('canvas')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                currentSource === 'canvas'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Test Bar</span>
            </button>
          </div>

          {/* 2. Media Mute & Pause Toggles */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-center gap-2">
            <button
              onClick={toggleAudio}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                isAudioMuted
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {isAudioMuted ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-emerald-400" />}
              <span>{isAudioMuted ? 'Mic Muted' : 'Mic Live'}</span>
            </button>

            <button
              onClick={toggleVideo}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                isVideoPaused
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-slate-950 text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {isVideoPaused ? <VideoOff className="w-4 h-4 text-amber-400" /> : <Video className="w-4 h-4 text-sky-400" />}
              <span>{isVideoPaused ? 'Video Off' : 'Video Live'}</span>
            </button>

            {/* Local Recording Button */}
            <button
              onClick={toggleRecording}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                recorderState.isRecording
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
              title={recorderState.isRecording ? 'Stop Recording' : 'Record Broadcast to File'}
            >
              {recorderState.isRecording ? <StopCircle className="w-4 h-4" /> : <Disc className="w-4 h-4 text-rose-400" />}
              <span className="hidden sm:inline">{recorderState.isRecording ? 'Stop' : 'Record'}</span>
            </button>
          </div>

          {/* 3. Stream Quality & Chat Toggle */}
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs flex-1">
              {(['1080p', '720p', '480p'] as QualityPreset[]).map((res) => (
                <button
                  key={res}
                  onClick={() => {
                    setQualityPreset(res);
                    startStream(currentSource);
                  }}
                  className={`flex-1 py-1 rounded-lg font-medium text-[11px] transition ${
                    qualityPreset === res
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {res}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className={`p-2.5 rounded-xl border transition ${
                isChatOpen
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
              }`}
              title="Toggle Live Chat & Viewers"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Direct Link Share Banner with Phone QR Code Hint */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-4 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                Broadcast URL & Phone Pairing
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  Ready
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Share this link or open the QR code to connect any phone or tablet instantly.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onOpenQR}
              className="py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Show QR Code</span>
            </button>

            <button
              onClick={copyShareUrl}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied Link!' : 'Copy Link'}</span>
            </button>

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition"
              title="Test Viewer in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Right Drawer: Live Chat & Viewer List */}
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendReaction={handleSendReaction}
        isHost={true}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />
    </div>
  );
};
