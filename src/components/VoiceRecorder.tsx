'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Play, Pause, RotateCcw, Check, Sparkles, AlertCircle, Clock } from 'lucide-react';
import { convertBlobToWav, blobToDataUrl, RECORDING_SUGGESTED_SCRIPTS } from '@/utils/audioRecorder';
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
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioTotalDuration, setAudioTotalDuration] = useState(0);
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
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      audioStreamRef.current = stream;

      // Audio analyser for real-time visualizer
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

      // Supported mimeType check
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
        const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        try {
          const wav = await convertBlobToWav(rawBlob);
          setAudioBlob(wav);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(wav));
          setRecordingState('recorded');
        } catch (convErr) {
          console.error("WAV conversion error:", convErr);
          setAudioBlob(rawBlob);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(rawBlob));
          setRecordingState('recorded');
        }
      };

      // Optional live speech recognition
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
    setAudioBlob(null);
    setRecordingState('idle');
    setElapsed(0);
    setIsPlaying(false);
    setAudioProgress(0);
    setAudioCurrentTime(0);
    setAudioTotalDuration(0);
    setSavedSuccess(false);
    setError(null);
  };

  const toggleAudioPlay = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => console.error("Playback error:", e));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (!audioPlayerRef.current) return;
    const current = audioPlayerRef.current.currentTime;
    const dur = audioPlayerRef.current.duration || audioTotalDuration || 1;
    setAudioCurrentTime(current);
    setAudioProgress((current / dur) * 100);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setAudioProgress(100);
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

    if (!audioBlob) {
      setError("Please record your voice first.");
      return;
    }
    if (!transcriptToSave) {
      setError("Please provide the exact transcript of what you said.");
      return;
    }

    setIsSaving(true);
    try {
      const dataUrl = await blobToDataUrl(audioBlob);
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
      setError(saveErr.message || "Failed to save voice to library.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`flex flex-col gap-3.5 bg-bg-panel border border-border-color rounded-2xl p-4 sm:p-5 shadow-sm ${className}`}>
      
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

      {/* Suggested Reading Scripts (Compact pills without adjectives/titles) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
            Prompts to Read Aloud
          </label>
          <span className="text-[10px] text-text-muted">Click to use</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {RECORDING_SUGGESTED_SCRIPTS.map((script, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectScript(idx)}
              className={`px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 border text-left ${
                selectedScriptIdx === idx
                  ? 'bg-accent-bg text-accent-text border-accent-bg font-medium shadow-sm'
                  : 'bg-bg-input text-text-secondary border-border-subtle hover:bg-bg-hover hover:text-text-primary hover:border-border-color'
              }`}
              title={script}
            >
              {script.length > 36 ? script.slice(0, 34) + '...' : script}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Interactive Recording Bar */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-bg-base/70 border border-border-color gap-3 min-h-[58px]">
        
        {/* State 1: IDLE */}
        {recordingState === 'idle' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startRecording}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-accent-bg text-accent-text hover:opacity-90 active:scale-95 transition-all shadow-sm outline-none shrink-0"
                aria-label="Start Recording"
              >
                <Mic size={18} />
              </button>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-text-primary">Click to Record</span>
                <span className="text-[10px] text-text-muted">Speak for 5–20 seconds into your microphone</span>
              </div>
            </div>
            <button
              type="button"
              onClick={startRecording}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-bg-panel border border-border-color text-text-primary hover:bg-bg-hover transition-colors hidden sm:block"
            >
              Start
            </button>
          </div>
        )}

        {/* State 2: RECORDING */}
        {recordingState === 'recording' && (
          <div className="flex items-center justify-between w-full">
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

            {/* Compact EQ wave */}
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

        {/* State 3: RECORDED PREVIEW */}
        {recordingState === 'recorded' && audioUrl && (
          <div className="flex items-center justify-between w-full gap-3">
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onTimeUpdate={handleAudioTimeUpdate}
              onLoadedMetadata={() => {
                if (audioPlayerRef.current) setAudioTotalDuration(audioPlayerRef.current.duration);
              }}
              onEnded={handleAudioEnded}
              className="hidden"
            />

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
                <span>{formatSeconds(audioTotalDuration || elapsed)}</span>
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
          <span><strong>Voice saved!</strong> Available in your Custom Voices library across the studio.</span>
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
            disabled={recordingState !== 'recorded' || !audioBlob || !transcript.trim() || isSaving}
            onClick={handleSave}
            className="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-accent-bg text-accent-text hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            {isSaving ? (
              <span className="flex items-center gap-1.5">
                <Clock size={14} className="animate-spin" /> Saving...
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
