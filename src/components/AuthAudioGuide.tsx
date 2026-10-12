"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles } from "lucide-react";
import {
  AUDIO_DURATION,
  AUDIO_FPS,
  BARS_COUNT,
  TOTAL_FRAMES,
  STATIC_WAVEFORM,
  getFrameBars
} from "@/data/authAudioFeatures";

/**
 * High-performance, acoustic feature-driven voice wave component.
 * Seamlessly integrated into the site background (no panel/card wrapper).
 * Driven by precomputed speech formant acoustic features with zero Web Audio CORS/permission bugs.
 */
export function AuthAudioGuide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Smooth bars buffer for interpolation
  const currentBarsRef = useRef<number[]>(new Array(BARS_COUNT).fill(12));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(AUDIO_DURATION || 63);
  const [isMuted, setIsMuted] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Attempt autoplay safely
  const attemptPlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Autoplay blocked by browser policy until interaction — expected
      setIsPlaying(false);
    });
  }, []);

  useEffect(() => {
    attemptPlay();
  }, [attemptPlay]);

  // First user interaction resume
  useEffect(() => {
    const onUserGesture = () => {
      if (!hasInteracted) {
        setHasInteracted(true);
        if (audioRef.current?.paused) {
          attemptPlay();
        }
      }
    };
    window.addEventListener("click", onUserGesture, { once: true });
    window.addEventListener("keydown", onUserGesture, { once: true });
    return () => {
      window.removeEventListener("click", onUserGesture);
      window.removeEventListener("keydown", onUserGesture);
    };
  }, [hasInteracted, attemptPlay]);

  // High-performance 60fps render loop with direct DOM updates (no React re-renders)
  useEffect(() => {
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(40, now - lastTime) / 1000;
      lastTime = now;

      const audio = audioRef.current;
      const playing = audio ? !audio.paused && !audio.ended : false;

      if (playing && audio) {
        const cur = audio.currentTime;
        const frameIdx = Math.min(TOTAL_FRAMES - 1, Math.floor(cur * AUDIO_FPS));
        const targetBars = getFrameBars(frameIdx);

        // Fast acoustic formant tracking with natural vocal spring physics
        for (let b = 0; b < BARS_COUNT; b++) {
          const target = targetBars[b] || 8;
          // Asymmetric attack/decay: voice syllables spike fast (0.5), decay smoothly (0.3)
          const factor = target > currentBarsRef.current[b] ? 0.55 : 0.28;
          currentBarsRef.current[b] += (target - currentBarsRef.current[b]) * factor;

          const el = barRefs.current[b];
          if (el) {
            const h = Math.max(6, Math.min(100, currentBarsRef.current[b]));
            el.style.height = `${h}%`;
            // Dynamic brightness glow based on amplitude
            el.style.opacity = `${0.35 + (h / 100) * 0.65}`;
          }
        }
      } else {
        // Idle breathing ambient wave
        const t = now / 650;
        for (let b = 0; b < BARS_COUNT; b++) {
          const idle = 12 + Math.sin(t + b * 0.38) * 8;
          currentBarsRef.current[b] += (idle - currentBarsRef.current[b]) * 0.15;

          const el = barRefs.current[b];
          if (el) {
            const h = Math.max(6, Math.min(100, currentBarsRef.current[b]));
            el.style.height = `${h}%`;
            el.style.opacity = "0.4";
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setHasInteracted(true);
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="w-full flex flex-col gap-5 text-text-primary select-none">
      <audio
        ref={audioRef}
        src="/samples/AuthenticationGuide_1.wav"
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && isFinite(audioRef.current.duration)) {
            setDuration(audioRef.current.duration);
          }
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
      />

      {/* Top status indicator & helper */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Voice Guide Playing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-border-color/30 border border-border-color/50 text-text-muted text-xs font-medium">
              <Sparkles size={12} className="text-accent-bg" />
              Listen to Voice Overview
            </span>
          )}
        </div>
        <span className="text-xs font-mono text-text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Dynamic Sound Wave Bars — clickable, prominent, organic */}
      <div
        role="button"
        tabIndex={0}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
        onClick={togglePlay}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && togglePlay()}
        className="group relative w-full h-24 sm:h-28 flex items-center justify-between gap-[3px] sm:gap-1.5 px-3 py-2 rounded-2xl bg-bg-panel/40 hover:bg-bg-panel/60 border border-border-color/40 hover:border-border-color transition-all cursor-pointer overflow-hidden shadow-inner"
      >
        {/* Subtle dynamic background glow when voice is playing */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-accent-bg/10 via-accent-bg/5 to-transparent transition-opacity duration-500 pointer-events-none ${
            isPlaying ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 28 Formant frequency wave bars */}
        {Array.from({ length: BARS_COUNT }).map((_, i) => (
          <div
            key={i}
            ref={(el) => {
              barRefs.current[i] = el;
            }}
            style={{ height: "12%" }}
            className={`flex-1 rounded-full transition-[height,opacity] duration-75 relative z-10 ${
              isPlaying
                ? "bg-gradient-to-t from-accent-bg/70 to-text-primary group-hover:to-accent-bg"
                : "bg-text-muted/50 group-hover:bg-text-muted/80"
            }`}
          />
        ))}

        {/* Floating play/pause pill hint on hover or when paused */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 pointer-events-none z-20 ${
            !isPlaying ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-bg-base/90 border border-border-color shadow-2xl flex items-center justify-center text-text-primary backdrop-blur-md transition-transform group-hover:scale-110">
            {isPlaying ? (
              <Pause size={20} fill="currentColor" />
            ) : (
              <Play size={20} fill="currentColor" className="ml-0.5" />
            )}
          </div>
        </div>
      </div>

      {/* Scrubber track & playback controls */}
      <div className="flex items-center gap-3">
        {/* Play/Pause icon button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-bg-panel border border-border-color hover:border-text-primary/40 flex items-center justify-center text-text-primary transition-colors shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" className="ml-0.5" />}
        </button>

        {/* Interactive seeker range */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={duration || 63}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-border-color/50 accent-accent-bg hover:bg-border-color transition-colors outline-none"
            aria-label="Seek timeline"
          />
        </div>

        {/* Restart button */}
        <button
          type="button"
          onClick={handleRestart}
          className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          title="Restart audio"
          aria-label="Restart audio"
        >
          <RotateCcw size={14} />
        </button>

        {/* Mute/Unmute button */}
        <button
          type="button"
          onClick={() => {
            if (audioRef.current) {
              audioRef.current.muted = !isMuted;
              setIsMuted((prev) => !prev);
            }
          }}
          className="p-1.5 text-text-muted hover:text-text-primary rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
}
