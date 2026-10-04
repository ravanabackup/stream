// Web Audio API Analyser for real-time audio volume and frequency visualization

export interface AudioVisualizerController {
  getLevel: () => number; // 0 to 1
  stop: () => void;
  renderToCanvas: (canvas: HTMLCanvasElement, barColor?: string) => () => void;
}

export function createAudioVisualizer(stream: MediaStream): AudioVisualizerController | null {
  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) return null;

  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();

    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const getLevel = (): number => {
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      return Math.min(1, avg / 128); // 0 to 1 normalized
    };

    const renderToCanvas = (canvas: HTMLCanvasElement, barColor = '#38bdf8') => {
      const cCtx = canvas.getContext('2d');
      if (!cCtx) return () => {};

      let animId: number;

      const draw = () => {
        animId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);

        cCtx.clearRect(0, 0, canvas.width, canvas.height);

        const bufferLength = analyser.frequencyBinCount;
        const barWidth = (canvas.width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;

          // Gradient color from cyan to indigo
          const grad = cCtx.createLinearGradient(0, canvas.height, 0, 0);
          grad.addColorStop(0, barColor);
          grad.addColorStop(1, '#a855f7');

          cCtx.fillStyle = grad;
          cCtx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
          if (x >= canvas.width) break;
        }
      };

      draw();

      return () => {
        cancelAnimationFrame(animId);
      };
    };

    const stop = () => {
      try {
        source.disconnect();
        ctx.close();
      } catch {
        // ignore
      }
    };

    return { getLevel, stop, renderToCanvas };
  } catch (err) {
    console.warn('Audio visualizer init error:', err);
    return null;
  }
}
