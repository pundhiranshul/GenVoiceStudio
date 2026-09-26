'use client';

import { useState, useRef } from 'react';
import { Play, Pause, Download } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
  name: string;
  transcript?: string;
}

export function AudioPlayer({ src, name, transcript }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (audioRef.current) {
      const seekTo = (parseFloat(e.target.value) / 100) * audioRef.current.duration;
      audioRef.current.currentTime = seekTo;
      setProgress(parseFloat(e.target.value));
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentTime = audioRef.current ? audioRef.current.currentTime : 0;

  return (
    <div className="w-full flex flex-col">
      <div className="flex items-center gap-4 bg-bg-panel border border-border-color rounded-xl p-3 shadow-sm w-full">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setIsPlaying(false); setProgress(100); }}
        className="hidden"
      />
      
      <button 
        onClick={togglePlay}
        className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full bg-accent-bg text-accent-text hover:opacity-90 transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
      </button>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-[11px] font-medium text-text-secondary tabular-nums shrink-0">{formatTime(currentTime)}</span>
        
        {/* Custom Range Scrubber */}
        <div className="relative flex-1 flex items-center h-5 group">
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={isNaN(progress) ? 0 : progress}
            onChange={handleSeek}
            className="absolute z-10 w-full opacity-0 cursor-pointer h-full"
            aria-label="Audio progress"
          />
          <div className="w-full h-1 bg-accent-bg/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent-bg transition-all duration-75 ease-out"
              style={{ width: `${isNaN(progress) ? 0 : progress}%` }}
            />
          </div>
          {/* Thumb visual */}
          <div 
            className="absolute h-3 w-3 bg-accent-bg rounded-full shadow pointer-events-none group-hover:scale-110 transition-transform"
            style={{ left: `calc(${isNaN(progress) ? 0 : progress}% - 6px)` }}
          />
        </div>

        <span className="text-[11px] font-medium text-text-secondary tabular-nums shrink-0">{formatTime(duration)}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={src}
          download={name}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent-bg/5 text-text-secondary hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
          aria-label="Download audio"
          title="Download"
        >
          <Download size={16} />
        </a>
      </div>
    </div>
    
    {/* Transcript */}
    {transcript && (
      <div className="mt-2 px-3 py-2 bg-bg-panel border border-border-color rounded-xl text-[13px] text-text-secondary leading-relaxed font-medium">
        {transcript}
      </div>
    )}
    </div>
  );
}
