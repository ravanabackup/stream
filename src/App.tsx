import { useState, useEffect, useCallback } from 'react';
import {
  parseInitialParams,
  updateUrl,
  getBroadcastUrl,
  DEFAULT_PEER_SETTINGS,
} from './utils/webrtcConfig';
import {
  BroadcastRole,
  MediaSourceType,
  PeerSettings,
  AudioProcessingSettings,
} from './types';
import { Header } from './components/Header';
import { HomeSelector } from './components/HomeSelector';
import { BroadcasterView } from './components/BroadcasterView';
import { ViewerView } from './components/ViewerView';
import { QRCodeModal } from './components/QRCodeModal';
import { GitHubPagesGuideModal } from './components/GitHubPagesGuideModal';
import { SettingsModal } from './components/SettingsModal';

const SETTINGS_STORAGE_KEY = 'streamcast_peer_settings';
const AUDIO_STORAGE_KEY = 'streamcast_audio_settings';

export default function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [role, setRole] = useState<BroadcastRole>('select');
  const [initialSource, setInitialSource] = useState<MediaSourceType>('screen');

  // Modals
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Settings
  const [peerSettings, setPeerSettings] = useState<PeerSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_PEER_SETTINGS;
    } catch {
      return DEFAULT_PEER_SETTINGS;
    }
  });

  const [audioSettings, setAudioSettings] = useState<AudioProcessingSettings>(() => {
    try {
      const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            systemAudio: true,
          };
    } catch {
      return {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        systemAudio: true,
      };
    }
  });

  // On initial mount, parse room & role from URL query/hash (GitHub Pages compatible)
  useEffect(() => {
    const { roomId: parsedRoom, role: parsedRole } = parseInitialParams();
    if (parsedRoom) {
      setRoomId(parsedRoom);
      if (parsedRole === 'host') {
        setRole('host');
      } else {
        setRole('viewer');
      }
    }
  }, []);

  // Save settings when changed
  const handleSavePeerSettings = (settings: PeerSettings) => {
    setPeerSettings(settings);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  };

  const handleSaveAudioSettings = (settings: AudioProcessingSettings) => {
    setAudioSettings(settings);
    try {
      localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  };

  // Start Broadcast (PC Host)
  const handleStartBroadcast = (newRoomId: string, source: MediaSourceType) => {
    setRoomId(newRoomId);
    setInitialSource(source);
    setRole('host');
    updateUrl(newRoomId, 'host');
  };

  // Join Stream (Viewer on Phone/Device)
  const handleJoinStream = (targetRoomId: string) => {
    setRoomId(targetRoomId);
    setRole('viewer');
    updateUrl(targetRoomId, 'viewer');
  };

  // Leave / Reset to Home
  const handleLeave = useCallback(() => {
    setRoomId(null);
    setRole('select');
    updateUrl(null, null);
  }, []);

  const shareUrl = roomId ? getBroadcastUrl(roomId, 'viewer') : window.location.href;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Header
        roomId={roomId}
        role={role}
        viewerCount={0}
        onOpenQR={() => setIsQRModalOpen(true)}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onLeave={handleLeave}
        shareUrl={shareUrl}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col">
        {role === 'select' && (
          <HomeSelector
            onStartBroadcast={handleStartBroadcast}
            onJoinStream={handleJoinStream}
            onOpenGuide={() => setIsGuideModalOpen(true)}
          />
        )}

        {role === 'host' && roomId && (
          <BroadcasterView
            roomId={roomId}
            initialSource={initialSource}
            peerSettings={peerSettings}
            audioSettings={audioSettings}
            onOpenQR={() => setIsQRModalOpen(true)}
            onLeave={handleLeave}
          />
        )}

        {role === 'viewer' && roomId && (
          <ViewerView
            roomId={roomId}
            peerSettings={peerSettings}
            onLeave={handleLeave}
          />
        )}
      </main>

      {/* QR Code Modal */}
      {roomId && (
        <QRCodeModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          url={shareUrl}
          roomId={roomId}
        />
      )}

      {/* GitHub Pages Deployment Guide Modal */}
      <GitHubPagesGuideModal
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        peerSettings={peerSettings}
        audioSettings={audioSettings}
        onSavePeerSettings={handleSavePeerSettings}
        onSaveAudioSettings={handleSaveAudioSettings}
      />
    </div>
  );
}
