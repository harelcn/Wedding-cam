import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { AlertIcon, CloseIcon } from './icons';

interface QrScannerProps {
  onDecode: (text: string) => void;
  onClose: () => void;
}

export default function QrScanner({ onDecode, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let stopped = false;

    async function start() {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        if (!stopped) setError('לא ניתן לגשת למצלמה');
        return;
      }
      if (stopped) {
        mediaStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      scanLoop();
    }

    function scanLoop() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const result = jsQR(imageData.data, imageData.width, imageData.height);
          if (result) {
            onDecodeRef.current(result.data);
          }
        }
      }
      animationFrameId = requestAnimationFrame(scanLoop);
    }

    start();

    return () => {
      stopped = true;
      cancelAnimationFrame(animationFrameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="qr-scanner">
      <video ref={videoRef} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div className="qr-scanner-frame" aria-hidden="true">
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
      </div>
      <button type="button" className="icon-button qr-scanner-close" onClick={onClose} aria-label="סגור">
        <CloseIcon />
      </button>
      {error ? (
        <div className="error-banner qr-scanner-error" role="alert">
          <AlertIcon />
          {error}
        </div>
      ) : null}
    </div>
  );
}
