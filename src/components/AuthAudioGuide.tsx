"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Headphones } from "lucide-react";

export function AuthAudioGuide() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Attempt autoplay when component mounts
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          // Browser prevented autoplay before user interaction
          setIsPlaying(false);
          setAutoplayBlocked(true);
        });
    }

    // If autoplay was blocked, start on the first user interaction anywhere on the window
    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(() => {});
      }
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };

    window.addEventListener("click", handleFirstInteraction, { once: true });
    window.addEventListener("keydown", handleFirstInteraction, { once: true });

    return () => {
      audio.pause();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
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
      .then(() => {
        setIsPlaying(true);
      })
      .catch(() => {});
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || !isFinite(secs)) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full mb-6 p-4 rounded-2xl bg-gradient-to-r from-accent-bg/10 via-bg-input/80 to-bg-input/60 border border-border-color shadow-sm backdrop-blur-sm transition-all">
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

      <div className="flex items-center justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
              isPlaying
                ? "bg-accent-bg text-accent-text shadow-sm"
                : "bg-border-color/30 text-text-muted"
            }`}
          >
            <Headphones size={14} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-primary tracking-tight flex items-center gap-1.5 truncate">
              Audio Guide
              {isPlaying && (
                <span className="flex items-center gap-0.5 ml-1">
                  <span className="w-1 h-2 bg-accent-bg rounded-full animate-pulse" />
                  <span className="w-1 h-3 bg-accent-bg rounded-full animate-pulse delay-75" />
                  <span className="w-1 h-2 bg-accent-bg rounded-full animate-pulse delay-150" />
                </span>
              )}
            </span>
            <span className="text-[11px] text-text-muted truncate">
              {isPlaying
                ? "Playing authentication walkthrough..."
                : autoplayBlocked
                ? "Click play to listen to audio walkthrough"
                : "Step-by-step voice guidance"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            title="Restart Guide"
            aria-label="Restart audio guide"
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

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-xl bg-accent-bg text-accent-text hover:opacity-90 active:scale-95 transition-all flex items-center justify-center shrink-0 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
          aria-label={isPlaying ? "Pause audio guide" : "Play audio guide"}
        >
          {isPlaying ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" className="ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 63}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-border-color/60 rounded-lg appearance-none cursor-pointer accent-accent-bg outline-none"
              aria-label="Seek audio guide position"
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-text-muted font-mono tracking-tight px-0.5">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 63)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
