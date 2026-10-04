// Canvas & Web Audio synthesized stream generator for testing without physical camera/mic

export interface TestStreamController {
  stream: MediaStream;
  stop: () => void;
  setAudioBeep: (enabled: boolean) => void;
}

export function createTestMediaStream(width = 1280, height = 720, fps = 30): TestStreamController {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  let animationFrameId: number;
  let ballX = 100;
  let ballY = 100;
  let ballVx = 7;
  let ballVy = 5;
  const ballRadius = 32;

  // Audio setup
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtx();
  const dest = audioCtx.createMediaStreamDestination();

  // Create subtle periodic ping oscillator
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  osc.connect(gainNode);
  gainNode.connect(dest);
  osc.start();

  let beepActive = true;
  let lastBeep = 0;

  function render(time: number) {
    // 1. SMPTE-style broadcast test pattern background
    const barWidth = width / 7;
    const colors = [
      '#c0c0c0', // 75% White
      '#c0c000', // Yellow
      '#00c0c0', // Cyan
      '#00c000', // Green
      '#c000c0', // Magenta
      '#c00000', // Red
      '#0000c0', // Blue
    ];

    colors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i * barWidth, 0, barWidth, height * 0.65);
    });

    // Middle bars
    const subColors = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    subColors.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(i * barWidth, height * 0.65, barWidth, height * 0.1);
    });

    // Lower area
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, height * 0.75, width, height * 0.25);

    // 2. Animated Bouncing Ball
    ballX += ballVx;
    ballY += ballVy;
    if (ballX - ballRadius < 0 || ballX + ballRadius > width) ballVx = -ballVx;
    if (ballY - ballRadius < 0 || ballY + ballRadius > height * 0.75) ballVy = -ballVy;

    const ballGrad = ctx.createRadialGradient(ballX - 10, ballY - 10, 4, ballX, ballY, ballRadius);
    ballGrad.addColorStop(0, '#ffffff');
    ballGrad.addColorStop(0.3, '#38bdf8');
    ballGrad.addColorStop(1, '#0284c7');

    ctx.save();
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = ballGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();

    // 3. Central Banner with Live Clock
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(width * 0.15, height * 0.35, width * 0.7, height * 0.28);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(width * 0.15, height * 0.35, width * 0.7, height * 0.28);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LIVE TEST BROADCAST', width * 0.5, height * 0.43);

    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    const now = new Date();
    const timeStr = now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0');
    ctx.fillText(`UTC: ${timeStr}  |  FPS: ${fps}  |  RES: ${width}x${height}`, width * 0.5, height * 0.51);

    // Audio beep indicator
    ctx.fillStyle = beepActive ? '#22c55e' : '#64748b';
    ctx.beginPath();
    ctx.arc(width * 0.5 - 130, height * 0.58, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(beepActive ? '1Hz Test Tone Active' : 'Audio Muted', width * 0.5 - 110, height * 0.59);

    // 4. Subtle beep every 1000ms
    if (beepActive && time - lastBeep > 1000) {
      lastBeep = time;
      const audioNow = audioCtx.currentTime;
      gainNode.gain.cancelScheduledValues(audioNow);
      gainNode.gain.setValueAtTime(0.001, audioNow);
      gainNode.gain.exponentialRampToValueAtTime(0.12, audioNow + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioNow + 0.12);
    }

    animationFrameId = requestAnimationFrame(render);
  }

  animationFrameId = requestAnimationFrame(render);

  const videoTrack = canvas.captureStream(fps).getVideoTracks()[0];
  const audioTrack = dest.stream.getAudioTracks()[0];

  const compositeStream = new MediaStream([videoTrack, audioTrack]);

  return {
    stream: compositeStream,
    stop: () => {
      cancelAnimationFrame(animationFrameId);
      compositeStream.getTracks().forEach((t) => t.stop());
      try {
        audioCtx.close();
      } catch {
        // ignore
      }
    },
    setAudioBeep: (enabled: boolean) => {
      beepActive = enabled;
    },
  };
}
