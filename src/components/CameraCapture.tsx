import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../lib/compressImage';

interface CameraCaptureProps {
  onPhoto: (blob: Blob) => void;
  onVideo: (blob: Blob) => void;
}

const MAX_VIDEO_DURATION_MS = 60_000;

function pickSupportedVideoMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  return supported ?? 'video/webm';
}

export default function CameraCapture({ onPhoto, onVideo }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setUseFallback(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: true })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true);
      });

    return () => {
      cancelled = true;
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) onPhoto(blob);
    }, 'image/jpeg', 0.82);
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    recordedChunksRef.current = [];
    const mimeType = pickSupportedVideoMimeType();
    const baseType = mimeType.split(';')[0];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: baseType });
      onVideo(blob);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    stopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_VIDEO_DURATION_MS);
  }

  function stopRecording() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  async function handleFallbackFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      onPhoto(compressed);
    } else if (file.type.startsWith('video/')) {
      onVideo(file);
    }
  }

  if (useFallback) {
    return (
      <div className="camera-capture camera-capture-fallback">
        <label className="upload-button">
          פתח מצלמה
          <input
            type="file"
            accept="image/*,video/*"
            capture="environment"
            onChange={handleFallbackFile}
            hidden
          />
        </label>
      </div>
    );
  }

  return (
    <div className="camera-capture">
      <video ref={videoRef} muted playsInline />
      <div className="camera-controls">
        <button type="button" onClick={takePhoto} disabled={isRecording}>
          צלם תמונה
        </button>
        {isRecording ? (
          <button type="button" onClick={stopRecording}>עצור הקלטה</button>
        ) : (
          <button type="button" onClick={startRecording}>הקלט וידאו</button>
        )}
      </div>
    </div>
  );
}
