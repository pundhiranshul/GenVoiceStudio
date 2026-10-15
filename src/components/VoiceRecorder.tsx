'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Square, Play, Pause, RotateCcw, Check, Sparkles, AlertCircle, Volume2, Clock, Info } from 'lucide-react';
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
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 20, 10, 25, 18, 30, 22, 14]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
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
      setTranscript(RECORDING_SUGGESTED_SCRIPTS[selectedScriptIdx].text);
    }
  }, []);

  // Check Web Speech API support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setIsSpeechSupported(true);
      }
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
    setTranscript(RECORDING_SUGGESTED_SCRIPTS[idx].text);
    if (!voiceName) {
      setVoiceName(`Voice - ${RECORDING_SUGGESTED_SCRIPTS[idx].title}`);
    }
  };

  const startRecording = async () => {
    setError(null);
    setSavedSuccess(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Microphone recording is not supported in this browser. Please use Chrome, Safari, or Firefox.");
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

      // Setup audio analyzer for live VU meter
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
            // Sample 8 bands for visualization
            const step = Math.max(1, Math.floor(dataArray.length / 8));
            const bars: number[] = [];
            for (let i = 0; i < 8; i++) {
              const val = dataArray[i * step] || 0;
              // Normalize 0 to 100 with minimum height of 10
              bars.push(Math.max(10, Math.min(100, Math.round((val / 255) * 100))));
            }
            setAudioLevels(bars);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          }
        };
        updateLevels();
      }

      // Determine supported mimeType
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        ''
      ];
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
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAllMedia();
        const rawBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        try {
          // Convert to standard 16-bit PCM WAV Blob
          const wav = await convertBlobToWav(rawBlob);
          setAudioBlob(wav);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          const newUrl = URL.createObjectURL(wav);
          setAudioUrl(newUrl);
          setRecordingState('recorded');
        } catch (convErr) {
          console.error("WAV conversion error:", convErr);
          setAudioBlob(rawBlob);
          if (audioUrl) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(rawBlob));
          setRecordingState('recorded');
        }
      };

      // Live Speech-to-Text if transcript is empty
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
              if (liveText.trim()) {
                setTranscript(liveText.trim());
              }
            };
            recognition.onerror = () => {
              setSpeechRecognizing(false);
            };
            recognition.onend = () => {
              setSpeechRecognizing(false);
            };

            recognition.start();
            speechRecognitionRef.current = recognition;
            setSpeechRecognizing(true);
          } catch (_) {
            // Speech recognition might fail or be blocked, continue audio recording
          }
        }
      }

      recorder.start(100);
      setRecordingState('recording');
      setElapsed(0);

      // Start elapsed timer
      const startTime = Date.now();
      timerIntervalRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        setElapsed(seconds);
        // Automatically stop at 30 seconds
        if (seconds >= 30 && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, 250);

    } catch (err: any) {
      stopAllMedia();
      console.error("Microphone access failed:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Microphone permission denied. Please allow microphone access in your browser settings to record your voice.");
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
      }).catch((e) => {
        console.error("Audio playback error:", e);
      });
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

      // Save to IndexedDB
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
    <div className={`flex flex-col gap-6 bg-bg-panel border border-border-color rounded-2xl p-6 shadow-sm ${className}`}>
      
      {/* Header & Quick Explanation */}
      <div className="flex flex-col gap-1.5 border-b border-border-subtle pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent-bg/10 rounded-xl text-accent-bg">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary">Record Your Voice</h3>
              <p className="text-xs text-text-muted">
                Speak for 5–20 seconds into your microphone to create an instant custom voice clone.
              </p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Voice Name Input */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
          Voice Name
        </label>
        <input
          type="text"
          value={voiceName}
          onChange={(e) => setVoiceName(e.target.value)}
          placeholder="e.g. My Studio Voice, Casual Anshul"
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-2 focus:ring-ring-color transition-all"
        />
      </div>

      {/* Suggested Reading Scripts */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            Recommended Scripts to Read Aloud
          </label>
          <span className="text-[10px] text-text-muted">Click any prompt to use</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {RECORDING_SUGGESTED_SCRIPTS.map((script, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectScript(idx)}
              className={`p-2.5 rounded-xl text-left border text-xs transition-all flex flex-col gap-1 ${
                selectedScriptIdx === idx
                  ? 'border-accent-bg bg-accent-bg/10 text-text-primary font-medium shadow-sm'
                  : 'border-border-subtle bg-bg-input/60 text-text-secondary hover:bg-bg-hover hover:border-border-color'
              }`}
            >
              <span className="font-semibold text-[11px] text-text-primary flex items-center justify-between">
                {script.title}
                {selectedScriptIdx === idx && <Check size={13} className="text-accent-bg" />}
              </span>
              <span className="line-clamp-2 text-text-muted text-[11px] leading-relaxed">
                "{script.text}"
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Recording Area */}
      <div className="flex flex-col gap-3 p-5 rounded-2xl bg-bg-base/70 border border-border-color">
        
        {/* Idle State */}
        {recordingState === 'idle' && (
          <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
            <button
              type="button"
              onClick={startRecording}
              className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-accent-bg text-accent-text shadow-lg hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-4 focus-visible:ring-ring-color"
              aria-label="Start Recording"
            >
              <Mic size={28} className="group-hover:scale-110 transition-transform" />
            </button>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">Click to Start Recording</span>
              <span className="text-xs text-text-muted">Speak clearly at normal conversational volume (5–20s recommended)</span>
            </div>
          </div>
        )}

        {/* Recording in Progress */}
        {recordingState === 'recording' && (
          <div className="flex flex-col items-center justify-center py-5 gap-4">
            
            {/* Live Timer and Pulsing Indicator */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <span className="font-mono text-lg font-bold text-text-primary tracking-wider">
                {formatSeconds(elapsed)}
              </span>
              <span className="text-xs text-text-muted font-mono">(max 00:30)</span>
            </div>

            {/* Live Audio Level Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-12 w-full max-w-xs">
              {audioLevels.map((lvl, i) => (
                <div
                  key={i}
                  className="w-2.5 rounded-full bg-accent-bg transition-all duration-75 ease-out"
                  style={{ height: `${lvl}%` }}
                />
              ))}
            </div>

            {speechRecognizing && (
              <span className="text-[11px] text-accent-bg animate-pulse flex items-center gap-1 font-medium">
                <Sparkles size={12} /> Live transcribing your speech...
              </span>
            )}

            {/* Stop Recording Button */}
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-red-500 hover:bg-red-600 text-white font-medium text-sm shadow-md hover:scale-105 active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <Square size={16} fill="currentColor" />
              Stop Recording
            </button>
          </div>
        )}

        {/* Recorded Audio Preview State */}
        {recordingState === 'recorded' && audioUrl && (
          <div className="flex flex-col gap-4 py-2">
            <audio
              ref={audioPlayerRef}
              src={audioUrl}
              onTimeUpdate={handleAudioTimeUpdate}
              onLoadedMetadata={() => {
                if (audioPlayerRef.current) {
                  setAudioTotalDuration(audioPlayerRef.current.duration);
                }
              }}
              onEnded={handleAudioEnded}
              className="hidden"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-500/10 text-green-500 rounded-lg">
                  <Check size={16} />
                </div>
                <span className="text-xs font-semibold text-text-primary">Recording Ready ({formatSeconds(audioTotalDuration || elapsed)})</span>
              </div>
              
              <button
                type="button"
                onClick={resetRecording}
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary px-2.5 py-1 rounded-lg hover:bg-bg-hover transition-colors"
                title="Discard and record again"
              >
                <RotateCcw size={13} />
                Re-record
              </button>
            </div>

            {/* Audio Player Bar */}
            <div className="flex items-center gap-3 bg-bg-panel border border-border-color p-3 rounded-xl">
              <button
                type="button"
                onClick={toggleAudioPlay}
                className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-accent-bg text-accent-text hover:opacity-90 transition-transform active:scale-95 outline-none"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
              </button>
              
              <div className="flex-1 flex flex-col gap-1">
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
                <div className="flex justify-between text-[10px] text-text-muted font-mono">
                  <span>{formatSeconds(audioCurrentTime)}</span>
                  <span>{formatSeconds(audioTotalDuration || elapsed)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcript Textarea */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase flex items-center gap-1.5">
            Exact Transcript <span className="text-red-400">*</span>
          </label>
          <span className="text-[10px] text-text-muted">{transcript.length} characters</span>
        </div>
        
        <textarea
          value={transcript}
          onChange={(e) => {
            setTranscript(e.target.value);
            setSelectedScriptIdx(null); // User manually modified it
          }}
          placeholder="Write the exact words and punctuation spoken in your recording..."
          rows={3}
          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:ring-2 focus:ring-ring-color resize-none placeholder:text-text-muted transition-all"
        />

        <div className="p-3 bg-accent-bg/5 border border-accent-bg/10 rounded-xl flex items-start gap-2 text-xs text-text-secondary leading-relaxed">
          <Info size={14} className="text-accent-bg shrink-0 mt-0.5" />
          <span>
            <strong>Crucial for Voice Cloning:</strong> Breeze TTS uses this transcript to align phonemes with your voice sample. Ensure every word, punctuation mark, and capitalization accurately matches what was spoken.
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs flex items-center gap-2 animate-in fade-in">
          <Check size={15} className="shrink-0" />
          <span><strong>Voice saved successfully!</strong> It is now available in your Custom Voices library across the entire studio.</span>
        </div>
      )}

      {/* Actions */}
      {showSaveButton && (
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={recordingState !== 'recorded' || !audioBlob || !transcript.trim() || isSaving}
            onClick={handleSave}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-accent-bg text-accent-text hover:opacity-90 disabled:opacity-40 disabled:hover:opacity-40 transition-all shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Clock size={16} className="animate-spin" /> Saving Voice...
              </span>
            ) : savedSuccess ? (
              <span className="flex items-center gap-2">
                <Check size={16} /> Saved to Custom Voices
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles size={16} /> Save to Custom Voices
              </span>
            )}
          </button>
        </div>
      )}

    </div>
  );
}
