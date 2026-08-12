import { useEffect, useRef } from 'react';
import jsQR from 'jsqr';

interface QrScannerProps {
  onDecode: (text: string) => void;
}

export default function QrScanner({ onDecode }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let stopped = false;

    async function start() {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
            onDecode(result.data);
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
  }, [onDecode]);

  return (
    <div className="qr-scanner">
      <video ref={videoRef} muted playsInline />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
