import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, ExternalLink, QrCode, Smartphone, Sparkles, Share2 } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  roomId: string;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, url, roomId }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && url) {
      QRCode.toDataURL(url, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      })
        .then((data) => setQrDataUrl(data))
        .catch((err) => console.error('QR code generation failed:', err));
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `StreamCast Broadcast: ${roomId}`,
          text: `Watch my live real-time audio and video broadcast!`,
          url: url,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Scan to Watch on Phone
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                P2P Live
              </span>
            </h3>
            <p className="text-xs text-slate-400">Scan with your phone camera or tablet</p>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl shadow-inner mb-4">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt={`QR Code for ${url}`}
              className="w-64 h-64 rounded-lg object-contain"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center text-slate-400">
              <Sparkles className="w-8 h-8 animate-spin" />
            </div>
          )}
          <div className="mt-2 text-center text-slate-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Room Code</span>
            <div className="font-mono font-bold text-base text-indigo-700">{roomId}</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-2 mb-5 text-xs text-slate-300 bg-slate-800/60 p-3 rounded-lg border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Open camera app on iPhone or Android and point at the QR code</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0 ml-1.5" />
            <span>No app installation required – works instantly in any web browser!</span>
          </div>
        </div>

        {/* Link / Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
            <input
              type="text"
              readOnly
              value={url}
              className="bg-transparent text-xs text-slate-300 w-full outline-none font-mono px-2 select-all"
            />
            <button
              onClick={handleCopy}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy URL
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open New Tab
            </a>
            <button
              onClick={handleShare}
              className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-700 transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Link
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
