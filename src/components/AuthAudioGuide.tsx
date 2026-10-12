"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Radio } from "lucide-react";

export function AuthAudioGuide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // 30 frequency bars for balanced voice visualization
  const barCount = 30;
  const [waveformBars, setWaveformBars] = useState<number[]>(() =>
    Array.from({ length: 30 }, (_, i) => 12 + Math.sin(i * 0.45) * 6)
  );

  const setupAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      // Lower smoothing so bars react rapidly and flicker to vocal inflections
      analyser.smoothingTimeConstant = 0.52;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
    } catch {
      // AudioContext fallback
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const startPlayback = () => {
      setupAudioContext();
      if (audioContextRef.current && audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    };

    startPlayback();

    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        startPlayback();
      }
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      audio.pause();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, [setupAudioContext]);

  // Real-time animation loop for vocal frequency flickering
  useEffect(() => {
    const renderWave = () => {
      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const bars: number[] = [];
        // Human speech formants are predominantly in the lower-mid bins
        // Speech range covers indices 1 through bufferLength * 0.55
        const maxSpeechBin = Math.floor(bufferLength * 0.55);

        for (let i = 0; i < barCount; i++) {
          // Bell curve distribution across the vocal frequencies
          const freqIndex = Math.min(
            maxSpeechBin - 1,
            Math.max(1, Math.floor((i / barCount) * maxSpeechBin))
          );
          const rawVal = dataArray[freqIndex] || 0;
          
          // Enhanced dynamic range: exaggerate vocal syllables and pauses
          const normalized = rawVal / 255;
          const dynamicBoost = Math.pow(normalized, 1.15) * 100;
          
          // Add subtle natural jitter for lively flickering response to voice
          const jitter = rawVal > 25 ? (Math.random() - 0.5) * 6 : 0;
          const height = Math.max(8, Math.min(100, dynamicBoost + jitter));
          bars.push(height);
        }
        setWaveformBars(bars);
      } else if (!isPlaying) {
        // Organic idle breathing wave
        const t = Date.now() / 900;
        const idleBars = Array.from({ length: barCount }, (_, i) => {
          return 12 + Math.sin(t + i * 0.35) * 7;
        });
        setWaveformBars(idleBars);
      }
      animationFrameRef.current = requestAnimationFrame(renderWave);
    };

    animationFrameRef.current = requestAnimationFrame(renderWave);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    setupAudioContext();
    if (audioContextRef.current && audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {});
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full lg:w-80 xl:w-88 shrink-0 bg-bg-panel/90 border border-border-color rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all duration-300 relative group overflow-hidden min-h-[340px] lg:min-h-[460px]"
    >
      <audio
        ref={audioRef}
        src="/samples/AuthenticationGuide_1.wav"
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onDurationChange={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Atmospheric ambient glow that pulses with speech energy */}
      <div
        className={`absolute inset-0 bg-radial from-accent-bg/20 via-transparent to-transparent pointer-events-none transition-opacity duration-700 blur-xl ${
          isPlaying ? "opacity-100 scale-110" : "opacity-25 scale-90"
        }`}
      />

      {/* Header bar: minimal live indicator & micro controls */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono tracking-wider font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              PLAYING
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-border-color/40 border border-border-color/60 text-text-muted text-[11px] font-mono tracking-wider">
              <Radio size={12} className="opacity-70" />
              READY
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            title="Replay from start"
            aria-label="Replay audio"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>

      {/* Prominent, Responsive Waveform Visualizer */}
      <div
        onClick={togglePlay}
        className="w-full flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-1 py-8 cursor-pointer relative z-10 group/wave my-auto"
        title={isPlaying ? "Click to pause" : "Click to play"}
      >
        {waveformBars.map((heightPct, idx) => (
          <div
            key={idx}
            style={{ height: `${heightPct}%` }}
            className={`w-1 sm:w-1.5 min-h-[8px] rounded-full transition-all duration-75 ${
              isPlaying
                ? "bg-accent-bg shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                : "bg-border-color/70 group-hover/wave:bg-text-secondary"
            }`}
          />
        ))}

        {/* Central interactive play/pause glass button */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none ${
            !isPlaying || isHovered ? "opacity-100 scale-100" : "opacity-0 scale-90"
          }`}
        >
          <div className="w-14 h-14 rounded-full bg-bg-panel/90 border border-border-color shadow-2xl flex items-center justify-center text-text-primary group-hover/wave:scale-110 group-hover/wave:border-accent-bg/40 transition-all backdrop-blur-md">
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-1" />
            )}
          </div>
        </div>
      </div>

      {/* Minimalist scrubber track & time readout */}
      <div className="w-full flex flex-col gap-2 z-10">
        <input
          type="range"
          min={0}
          max={duration || 63}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-border-color/50 hover:bg-border-color rounded-lg appearance-none cursor-pointer accent-accent-bg outline-none transition-colors"
          aria-label="Seek audio"
        />
        <div className="flex justify-between items-center text-[10px] font-mono text-text-muted px-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration || 63)}</span>
        </div>
      </div>
    </div>
  );
}
