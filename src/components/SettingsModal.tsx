import React, { useState } from 'react';
import { X, Sliders, Shield, Radio, Volume2, Save, RotateCcw } from 'lucide-react';
import { PeerSettings, AudioProcessingSettings } from '../types';
import { DEFAULT_PEER_SETTINGS } from '../utils/webrtcConfig';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  peerSettings: PeerSettings;
  audioSettings: AudioProcessingSettings;
  onSavePeerSettings: (settings: PeerSettings) => void;
  onSaveAudioSettings: (settings: AudioProcessingSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  peerSettings,
  audioSettings,
  onSavePeerSettings,
  onSaveAudioSettings,
}) => {
  const [localPeer, setLocalPeer] = useState<PeerSettings>({ ...peerSettings });
  const [localAudio, setLocalAudio] = useState<AudioProcessingSettings>({ ...audioSettings });
  const [activeTab, setActiveTab] = useState<'network' | 'audio'>('network');

  if (!isOpen) return null;

  const handleSave = () => {
    onSavePeerSettings(localPeer);
    onSaveAudioSettings(localAudio);
    onClose();
  };

  const handleReset = () => {
    setLocalPeer({ ...DEFAULT_PEER_SETTINGS });
    setLocalAudio({
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      systemAudio: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-700/80 p-6 shadow-2xl text-slate-100 my-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sliders className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Broadcast & Network Settings</h3>
            <p className="text-xs text-slate-400">Configure WebRTC signaling, STUN/TURN, and audio processing</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 mb-5">
          <button
            onClick={() => setActiveTab('network')}
            className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'network'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            Signaling & ICE (STUN/TURN)
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`pb-2.5 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'audio'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            Audio Enhancements
          </button>
        </div>

        {/* Tab 1: Network & STUN/TURN */}
        {activeTab === 'network' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/30 text-indigo-200">
              By default, public PeerJS cloud server and Google STUN are used. No configuration is required for GitHub Pages!
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300">
                <input
                  type="checkbox"
                  checked={localPeer.useCustomServer}
                  onChange={(e) => setLocalPeer({ ...localPeer, useCustomServer: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                Use Custom PeerJS Signaling Server
              </label>

              {localPeer.useCustomServer && (
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                  <div>
                    <label className="block text-slate-400 mb-1">Host</label>
                    <input
                      type="text"
                      value={localPeer.serverHost}
                      onChange={(e) => setLocalPeer({ ...localPeer, serverHost: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white font-mono"
                      placeholder="e.g. peerjs.example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Port</label>
                    <input
                      type="number"
                      value={localPeer.serverPort}
                      onChange={(e) => setLocalPeer({ ...localPeer, serverPort: Number(e.target.value) })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white font-mono"
                      placeholder="443"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Path</label>
                    <input
                      type="text"
                      value={localPeer.serverPath}
                      onChange={(e) => setLocalPeer({ ...localPeer, serverPath: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-white font-mono"
                      placeholder="/"
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={localPeer.serverSecure}
                        onChange={(e) => setLocalPeer({ ...localPeer, serverSecure: e.target.checked })}
                        className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                      />
                      Secure (WSS/HTTPS)
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* STUN / TURN servers */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                STUN / ICE Servers (1 per line)
              </label>
              <textarea
                rows={3}
                value={localPeer.stunServers.join('\n')}
                onChange={(e) =>
                  setLocalPeer({
                    ...localPeer,
                    stunServers: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                  })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                placeholder="stun:stun.l.google.com:19302"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Audio Enhancements */}
        {activeTab === 'audio' && (
          <div className="space-y-4 text-xs">
            <p className="text-slate-400 leading-relaxed">
              Enable hardware-accelerated Web Audio filters to eliminate background noise, acoustic feedback, and normalize voice volume:
            </p>

            <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localAudio.echoCancellation}
                  onChange={(e) => setLocalAudio({ ...localAudio, echoCancellation: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-200">Acoustic Echo Cancellation (AEC)</div>
                  <div className="text-slate-400">Prevents microphone from picking up PC speaker output</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  checked={localAudio.noiseSuppression}
                  onChange={(e) => setLocalAudio({ ...localAudio, noiseSuppression: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-200">Noise Suppression (NS)</div>
                  <div className="text-slate-400">Filters PC fan hum, keyboard clicks, and room noise</div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer pt-2 border-t border-slate-800/80">
                <input
                  type="checkbox"
                  checked={localAudio.autoGainControl}
                  onChange={(e) => setLocalAudio({ ...localAudio, autoGainControl: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 mt-0.5"
                />
                <div>
                  <div className="font-semibold text-slate-200">Automatic Gain Control (AGC)</div>
                  <div className="text-slate-400">Keeps voice volume steady whether you whisper or speak loudly</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition"
            >
              <Save className="w-3.5 h-3.5" />
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
