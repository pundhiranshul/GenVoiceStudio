"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, RotateCcw, Volume2, Volume1, VolumeX, X, Headphones } from "lucide-react";
import * as authAudio from "@/data/authAudioFeatures";
import * as verifyAudio from "@/data/verifyAudioFeatures";

const DONT_REMIND_KEY = "genvoice_audio_guide_dont_remind";
const DISMISSED_SESSION_KEY = "genvoice_audio_guide_dismissed";
const HAS_PLAYED_KEY = "genvoice_audio_guide_has_played";

const GUIDE_PLAY_HINTS = [
  "Click play for a step-by-step audio walkthrough",
  "Tap play to listen to our interactive voice guide",
  "Prefer listening? Click play to hear setup instructions",
  "Hit play for a spoken overview of the setup steps",
  "Click play to hear our quick audio onboarding guide",
  "Tap play to listen along while setting up your credentials",
  "Need assistance? Hit play for spoken walkthrough guidance",
  "Press play to hear tips on generating your Kaggle API key",
  "Click play to listen to the audio walkthrough",
  "Turn up your sound and tap play for guided instructions",
  "Hit play anytime to hear audio walkthrough instructions",
  "Tap play to hear a quick explanation of the authentication steps",
  "Listen to the audio guide for a quick walkthrough",
  "Click play to hear voice tips on getting started with GenVoice",
  "Press play to listen to step-by-step Kaggle setup tips",
  "Prefer audio? Tap play to hear spoken instructions",
  "Hit play for a quick audio walkthrough of this page",
  "Click play to hear our friendly voice guide you through setup",
  "Tap play for audio-guided assistance with your Kaggle token",
  "Press play to start the spoken audio guide",
];

interface AuthAudioGuideProps {
  src?: string;
}

/**
 * High-performance, acoustic feature-driven voice wave component.
 * Seamlessly integrated into the site background (no panel/card wrapper).
 * - Upper ~90% of the bar panel toggles play/pause on click (does NOT seek).
 * - Only the meager bottom part has the seeking / scrubbing feature.
 * - Replay and Mute/Unmute buttons are located on the top right.
 */
export function AuthAudioGuide({ src = "/samples/AuthenticationGuide_1.wav" }: AuthAudioGuideProps) {
  const isGuide2 = src.includes("AuthenticationGuide_2");
  const audioData = isGuide2 ? verifyAudio : authAudio;
  const { BARS_COUNT } = audioData;

  const audioRef = useRef<HTMLAudioElement>(null);
  const scrubTrackRef = useRef<HTMLDivElement>(null);
  const barRefs = useRef<(HTMLDivElement | null)[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);

  const audioDataRef = useRef(audioData);
  audioDataRef.current = audioData;

  // Smooth bars buffer for interpolation
  const currentBarsRef = useRef<number[]>(new Array(BARS_COUNT).fill(20));
  const wasPlayingRef = useRef(false);
  const pauseStartRef = useRef(0);
  const pauseHeightsRef = useRef<number[]>(new Array(BARS_COUNT).fill(20));

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(audioData.AUDIO_DURATION || 63);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  const prevVolumeRef = useRef(1);
  const isHoveringVolumeRef = useRef(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Play guide hint callout state
  const [showPlayHint, setShowPlayHint] = useState(false);
  const [hintMessage, setHintMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const dontRemind = localStorage.getItem(DONT_REMIND_KEY) === "true";
      const hasPlayed = localStorage.getItem(HAS_PLAYED_KEY) === "true";
      const sessionDismissed = sessionStorage.getItem(DISMISSED_SESSION_KEY) === "true";

      if (!dontRemind && !hasPlayed && !sessionDismissed) {
        const randomIndex = Math.floor(Math.random() * GUIDE_PLAY_HINTS.length);
        setHintMessage(GUIDE_PLAY_HINTS[randomIndex]);
        setShowPlayHint(true);
      }
    } catch {}
  }, []);

  const handleDismissHint = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlayHint(false);
    try {
      sessionStorage.setItem(DISMISSED_SESSION_KEY, "true");
    } catch {}
  };

  const handleNeverRemind = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPlayHint(false);
    try {
      localStorage.setItem(DONT_REMIND_KEY, "true");
    } catch {}
  };

  // Handle src changes smoothly (no autoplay)
  useEffect(() => {
    setDuration(audioData.AUDIO_DURATION || 63);
    setCurrentTime(0);
    currentBarsRef.current = new Array(BARS_COUNT).fill(20);
    pauseHeightsRef.current = new Array(BARS_COUNT).fill(20);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = 0;
      audio.pause();
      setIsPlaying(false);
    }
  }, [src, audioData.AUDIO_DURATION, BARS_COUNT]);


  // High-performance 60fps render loop with direct DOM updates (no React re-renders)
  useEffect(() => {
    const tick = (now: number) => {
      const audio = audioRef.current;
      const playing = audio ? !audio.paused && !audio.ended : false;

      if (playing && audio) {
        wasPlayingRef.current = true;
        const cur = audio.currentTime;
        const { TOTAL_FRAMES, AUDIO_FPS, BARS_COUNT: count, getFrameBars, AUDIO_DURATION: fallbackDuration } = audioDataRef.current;
        const frameIdx = Math.min(TOTAL_FRAMES - 1, Math.floor(cur * AUDIO_FPS));
        const targetBars = getFrameBars(frameIdx);
        const progressRatio = (audio.duration || duration || fallbackDuration || 63) > 0
          ? cur / (audio.duration || duration || fallbackDuration || 63)
          : 0;

        for (let b = 0; b < count; b++) {
          const target = targetBars[b] || 8;
          const factor = target > currentBarsRef.current[b] ? 0.55 : 0.28;
          currentBarsRef.current[b] += (target - currentBarsRef.current[b]) * factor;

          const el = barRefs.current[b];
          if (el) {
            const h = Math.max(8, Math.min(100, currentBarsRef.current[b]));
            el.style.height = `${h}%`;
            const isPassed = (b / count) <= progressRatio;
            el.style.opacity = isPassed ? "1" : "0.35";
          }
        }
      } else {
        if (wasPlayingRef.current) {
          // Just paused: smoothly crossfade from speech heights into the idle wave
          wasPlayingRef.current = false;
          pauseStartRef.current = now;
          pauseHeightsRef.current = [...currentBarsRef.current];
        }

        // Pure unidirectional traveling wave: constant phase velocity moving left-to-right
        const t = now * 0.0022; // smooth soothing speed (~3.5s per cycle across all bars)
        const audio = audioRef.current;
        const cur = audio?.currentTime || 0;
        const progressRatio = (duration || 63) > 0 ? cur / (duration || 63) : 0;
        const transitionElapsed = now - pauseStartRef.current;
        const isTransitioning = pauseStartRef.current > 0 && transitionElapsed < 350;
        const blend = isTransitioning ? transitionElapsed / 350 : 1;
        const ease = blend * blend * (3 - 2 * blend); // cubic smoothstep curve

        const { BARS_COUNT: count } = audioDataRef.current;
        for (let b = 0; b < count; b++) {
          // Both fundamental and octave harmonic share the same direction (- b * 0.26) for zero interference jitter
          const theta = t - b * 0.26;
          const wave = Math.sin(theta) * 0.85 + Math.sin(theta * 2) * 0.15;
          // Smoothly undulates between 9% and 31% with float precision (no dead zones or flat dashes)
          const idleTarget = 20 + wave * 11;

          let h = idleTarget;
          if (isTransitioning) {
            h = pauseHeightsRef.current[b] * (1 - ease) + idleTarget * ease;
          }
          currentBarsRef.current[b] = h;

          const el = barRefs.current[b];
          if (el) {
            el.style.height = `${h}%`;
            const isPassed = cur > 0.05 && (b / count) <= progressRatio;
            el.style.opacity = cur > 0.05 ? (isPassed ? "0.85" : "0.35") : "0.55";
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
    if (showPlayHint) {
      setShowPlayHint(false);
      try {
        localStorage.setItem(HAS_PLAYED_KEY, "true");
      } catch {}
    }
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
    if (showPlayHint) {
      setShowPlayHint(false);
      try {
        localStorage.setItem(HAS_PLAYED_KEY, "true");
      } catch {}
    }
    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted || volume === 0) {
      const restored = prevVolumeRef.current > 0 ? prevVolumeRef.current : 1;
      audio.muted = false;
      audio.volume = restored;
      setVolume(restored);
      setIsMuted(false);
    } else {
      prevVolumeRef.current = volume;
      audio.muted = true;
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    const audio = audioRef.current;
    if (audio) {
      audio.volume = val;
      if (val === 0) {
        audio.muted = true;
        setIsMuted(true);
      } else {
        audio.muted = false;
        setIsMuted(false);
        prevVolumeRef.current = val;
      }
    }
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      setIsDraggingVolume(false);
      if (!isHoveringVolumeRef.current) {
        setIsVolumeOpen(false);
      }
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    window.addEventListener("touchend", onGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", onGlobalMouseUp);
      window.removeEventListener("touchend", onGlobalMouseUp);
    };
  }, []);

  // Seeking restricted exclusively to the meager bottom scrub track
  const seekFromClientX = useCallback((clientX: number) => {
    const track = scrubTrackRef.current;
    const audio = audioRef.current;
    if (!track || !audio) return;
    const rect = track.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = clickX / rect.width;
    const totalDur = audio.duration && isFinite(audio.duration) ? audio.duration : duration || audioDataRef.current.AUDIO_DURATION || 63;
    const target = ratio * totalDur;
    audio.currentTime = target;
    setCurrentTime(target);
  }, [duration]);

  const handleScrubMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    seekFromClientX(e.clientX);
  };

  const handleScrubTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    if (e.touches[0]) seekFromClientX(e.touches[0].clientX);
  };

  const handleScrubTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
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
        src={src}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) {
            if (isFinite(audioRef.current.duration)) {
              setDuration(audioRef.current.duration);
            }
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
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

        {/* Replay and Sound controls on top right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-panel/60 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color shrink-0"
            title="Replay audio from start"
            aria-label="Replay audio"
          >
            <RotateCcw size={15} />
          </button>

          {/* Volume container: on hover, expands horizontally to the left, shifting restart button */}
          <div
            className="flex items-center rounded-lg transition-colors"
            onMouseEnter={() => {
              isHoveringVolumeRef.current = true;
              setIsVolumeOpen(true);
            }}
            onMouseLeave={() => {
              isHoveringVolumeRef.current = false;
              if (!isDraggingVolume) {
                setIsVolumeOpen(false);
              }
            }}
          >
            {/* Horizontal slider container that smoothly animates width, shifting restart button to the left */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-out flex items-center ${
                isVolumeOpen || isDraggingVolume ? "w-20 sm:w-24 opacity-100 mr-1.5" : "w-0 opacity-0 mr-0"
              }`}
            >
              <div className="relative w-full flex items-center h-5 px-1">
                {/* Fine greyed-out horizontal line track */}
                <div className="absolute left-1 right-1 h-0.5 bg-neutral-300 dark:bg-neutral-600 rounded-full pointer-events-none overflow-hidden">
                  {/* Subtle active fill tracking current loudness */}
                  <div
                    className="h-full bg-accent-bg rounded-full transition-all duration-75"
                    style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  onMouseDown={() => setIsDraggingVolume(true)}
                  onTouchStart={() => setIsDraggingVolume(true)}
                  className="w-full h-5 relative z-10 appearance-none bg-transparent cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-bg [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:hover:scale-125 [&::-webkit-slider-thumb]:active:scale-125 [&::-webkit-slider-thumb]:transition-transform [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-accent-bg [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md"
                  aria-label="Volume slider"
                  title={`Volume: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>
            </div>

            {/* Speaker Mute/Unmute button */}
            <button
              type="button"
              onClick={handleToggleMute}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-panel/60 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color shrink-0"
              title={isMuted || volume === 0 ? "Unmute audio" : `Mute audio (${Math.round(volume * 100)}%)`}
              aria-label={isMuted || volume === 0 ? "Unmute audio" : "Mute audio"}
            >
              {isMuted || volume === 0 ? (
                <VolumeX size={15} />
              ) : volume < 0.5 ? (
                <Volume1 size={15} />
              ) : (
                <Volume2 size={15} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sound Wave Bar Panel Wrapper */}
      <div className="relative w-full">
        {/* Play Guide Callout Tooltip directing user to play */}
        {showPlayHint && !isPlaying && (
          <div
            className="absolute -top-14 sm:-top-16 left-1/2 -translate-x-1/2 z-40 max-w-[96%] sm:max-w-md w-max bg-bg-panel/95 backdrop-blur-md border border-border-color rounded-full px-3 sm:px-3.5 py-1.5 shadow-xl flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto"
            role="status"
            aria-live="polite"
          >
            {/* Audio indicator icon */}
            <div className="w-5 h-5 rounded-full bg-accent-bg/15 text-accent-bg flex items-center justify-center shrink-0">
              <Headphones size={11} className="animate-pulse" />
            </div>

            {/* Hint message text */}
            <span className="text-[11px] sm:text-xs font-medium text-text-primary leading-tight truncate sm:whitespace-normal">
              {hintMessage}
            </span>

            {/* Divider */}
            <div className="w-px h-3 bg-border-color/60 shrink-0" />

            {/* Don't remind button */}
            <button
              type="button"
              onClick={handleNeverRemind}
              className="text-[10px] text-text-muted hover:text-text-primary whitespace-nowrap transition-colors outline-none shrink-0"
              title="Don't remind me again"
            >
              Don&apos;t remind
            </button>

            {/* Close 'X' button */}
            <button
              type="button"
              onClick={handleDismissHint}
              className="p-0.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-full transition-colors outline-none shrink-0"
              aria-label="Dismiss hint"
              title="Dismiss"
            >
              <X size={13} />
            </button>

            {/* Downward pointing arrow caret directing to the center play button */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-bg-panel border-r border-b border-border-color rotate-45 pointer-events-none" />
          </div>
        )}

        {/* Sound Wave Bar Panel */}
        <div className="group relative w-full h-24 sm:h-28 flex flex-col justify-between rounded-2xl bg-bg-panel/40 hover:bg-bg-panel/70 border border-border-color/40 hover:border-border-color transition-all overflow-hidden shadow-inner select-none">
        {/* Subtle ambient dynamic background glow */}
        <div
          className={`absolute inset-0 bg-gradient-to-r from-accent-bg/10 via-accent-bg/5 to-transparent transition-opacity duration-500 pointer-events-none ${
            isPlaying ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* ── Upper ~90%: Waveform bars + Play/Pause button (Clicking plays/pauses, does NOT seek) ── */}
        <div
          role="button"
          tabIndex={0}
          aria-label={isPlaying ? "Pause audio" : "Play audio"}
          onClick={togglePlay}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && togglePlay()}
          className="relative flex-1 w-full flex items-center justify-between gap-[3px] sm:gap-1.5 px-3 pt-3 pb-1 cursor-pointer outline-none z-10"
        >
          {/* 28 Formant frequency wave bars */}
          {Array.from({ length: BARS_COUNT }).map((_, i) => (
            <div
              key={i}
              ref={(el) => {
                barRefs.current[i] = el;
              }}
              style={{ height: `${20 + Math.sin(-i * 0.26) * 9}%` }}
              className="flex-1 rounded-full relative z-10 bg-text-primary pointer-events-none min-h-[6px] will-change-[height]"
            />
          ))}

          {/* Center Play / Pause button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-12 h-12 rounded-full bg-bg-base/90 border border-border-color shadow-2xl flex items-center justify-center text-text-primary backdrop-blur-md transition-transform group-hover:scale-110 active:scale-95">
              {isPlaying ? (
                <Pause size={18} fill="currentColor" />
              ) : (
                <Play size={18} fill="currentColor" className="ml-0.5" />
              )}
            </div>
          </div>
        </div>

        {/* ── Meager bottom part (~10%): Dedicated seeking track ONLY ── */}
        <div
          ref={scrubTrackRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek timeline"
          aria-valuemin={0}
          aria-valuemax={duration || 63}
          aria-valuenow={currentTime}
          onMouseDown={handleScrubMouseDown}
          onTouchStart={handleScrubTouchStart}
          onTouchMove={handleScrubTouchMove}
          onTouchEnd={() => { isDraggingRef.current = false; }}
          className="relative w-full h-3.5 sm:h-4 flex items-center px-2 cursor-ew-resize group/scrub z-30 bg-transparent hover:bg-border-color/10 transition-colors"
          title="Drag or click to seek"
        >
          {/* Scrubber track background */}
          <div className="w-full h-1 group-hover/scrub:h-1.5 rounded-full bg-border-color/30 overflow-hidden transition-all relative">
            <div
              className="h-full bg-accent-bg transition-[width] duration-75"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Scrubber thumb handle (visible on hover) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-accent-bg border border-bg-base shadow-md opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none -ml-1"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  </div>
  );
}
