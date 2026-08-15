import { useEffect, useRef, useState } from 'react';
import { compressImage } from '../lib/compressImage';
import { MAX_VIDEO_DURATION_SECONDS } from '../lib/videoDuration';
import { CloseIcon, FlipCameraIcon } from './icons';

interface CameraCaptureProps {
  onPhoto: (blob: Blob) => void;
  onVideo: (blob: Blob) => void;
  onClose: () => void;
}

type FacingMode = 'environment' | 'user';
type PreviewType = 'photo' | 'video';
type CaptureMode = 'photo' | 'video';

interface ZoomRange {
  min: number;
  max: number;
}

const MAX_VIDEO_DURATION_MS = MAX_VIDEO_DURATION_SECONDS * 1000;
const HOLD_TO_RECORD_MS = 300;
const DOUBLE_TAP_MS = 300;
const ZOOM_DRAG_RANGE_PX = 250;

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
  const holdTimeoutRef = useRef<number | null>(null);
  const isHoldingRef = useRef(false);
  const holdLastYRef = useRef(0);
  const lastTapAtRef = useRef(0);
  const zoomRangeRef = useRef<ZoomRange | null>(null);
  const zoomValueRef = useRef(1);
  const previewUrlRef = useRef<string | null>(null);
  const facingModeRef = useRef<FacingMode>('environment');

  const [isRecording, setIsRecording] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [mode, setMode] = useState<CaptureMode>('photo');
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const [preview, setPreview] = useState<{ url: string; type: PreviewType } | null>(null);

  facingModeRef.current = facingMode;

  function setPreviewFromBlob(blob: Blob, type: PreviewType) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreview({ url, type });
  }

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setUseFallback(true);
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode }, audio: true })
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

        const [videoTrack] = stream.getVideoTracks();
        const capabilities = (videoTrack?.getCapabilities?.() ?? {}) as MediaTrackCapabilities & {
          zoom?: ZoomRange;
        };
        if (capabilities.zoom) {
          zoomRangeRef.current = capabilities.zoom;
          const settings = (videoTrack.getSettings?.() ?? {}) as MediaTrackSettings & { zoom?: number };
          zoomValueRef.current = settings.zoom ?? capabilities.zoom.min;
        } else {
          zoomRangeRef.current = null;
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
  }, [facingMode]);

  function flipCamera() {
    if (isRecording) return;
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  }

  function handleViewfinderTap() {
    const now = Date.now();
    if (now - lastTapAtRef.current < DOUBLE_TAP_MS) {
      lastTapAtRef.current = 0;
      flipCamera();
    } else {
      lastTapAtRef.current = now;
    }
  }

  function applyZoomDelta(deltaYPixels: number) {
    const range = zoomRangeRef.current;
    const track = streamRef.current?.getVideoTracks()[0];
    if (!range || !track) return;
    const sensitivity = (range.max - range.min) / ZOOM_DRAG_RANGE_PX;
    const next = Math.min(range.max, Math.max(range.min, zoomValueRef.current + deltaYPixels * sensitivity));
    zoomValueRef.current = next;
    track.applyConstraints({ advanced: [{ zoom: next } as MediaTrackConstraintSet] }).catch(() => {});
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingModeRef.current === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setShowFlash(true);
    window.setTimeout(() => setShowFlash(false), 200);

    canvas.toBlob((blob) => {
      if (blob) {
        setPreviewFromBlob(blob, 'photo');
        onPhoto(blob);
      }
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
      setPreviewFromBlob(blob, 'video');
      onVideo(blob);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
    setIsRecording(true);
    setRecordedSeconds(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordedSeconds((prev) => prev + 1);
    }, 1000);
    stopTimerRef.current = window.setTimeout(() => {
      isHoldingRef.current = false;
      stopRecording();
    }, MAX_VIDEO_DURATION_MS);
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
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }

  function handleShutterPointerDown(event: React.PointerEvent) {
    event.preventDefault();
    holdLastYRef.current = event.clientY;

    if (mode === 'video') {
      // tap to start/stop handled on pointer up; drag-to-zoom works while recording
      return;
    }

    isHoldingRef.current = false;
    holdTimeoutRef.current = window.setTimeout(() => {
      isHoldingRef.current = true;
      startRecording();
    }, HOLD_TO_RECORD_MS);
  }

  function handleShutterPointerMove(event: React.PointerEvent) {
    if (mode === 'video') {
      if (!isRecording) return;
      const deltaY = holdLastYRef.current - event.clientY;
      holdLastYRef.current = event.clientY;
      applyZoomDelta(deltaY);
      return;
    }

    if (!isHoldingRef.current) return;
    const deltaY = holdLastYRef.current - event.clientY;
    holdLastYRef.current = event.clientY;
    applyZoomDelta(deltaY);
  }

  function handleShutterPointerUp() {
    if (mode === 'video') {
      if (isRecording) {
        stopRecording();
      } else {
        startRecording();
      }
      return;
    }

    if (holdTimeoutRef.current) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (isHoldingRef.current) {
      isHoldingRef.current = false;
      stopRecording();
    } else {
      takePhoto();
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
      <video
        ref={videoRef}
        muted
        playsInline
        onClick={handleViewfinderTap}
        className={facingMode === 'user' ? 'mirrored' : undefined}
      />
      {showFlash && <div className="camera-flash" />}

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
        <div className="camera-shutter-row">
          <div className="camera-preview-thumb">
            {preview && (
              preview.type === 'photo' ? (
                <img src={preview.url} alt="" />
              ) : (
                <video src={preview.url} muted />
              )
            )}
          </div>

          <button
            type="button"
            className={`camera-shutter${isRecording ? ' recording' : ''}`}
            onPointerDown={handleShutterPointerDown}
            onPointerMove={handleShutterPointerMove}
            onPointerUp={handleShutterPointerUp}
            onPointerCancel={handleShutterPointerUp}
            aria-label={
              isRecording
                ? 'עצור הקלטה'
                : mode === 'video'
                  ? 'התחל הקלטת וידאו'
                  : 'צלם תמונה, החזק לוידאו'
            }
          >
            <span className="camera-shutter-inner" />
          </button>

          <button
            type="button"
            className="icon-button camera-flip-button"
            onClick={flipCamera}
            disabled={isRecording}
            aria-label="החלף מצלמה"
          >
            <FlipCameraIcon size={20} />
          </button>
        </div>

        <div className="camera-mode-toggle">
          <button
            type="button"
            className={mode === 'video' ? 'active' : undefined}
            onClick={() => setMode('video')}
            disabled={isRecording}
          >
            וידאו
          </button>
          <button
            type="button"
            className={mode === 'photo' ? 'active' : undefined}
            onClick={() => setMode('photo')}
            disabled={isRecording}
          >
            תמונה
          </button>
        </div>
      </div>
    </div>
  );
}
