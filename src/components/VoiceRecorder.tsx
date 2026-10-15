'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, Sparkles, AlertCircle, Clock, Scissors, ShieldCheck, ChevronDown } from 'lucide-react';
import {
  decodeBlobToAudioBuffer,
  detectSpeechBoundaries,
  sliceAudioBuffer,
  cleanAudioBuffer,
  audioBufferToWav,
  blobToDataUrl,
  RECORDING_SUGGESTED_SCRIPTS
} from '@/utils/audioRecorder';
import { set, get } from 'idb-keyval';

export interface CustomVoice {
  id: string;
  name: string;
  data: string;
  transcript: string;
  isPreset?: boolean;
}

interface VoiceRecorderProps {
  onVoiceSaved?: (voice: CustomVoice) => void;
  onCancel?: () => void;
  initialName?: string;
  className?: string;
  showSaveButton?: boolean;
}

export function VoiceRecorder({
  onVoiceSaved,
  onCancel,
  initialName = '',
  className = '',
  showSaveButton = true
}: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [voiceName, setVoiceName] = useState(initialName);
  const [transcript, setTranscript] = useState('');
  const [selectedScriptIdx, setSelectedScriptIdx] = useState<number | null>(0);
  const [elapsed, setElapsed] = useState(0);

  // Audio & playback state
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [rawBlob, setRawBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioTotalDuration, setAudioTotalDuration] = useState(0);

  // Trimming & Noise Cleaning state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [cleanAudioEnabled, setCleanAudioEnabled] = useState(true);
  const [autoTrimDetected, setAutoTrimDetected] = useState<{ start: number; end: number } | null>(null);

  const [audioLevels, setAudioLevels] = useState<number[]>([20, 35, 15, 45, 25, 40, 30, 20]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [speechRecognizing, setSpeechRecognizing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const decodedBufferRef = useRef<AudioBuffer | null>(null);

  // Initialize with the first suggested script
  useEffect(() => {
    if (RECORDING_SUGGESTED_SCRIPTS.length > 0 && selectedScriptIdx !== null) {
      setTranscript(RECORDING_SUGGESTED_SCRIPTS[selectedScriptIdx]);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllMedia();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const stopAllMedia = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (_) {}
      speechRecognitionRef.current = null;
    }
  }, []);

  const selectScript = (idx: number) => {
    setSelectedScriptIdx(idx);
    setTranscript(RECORDING_SUGGESTED_SCRIPTS[idx]);
    if (!voiceName) {
      setVoiceName(`My Recorded Voice ${idx + 1}`);
    }
  };

  const startRecording = async () => {
    setError(null);
    setSavedSuccess(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone recording is not supported in this browser.");
      return;
    }

    try {
      // High-quality microphone constraints for clean voice capture
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1, // Mono eliminates stereo phase cancellation and background fan noise
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 48000 }
        }
      });
      audioStreamRef.current = stream;

      // Real-time audio analyser for visual feedback
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevels = () => {
          if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArray);
            const step = Math.max(1, Math.floor(dataArray.length / 8));
            const bars: number[] = [];
            for (let i = 0; i < 8; i++) {
              const val = dataArray[i * step] || 0;
              bars.push(Math.max(15, Math.min(100, Math.round((val / 255) * 100))));
            }
            setAudioLevels(bars);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          }
        };
        updateLevels();
      }

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', ''];
      let selectedMime = '';
      for (const m of mimeTypes) {
        if (!m || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))) {
          selectedMime = m;
          break;
        }
      }

      const recorder = selectedMime
        ? new MediaRecorder(stream, { mimeType: selectedMime })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stopAllMedia();
        const recordedBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setRawBlob(recordedBlob);

        try {
          const decoded = await decodeBlobToAudioBuffer(recordedBlob);
          decodedBufferRef.current = decoded;
          const dur = Number(decoded.duration.toFixed(2));
          setAudioTotalDuration(dur);

          // Detect speech boundaries to auto-trim initial and trailing silence
          const boundaries = detectSpeechBoundaries(decoded);
          setAutoTrimDetected(boundaries);
          setTrimStart(boundaries.start);
          setTrimEnd(boundaries.end);

          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(recordedBlob));
          setRecordingState('recorded');
        } catch (convErr) {
          console.error("Audio decoding error:", convErr);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(recordedBlob));
          setRecordingState('recorded');
        }
      };

      // Optional speech-to-text
      if (typeof window !== 'undefined') {
        const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRec) {
          try {
            const recognition = new SpeechRec();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';
            recognition.onresult = (event: any) => {
              let liveText = '';
              for (let i = 0; i < event.results.length; i++) {
                liveText += event.results[i][0].transcript;
              }
              if (liveText.trim()) setTranscript(liveText.trim());
            };
            recognition.onerror = () => setSpeechRecognizing(false);
            recognition.onend = () => setSpeechRecognizing(false);
            recognition.start();
            speechRecognitionRef.current = recognition;
            setSpeechRecognizing(true);
          } catch (_) {}
        }
      }

      recorder.start(100);
      setRecordingState('recording');
      setElapsed(0);

      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(seconds);
        if (seconds >= 30 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 250);

    } catch (err: any) {
      stopAllMedia();
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Microphone permission denied. Please allow microphone access in your browser settings.");
      } else {
        setError(err.message || "Failed to access microphone.");
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopAllMedia();
  };

  const resetRecording = () => {
    stopAllMedia();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setRawBlob(null);
    decodedBufferRef.current = null;
    setRecordingState('idle');
    setElapsed(0);
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioTotalDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setAutoTrimDetected(null);
    setSavedSuccess(false);
    setError(null);
  };

  const toggleAudioPlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start playback from trimStart if current time is outside trimmed region
      const player = audioPlayerRef.current;
      if (player.currentTime < trimStart || (trimEnd > 0 && player.currentTime >= trimEnd - 0.05)) {
        player.currentTime = trimStart;
      }
      player.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.error("Playback error:", e));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioPlayerRef.current) return;
    const player = audioPlayerRef.current;
    const current = player.currentTime;
    setAudioCurrentTime(current);

    // Stop playback when reaching the trimEnd point
    if (trimEnd > 0 && current >= trimEnd) {
      player.pause();
      player.currentTime = trimStart;
      setIsPlaying(false);
      setAudioProgress(100);
      return;
    }

    const dur = audioTotalDuration || 1;
    setAudioProgress((current / dur) * 100);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = trimStart;
    }
  };

  const applyAutoTrim = () => {
    if (autoTrimDetected) {
      setTrimStart(autoTrimDetected.start);
      setTrimEnd(autoTrimDetected.end);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.currentTime = autoTrimDetected.start;
      }
    }
  };

  const resetTrim = () => {
    setTrimStart(0);
    setTrimEnd(audioTotalDuration);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.currentTime = 0;
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    setError(null);
    const nameToSave = voiceName.trim() || "My Recorded Voice";
    const transcriptToSave = transcript.trim();

    if (!rawBlob || !decodedBufferRef.current) {
      setError("Please record your voice first.");
      return;
    }
    if (!transcriptToSave) {
      setError("Please provide the exact transcript of what you said.");
      return;
    }

    setIsSaving(true);
    try {
      const buffer = decodedBufferRef.current;
      const endSec = trimEnd > 0 ? Math.min(trimEnd, buffer.duration) : buffer.duration;
      const startSec = Math.max(0, Math.min(trimStart, endSec - 0.2));

      // 1. Slice audio to the trimmed region
      let processedBuffer = sliceAudioBuffer(buffer, startSec, endSec);

      // 2. Apply studio noise cleaning & normalization if enabled
      if (cleanAudioEnabled) {
        processedBuffer = await cleanAudioBuffer(processedBuffer);
      }

      // 3. Convert to pristine 16-bit PCM WAV Blob
      const wavBlob = audioBufferToWav(processedBuffer);
      const dataUrl = await blobToDataUrl(wavBlob);

      const newVoice: CustomVoice = {
        id: `rec_${Date.now()}`,
        name: nameToSave,
        data: dataUrl,
        transcript: transcriptToSave,
        isPreset: false
      };

      const existing = (await get('custom_voices')) || [];
      const updated = [...existing, newVoice];
      await set('custom_voices', updated);

      setSavedSuccess(true);
      if (onVoiceSaved) {
        onVoiceSaved(newVoice);
      }
    } catch (saveErr: any) {
      console.error("Failed to save voice:", saveErr);
      setError(saveErr.message || "Failed to process and save voice.");
    } finally {
      setIsSaving(false);
    }
  };

  const trimmedDuration = Number(Math.max(0, (trimEnd || audioTotalDuration) - trimStart).toFixed(1));

  return (
    <div className={`flex flex-col gap-3 bg-bg-panel border border-border-color rounded-2xl p-4 sm:p-5 shadow-sm ${className}`}>
      
      {/* Voice Name Input */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
          Voice Name
        </label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="e.g. My Studio Voice, Casual Sam"
          className="w-full bg-bg-input border border-border-color rounded-xl px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-ring-color transition-all"
        />
      </div>

      {/* Suggested Reading Prompt Dropdown (Clean, full sentences, not shaky) */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
            Prompt to Read Aloud
          </label>
          <span className="text-[10px] text-text-muted">Select to use as your script</span>
        </div>
        <div className="relative">
          <select
            value={selectedScriptIdx !== null ? selectedScriptIdx : ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setSelectedScriptIdx(null);
              } else {
                selectScript(Number(val));
              }
            }}
            className="w-full bg-bg-input border border-border-color hover:border-border-subtle rounded-xl px-3.5 py-2 text-xs sm:text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring-color appearance-none cursor-pointer pr-9 font-medium transition-colors"
          >
            {RECORDING_SUGGESTED_SCRIPTS.map((script, idx) => (
              <option key={idx} value={idx}>
                {`Prompt ${idx + 1}: "${script}"`}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Compact Interactive Recording Bar */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-bg-base/70 border border-border-color">
        
        {/* State 1: IDLE - Unified Single Record Button */}
        {recordingState === 'idle' && (
          <div className="flex items-center justify-between w-full min-h-[44px]">
            <button
              type="button"
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-bg text-accent-text hover:opacity-90 active:scale-95 transition-all shadow-sm outline-none font-semibold text-xs sm:text-sm shrink-0"
              aria-label="Start Recording"
            >
              <Mic size={16} />
              <span>Start Recording</span>
            </button>
            <div className="flex flex-col items-end text-right">
              <span className="text-[11px] font-medium text-text-secondary">Noise filter & auto-trim active</span>
              <span className="text-[10px] text-text-muted font-mono">Max duration: 30s</span>
            </div>
          </div>
        )}

        {/* State 2: RECORDING */}
        {recordingState === 'recording' && (
          <div className="flex items-center justify-between w-full min-h-[44px]">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-mono text-sm font-bold text-text-primary tracking-wider">
                {formatSeconds(elapsed)}
              </span>
              <span className="text-[10px] text-text-muted font-mono">(max 00:30)</span>
            </div>

            {/* Live Audio Level Meter */}
            <div className="flex items-center gap-1 h-6">
              {audioLevels.map((lvl, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full bg-accent-bg transition-all duration-75 ease-out"
                  style={{ height: `${lvl}%` }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-xs shadow-sm active:scale-95 transition-all outline-none"
            >
              <Square size={13} fill="currentColor" />
              Stop
            </button>
          </div>
        )}

        {/* State 3: RECORDED PREVIEW & TRIMMING */}
        {recordingState === 'recorded' && audioUrl && (
          <div className="flex flex-col gap-2.5 w-full">
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onTimeUpdate={handleAudioTimeUpdate}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            {/* Player Row */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={toggleAudioPlay}
                className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-accent-bg text-accent-text hover:opacity-90 active:scale-95 transition-transform outline-none"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="ml-0.5" />}
              </button>

              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.1"
                  value={audioProgress}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAudioProgress(val);
                    if (audioPlayerRef.current && audioTotalDuration) {
                      audioPlayerRef.current.currentTime = (val / 100) * audioTotalDuration;
                    }
                  }}
                  className="w-full h-1.5 bg-border-color rounded-lg appearance-none cursor-pointer accent-accent-bg"
                />
                <div className="flex justify-between text-[10px] text-text-muted font-mono leading-none">
                  <span>{formatSeconds(audioCurrentTime)}</span>
                  <span>{formatSeconds(trimmedDuration)} trimmed ({formatSeconds(audioTotalDuration)} total)</span>
                </div>
              </div>

              <button
                type="button"
                onClick={resetRecording}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-bg-hover transition-colors shrink-0"
                title="Discard and record again"
              >
                <RotateCcw size={12} />
                <span className="hidden sm:inline">Re-record</span>
              </button>
            </div>

            {/* Trimming & Noise Cleanup Controls (Compact Bar) */}
            <div className="pt-2 border-t border-border-subtle flex flex-col gap-2">
              
              {/* Sliders for Start & End Trim */}
              <div className="flex flex-col sm:flex-row items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider shrink-0 w-9">Start:</span>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, (trimEnd || audioTotalDuration) - 0.2)}
                    step="0.05"
                    value={trimStart}
                    onChange={(e) => {
                      const val = Number(parseFloat(e.target.value).toFixed(2));
                      setTrimStart(val);
                      if (audioPlayerRef.current) {
                        audioPlayerRef.current.currentTime = val;
                      }
                    }}
                    className="w-full h-1 bg-border-color rounded-lg appearance-none cursor-pointer accent-accent-bg"
                  />
                  <span className="font-mono text-[10px] text-text-primary w-8 text-right">{trimStart}s</span>
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-1/2">
                  <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider shrink-0 w-8">End:</span>
                  <input
                    type="range"
                    min={trimStart + 0.2}
                    max={audioTotalDuration || 1}
                    step="0.05"
                    value={trimEnd || audioTotalDuration}
                    onChange={(e) => {
                      const val = Number(parseFloat(e.target.value).toFixed(2));
                      setTrimEnd(val);
                    }}
                    className="w-full h-1 bg-border-color rounded-lg appearance-none cursor-pointer accent-accent-bg"
                  />
                  <span className="font-mono text-[10px] text-text-primary w-8 text-right">
                    {(trimEnd || audioTotalDuration).toFixed(1)}s
                  </span>
                </div>
              </div>

              {/* Quick Actions & Noise Clean Toggle */}
              <div className="flex items-center justify-between text-[11px] pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={applyAutoTrim}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-bg/10 text-accent-bg font-medium hover:bg-accent-bg/20 transition-colors"
                    title="Automatically snaps to speech start & end"
                  >
                    <Scissors size={11} />
                    Auto-Trim Silence
                  </button>
                  <button
                    type="button"
                    onClick={resetTrim}
                    className="text-text-muted hover:text-text-primary transition-colors text-[10px]"
                  >
                    Reset Trim
                  </button>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={cleanAudioEnabled}
                    onChange={(e) => setCleanAudioEnabled(e.target.checked)}
                    className="rounded text-accent-bg focus:ring-0 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="flex items-center gap-1 text-[11px] font-medium">
                    <ShieldCheck size={13} className="text-accent-bg" />
                    Clean Noise
                  </span>
                </label>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Transcript Field */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase flex items-center gap-1">
            Exact Transcript <span className="text-red-400">*</span>
          </label>
          <span className="text-[10px] text-text-muted">{transcript.length} chars</span>
        </div>
        
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            setSelectedScriptIdx(null);
          }}
          placeholder="Write the exact words and punctuation spoken..."
          rows={2}
          className="w-full bg-bg-input border border-border-color rounded-xl px-3.5 py-2 text-xs sm:text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring-color resize-none placeholder:text-text-muted transition-all"
        />
        <span className="text-[10px] text-text-muted leading-tight">
          Exact matching transcript is required for phoneme alignment in voice cloning.
        </span>
      </div>

      {/* Error / Success Alerts */}
      {error && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {savedSuccess && (
        <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2 animate-in fade-in">
          <Check size={14} className="shrink-0" />
          <span><strong>Voice cleaned & saved!</strong> Available in your Custom Voices library across the studio.</span>
        </div>
      )}

      {/* Actions */}
      {showSaveButton && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={recordingState !== 'recorded' || !rawBlob || !transcript.trim() || isSaving}
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-accent-bg text-accent-text hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="animate-spin" /> Processing & Saving...
              </span>
            ) : savedSuccess ? (
              <span className="flex items-center gap-1.5">
                <Check size={14} /> Saved to Custom Voices
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} /> Save to Custom Voices
              </span>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
