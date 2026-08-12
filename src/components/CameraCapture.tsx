import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../lib/compressImage';
import { MAX_VIDEO_DURATION_SECONDS } from '../lib/videoDuration';
import { CloseIcon } from './icons';

interface CameraCaptureProps {
  onPhoto: (blob: Blob) => void;
  onVideo: (blob: Blob) => void;
  onClose: () => void;
}

type CaptureMode = 'photo' | 'video';

const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;

function pickSupportedVideoMimeType(): string {
  const candidates = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
  const supported = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  return supported ?? 'video/webm';
}

function formatTimer(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function CameraCapture({ onPhoto, onVideo, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [recordedSeconds, setRecordedSeconds] = useState(0);

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
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
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
    setRecordedSeconds(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordedSeconds((prev) => prev + 1);
    }, 1000);
    stopTimerRef.current = window.setTimeout(() => stopRecording(), MAX_VIDEO_DURATION_MS);
  }

  function stopRecording() {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }

  function handleShutterClick() {
    if (mode === 'photo') {
      takePhoto();
      return;
    }
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
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
        <button type="button" className="icon-button camera-close-button fallback-close" onClick={onClose} aria-label="סגור">
          <CloseIcon />
        </button>
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

      <div className="camera-top-bar">
        <button
          type="button"
          className="icon-button camera-close-button"
          onClick={isRecording ? undefined : onClose}
          disabled={isRecording}
          aria-label="סגור"
        >
          <CloseIcon />
        </button>
      </div>

      {isRecording && (
        <div className="camera-recording-indicator">
          <span className="camera-recording-dot" />
          {formatTimer(recordedSeconds)}
        </div>
      )}

      <div className="camera-bottom-bar">
        <div className="camera-mode-toggle">
          <button
            type="button"
            className={mode === 'photo' ? 'active' : ''}
            onClick={() => setMode('photo')}
            disabled={isRecording}
          >
            תמונה
          </button>
          <button
            type="button"
            className={mode === 'video' ? 'active' : ''}
            onClick={() => setMode('video')}
            disabled={isRecording}
          >
            וידאו
          </button>
        </div>

        <button
          type="button"
          className={`camera-shutter${isRecording ? ' recording' : ''}`}
          onClick={handleShutterClick}
          aria-label={mode === 'photo' ? 'צלם תמונה' : isRecording ? 'עצור הקלטה' : 'התחל הקלטה'}
        >
          <span className="camera-shutter-inner" />
        </button>
      </div>
    </div>
  );
}
