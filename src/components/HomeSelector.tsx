import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  Video,
  Radio,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Camera,
  Layers,
  Mic,
  QrCode,
  Volume2,
} from 'lucide-react';
import { generateRoomId, sanitizeRoomId } from '../utils/webrtcConfig';
import { MediaSourceType } from '../types';

interface HomeSelectorProps {
  onStartBroadcast: (roomId: string, source: MediaSourceType) => void;
  onJoinStream: (roomId: string) => void;
  onOpenGuide: () => void;
}

export const HomeSelector: React.FC<HomeSelectorProps> = ({
  onStartBroadcast,
  onJoinStream,
  onOpenGuide,
}) => {
  const [broadcastRoomId, setBroadcastRoomId] = useState(generateRoomId());
  const [selectedSource, setSelectedSource] = useState<MediaSourceType>('screen');
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeRoomId(broadcastRoomId) || generateRoomId();
    onStartBroadcast(clean, selectedSource);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = joinRoomInput.trim();
    if (!input) {
      setJoinError('Please enter a room code or stream URL');
      return;
    }

    // If user pasted a full URL, parse room parameter
    let extracted = input;
    if (input.includes('room=')) {
      try {
        const url = new URL(input.startsWith('http') ? input : 'https://' + input);
        extracted = url.searchParams.get('room') || input;
      } catch {
        // use regex fallback
        const match = input.match(/room=([a-zA-Z0-9_-]+)/);
        if (match) extracted = match[1];
      }
    }

    const clean = sanitizeRoomId(extracted);
    if (!clean) {
      setJoinError('Invalid room code format');
      return;
    }

    onJoinStream(clean);
  };

  const regenerateCode = () => {
    setBroadcastRoomId(generateRoomId());
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-between py-10 px-4 sm:px-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Real-Time P2P WebRTC Broadcasting</span>
          <span className="w-1 h-1 rounded-full bg-indigo-400" />
          <span className="text-slate-300">GitHub Pages Compatible</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
          Broadcast PC Audio & Video <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-sky-300 to-teal-300 bg-clip-text text-transparent">
            to Any Device in Real Time
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
          Stream your PC screen, camera, microphone, or system sound instantly to your phone, tablet, or another browser with ultra-low latency. Open the URL or scan the QR code to watch!
        </p>
      </div>

      {/* Two Core Role Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-14">
        {/* Card 1: Broadcast from PC (Host) */}
        <div className="relative rounded-3xl bg-slate-900/80 border border-indigo-500/30 p-6 sm:p-8 flex flex-col justify-between shadow-2xl shadow-indigo-950/40 backdrop-blur-md group hover:border-indigo-500/50 transition">
          <div className="absolute -top-3 right-8 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-[11px] font-bold text-white shadow-md uppercase tracking-wider">
            Host / PC Mode
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Broadcast from this PC</h2>
                <p className="text-xs text-slate-400">Share your screen or camera with live audio</p>
              </div>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4 my-6">
              {/* Media Source Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Video & Audio Feed:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSource('screen')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                      selectedSource === 'screen'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Layers className="w-5 h-5 mb-1.5" />
                    <span>Screen Share</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">+ System Audio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSource('webcam')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                      selectedSource === 'webcam'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-5 h-5 mb-1.5" />
                    <span>Webcam</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">+ Microphone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSource('canvas')}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-medium transition ${
                      selectedSource === 'canvas'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Video className="w-5 h-5 mb-1.5" />
                    <span>Test Pattern</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Test Generator</span>
                  </button>
                </div>
              </div>

              {/* Room Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">Room Code Name:</label>
                  <button
                    type="button"
                    onClick={regenerateCode}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Randomize
                  </button>
                </div>
                <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5">
                  <span className="text-xs text-slate-500 select-none mr-1">cast/</span>
                  <input
                    type="text"
                    value={broadcastRoomId}
                    onChange={(e) => setBroadcastRoomId(e.target.value)}
                    className="bg-transparent text-sm font-mono font-semibold text-white w-full outline-none"
                    placeholder="my-room-code"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-transform active:scale-[0.99] cursor-pointer"
              >
                <Radio className="w-4 h-4 animate-pulse" />
                <span>Start Broadcasting Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              Generates phone QR Code on screen
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct P2P Stream
            </span>
          </div>
        </div>

        {/* Card 2: Join as Receiver / Viewer */}
        <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 flex flex-col justify-between shadow-2xl backdrop-blur-md group hover:border-slate-700 transition">
          <div className="absolute -top-3 right-8 px-3 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-bold text-slate-300 shadow-md uppercase tracking-wider">
            Receiver / Viewer Mode
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Watch on Another Device</h2>
                <p className="text-xs text-slate-400">Connect to an active PC broadcast via URL or code</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 my-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Fastest Method: Phone Camera Scan</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the broadcaster PC is in front of you, simply point your phone or tablet camera at the QR code displayed on the broadcaster screen. It will open and connect automatically!
              </p>
            </div>

            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Or Enter Room Code / Paste Stream URL:
                </label>
                <input
                  type="text"
                  value={joinRoomInput}
                  onChange={(e) => {
                    setJoinRoomInput(e.target.value);
                    if (joinError) setJoinError('');
                  }}
                  placeholder="e.g. quick-stream-42 or paste full URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
                {joinError && <p className="text-rose-400 text-xs mt-1.5">{joinError}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 transition cursor-pointer"
              >
                <Video className="w-4 h-4 text-emerald-400" />
                <span>Connect & Watch Stream</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-slate-400" />
              Real-time Audio & Video playback
            </span>
            <span className="text-slate-500">Zero App Install</span>
          </div>
        </div>
      </div>

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800/80">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <Zap className="w-5 h-5 text-amber-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Sub-Second Latency</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Real-time WebRTC audio & video with ~100ms delay.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <Globe className="w-5 h-5 text-emerald-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">GitHub Pages Ready</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">100% static hosting compatible. No server to maintain.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <Mic className="w-5 h-5 text-indigo-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Screen & System Audio</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Stream desktop audio or microphone with noise cancellation.</p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
          <Radio className="w-5 h-5 text-sky-400 mb-2" />
          <h4 className="text-xs font-bold text-slate-200">Two-Way Intercom</h4>
          <p className="text-[11px] text-slate-400 mt-0.5">Viewers can talk back to the PC via push-to-talk.</p>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
        <div>StreamCast &bull; Serverless Real-Time Media Broadcasting for Web</div>
        <button
          onClick={onOpenGuide}
          className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4 cursor-pointer"
        >
          Learn how to deploy to your own GitHub Pages &rarr;
        </button>
      </div>
    </div>
  );
};
