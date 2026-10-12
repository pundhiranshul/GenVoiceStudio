"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

/**
 * Voice visualizer pane — rendered as a transparent left column inside the auth card.
 * No card chrome (no bg, no border, no rounded corners). The parent card provides context.
 */
export function AuthAudioGuide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const BAR_COUNT = 28;
  const [bars, setBars] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, (_, i) => 10 + Math.sin(i * 0.5) * 5)
  );

  // Set up AudioContext + analyser exactly once, on first user interaction
  const setupAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.55;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (_) { /* safari / blocked */ }
  }, []);

  const startPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setupAudioContext();
    if (audioContextRef.current?.state === "suspended") {
      audioContextRef.current.resume();
    }
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [setupAudioContext]);

  // Try autoplay immediately; catch is expected on most browsers without interaction
  useEffect(() => {
    startPlay();
  }, [startPlay]);

  // On first page click/key, resume if audio is still paused
  useEffect(() => {
    const resume = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        if (audioRef.current?.paused) startPlay();
      }
    };
    window.addEventListener("click", resume, { once: true });
    window.addEventListener("keydown", resume, { once: true });
    return () => {
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
    };
  }, [hasInteracted, startPlay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Real-time frequency analysis loop
  useEffect(() => {
    const tick = () => {
      if (analyserRef.current && isPlaying) {
        const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(buf);

        // Human speech sits roughly in the bottom 55% of the FFT bins
        const speechBins = Math.floor(buf.length * 0.55);
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const idx = Math.max(1, Math.floor((i / BAR_COUNT) * speechBins));
          const raw = buf[idx] ?? 0;
          // Boost dynamics: power curve makes quiet moments drop, loud syllables spike
          const normalised = Math.pow(raw / 255, 1.1) * 100;
          // Tiny random jitter adds life to vocal texture
          const jitter = raw > 20 ? (Math.random() - 0.5) * 8 : 0;
          next.push(Math.max(6, Math.min(100, normalised + jitter)));
        }
        setBars(next);
      } else {
        // Idle breathing wave
        const t = Date.now() / 850;
        setBars(Array.from({ length: BAR_COUNT }, (_, i) =>
          10 + Math.sin(t + i * 0.38) * 7
        ));
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };
    animationFrameRef.current = requestAnimationFrame(tick);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setupAudioContext();
    if (audioContextRef.current?.state === "suspended") audioContextRef.current.resume();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center justify-between w-full h-full gap-6 py-2">
      <audio
        ref={audioRef}
        src="/samples/AuthenticationGuide_1.wav"
        preload="auto"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && isFinite(audioRef.current.duration) && setDuration(audioRef.current.duration)}
        onDurationChange={() => audioRef.current && isFinite(audioRef.current.duration) && setDuration(audioRef.current.duration)}
        onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
      />

      {/* Status pill */}
      <div className="flex items-center gap-2 self-start">
        {isPlaying ? (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-widest font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            LIVE
          </span>
        ) : (
          <span className="text-[10px] font-mono tracking-widest text-text-muted uppercase">
            {hasInteracted ? "PAUSED" : "tap to play"}
          </span>
        )}
      </div>

      {/* Waveform — clickable, fills available height */}
      <div
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause" : "Play"}
        onClick={togglePlay}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && togglePlay()}
        className="relative flex-1 w-full flex items-center justify-center gap-[3px] sm:gap-1 cursor-pointer group outline-none px-1"
      >
        {bars.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%` }}
            className={`w-1 sm:w-[5px] rounded-full transition-all duration-75 ${
              isPlaying
                ? "bg-text-primary/70 group-hover:bg-text-primary"
                : "bg-text-muted/40 group-hover:bg-text-muted/70"
            }`}
          />
        ))}

        {/* Play / pause disc — only shows on hover or when paused */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none ${
            !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-bg-panel border border-border-color shadow-xl flex items-center justify-center text-text-primary backdrop-blur-sm transition-transform group-hover:scale-110">
            {isPlaying
              ? <Pause size={18} fill="currentColor" />
              : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </div>
        </div>
      </div>

      {/* Scrubber + controls */}
      <div className="w-full flex flex-col gap-2">
        <input
          type="range"
          min={0}
          max={duration || 63}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1 rounded-full appearance-none cursor-pointer bg-border-color/40 accent-text-primary outline-none"
          aria-label="Seek"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-text-muted">{fmt(currentTime)}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRestart}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              aria-label="Restart"
            >
              <RotateCcw size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.muted = !isMuted;
                  setIsMuted(v => !v);
                }
              }}
              className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            </button>
          </div>
          <span className="text-[10px] font-mono text-text-muted">{fmt(duration || 63)}</span>
        </div>
      </div>
    </div>
  );
}
