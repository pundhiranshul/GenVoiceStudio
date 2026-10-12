"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import {
  AUDIO_DURATION,
  AUDIO_FPS,
  BARS_COUNT,
  TOTAL_FRAMES,
  getFrameBars
} from "@/data/authAudioFeatures";

/**
 * High-performance, acoustic feature-driven voice wave component.
 * Seamlessly integrated into the site background (no panel/card wrapper).
 * - Scrubbing/seeking is integrated directly in the bar panel.
 * - Replay and Mute/Unmute buttons are located on the top right.
 * - No bottom playback row or redundant badges.
 */
export function AuthAudioGuide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

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
      // Autoplay blocked by browser policy until interaction
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
      lastTime = now;
      const audio = audioRef.current;
      const playing = audio ? !audio.paused && !audio.ended : false;

      if (playing && audio) {
        const cur = audio.currentTime;
        const frameIdx = Math.min(TOTAL_FRAMES - 1, Math.floor(cur * AUDIO_FPS));
        const targetBars = getFrameBars(frameIdx);
        const progressRatio = (audio.duration || duration || 63) > 0
          ? cur / (audio.duration || duration || 63)
          : 0;

        for (let b = 0; b < BARS_COUNT; b++) {
          const target = targetBars[b] || 8;
          const factor = target > currentBarsRef.current[b] ? 0.55 : 0.28;
          currentBarsRef.current[b] += (target - currentBarsRef.current[b]) * factor;

          const el = barRefs.current[b];
          if (el) {
            const h = Math.max(6, Math.min(100, currentBarsRef.current[b]));
            el.style.height = `${h}%`;
            // Color passed bars with full opacity / accent
            const isPassed = (b / BARS_COUNT) <= progressRatio;
            el.style.opacity = isPassed ? "1" : "0.35";
          }
        }
      } else {
        // Idle breathing ambient wave
        const t = now / 650;
        const audio = audioRef.current;
        const cur = audio?.currentTime || 0;
        const progressRatio = (duration || 63) > 0 ? cur / (duration || 63) : 0;

        for (let b = 0; b < BARS_COUNT; b++) {
          const idle = 12 + Math.sin(t + b * 0.38) * 8;
          currentBarsRef.current[b] += (idle - currentBarsRef.current[b]) * 0.15;

          const el = barRefs.current[b];
          if (el) {
            const h = Math.max(6, Math.min(100, currentBarsRef.current[b]));
            el.style.height = `${h}%`;
            const isPassed = (b / BARS_COUNT) <= progressRatio;
            el.style.opacity = isPassed ? "0.85" : "0.35";
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [duration]);

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

  // Direct waveform scrubbing
  const seekFromClientX = useCallback((clientX: number) => {
    const container = containerRef.current;
    const audio = audioRef.current;
    if (!container || !audio) return;
    const rect = container.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clickX / rect.width;
    const totalDur = audio.duration && isFinite(audio.duration) ? audio.duration : duration || 63;
    const target = ratio * totalDur;
    audio.currentTime = target;
    setCurrentTime(target);
  }, [duration]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    seekFromClientX(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    if (e.touches[0]) seekFromClientX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isDraggingRef.current && e.touches[0]) {
      seekFromClientX(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) {
        seekFromClientX(e.clientX);
      }
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [seekFromClientX]);

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || isNaN(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div className="w-full flex flex-col gap-3 text-text-primary select-none">
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

      {/* Top row: Time on the left, Replay & Sound controls on the top right */}
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-xs font-mono text-text-muted">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Replay and Sound off/on buttons on top right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-panel/60 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            title="Replay audio from start"
            aria-label="Replay audio"
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.muted = !isMuted;
                setIsMuted((prev) => !prev);
              }
            }}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-panel/60 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            title={isMuted ? "Unmute audio" : "Mute audio"}
            aria-label={isMuted ? "Unmute audio" : "Mute audio"}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>

      {/* Interactive Sound Wave Bar Panel — seeking integrated directly inside */}
      <div
        ref={containerRef}
        role="slider"
        tabIndex={0}
        aria-label="Audio scrubber and visualizer"
        aria-valuemin={0}
        aria-valuemax={duration || 63}
        aria-valuenow={currentTime}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => { isDraggingRef.current = false; }}
        className="group relative w-full h-24 sm:h-28 flex items-center justify-between gap-[3px] sm:gap-1.5 px-3 py-2 rounded-2xl bg-bg-panel/40 hover:bg-bg-panel/70 border border-border-color/40 hover:border-border-color transition-all cursor-ew-resize overflow-hidden shadow-inner"
      >
        {/* Subtle ambient dynamic background glow */}
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
            className="flex-1 rounded-full transition-[height] duration-75 relative z-10 bg-text-primary pointer-events-none min-h-[5px]"
          />
        ))}

        {/* Integrated scrub line across the bottom of the bar panel */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-border-color/20 pointer-events-none">
          <div
            className="h-full bg-accent-bg transition-[width] duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Center Play / Pause button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="pointer-events-auto w-12 h-12 rounded-full bg-bg-base/90 border border-border-color shadow-2xl flex items-center justify-center text-text-primary backdrop-blur-md transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? (
              <Pause size={18} fill="currentColor" />
            ) : (
              <Play size={18} fill="currentColor" className="ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
