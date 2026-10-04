import React, { useState } from 'react';
import {
  Radio,
  Share2,
  Sliders,
  Globe,
  Volume2,
  VolumeX,
  Users,
  Copy,
  Check,
  QrCode,
  LogOut,
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface HeaderProps {
  roomId: string | null;
  role: 'host' | 'viewer' | 'select';
  viewerCount?: number;
  onOpenQR: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
  onLeave: () => void;
  shareUrl: string;
}

export const Header: React.FC<HeaderProps> = ({
  roomId,
  role,
  viewerCount = 0,
  onOpenQR,
  onOpenGuide,
  onOpenSettings,
  onLeave,
  shareUrl,
}) => {
  const [copied, setCopied] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(!soundFX.enabled);

  const toggleSound = () => {
    soundFX.enabled = !soundFX.enabled;
    setSfxMuted(!soundFX.enabled);
  };

  const copyRoomUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-4 py-2.5 sm:px-6">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left: Brand & Status */}
        <div className="flex items-center gap-3">
          <div 
            onClick={onLeave}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
                  StreamCast
                </span>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline-block">
                  P2P
                </span>
              </div>
              <div className="text-[10px] text-slate-400 hidden xs:block">
                Ultra-Low Latency Broadcast
              </div>
            </div>
          </div>

          {/* Role Status Tag */}
          {roomId && role === 'host' && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-live-pulse" />
                BROADCASTING
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-full border border-slate-800">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono font-medium text-slate-200">{viewerCount}</span>
                <span className="text-[10px] text-slate-500">viewers</span>
              </div>
            </div>
          )}

          {roomId && role === 'viewer' && (
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-800">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                RECEIVER MODE
              </span>
            </div>
          )}
        </div>

        {/* Center: Room Code pill with 1-click copy */}
        {roomId && (
          <div className="hidden md:flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-full py-1 pl-3 pr-1.5 shadow-inner">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Room:</span>
            <span className="font-mono text-xs font-bold text-indigo-300">{roomId}</span>
            <button
              onClick={copyRoomUrl}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Copy room URL"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* GitHub Pages Guide Button */}
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition"
            title="How to deploy on GitHub Pages"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">GitHub Pages Guide</span>
          </button>

          {/* QR Code Button */}
          {roomId && (
            <button
              onClick={onOpenQR}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-indigo-500/50 transition text-indigo-300"
              title="View QR Code to scan with phone"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">QR Code</span>
            </button>
          )}

          {/* Copy URL on Mobile */}
          {roomId && (
            <button
              onClick={copyRoomUrl}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition md:hidden"
              title="Share Stream URL"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>
          )}

          {/* Sound FX Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition"
            title={sfxMuted ? 'Sound FX Muted' : 'Sound FX Enabled'}
          >
            {sfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Settings Modal Toggle */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition"
            title="Broadcasting & Network Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Exit / Leave Stream */}
          {roomId && (
            <button
              onClick={onLeave}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
              title="Leave Room"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{role === 'host' ? 'End Cast' : 'Leave'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
