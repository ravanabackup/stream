// MediaRecorder wrapper for capturing live WebRTC audio/video feeds

export interface RecorderState {
  isRecording: boolean;
  durationSec: number;
}

export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private startTime: number = 0;
  private timerId: number | null = null;
  private onStateChange?: (state: RecorderState) => void;

  constructor(onStateChange?: (state: RecorderState) => void) {
    this.onStateChange = onStateChange;
  }

  public start(stream: MediaStream): boolean {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return false;
    }

    try {
      this.recordedChunks = [];
      
      // Determine supported mime type
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const options: MediaRecorderOptions = selectedMime ? { mimeType: selectedMime } : {};
      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishRecording();
      };

      this.mediaRecorder.start(1000); // 1-second chunks
      this.startTime = Date.now();

      this.timerId = window.setInterval(() => {
        if (this.onStateChange) {
          this.onStateChange({
            isRecording: true,
            durationSec: Math.floor((Date.now() - this.startTime) / 1000),
          });
        }
      }, 1000);

      if (this.onStateChange) {
        this.onStateChange({ isRecording: true, durationSec: 0 });
      }

      return true;
    } catch (err) {
      console.error('Failed to start recording:', err);
      return false;
    }
  }

  public stop() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (this.onStateChange) {
      this.onStateChange({ isRecording: false, durationSec: 0 });
    }
  }

  private finishRecording() {
    if (this.recordedChunks.length === 0) return;

    const mime = this.mediaRecorder?.mimeType || 'video/webm';
    const blob = new Blob(this.recordedChunks, { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const extension = mime.includes('mp4') ? 'mp4' : 'webm';
    a.download = `streamcast-recording-${dateStr}.${extension}`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
