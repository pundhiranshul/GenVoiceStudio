'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Check, ChevronDown, User, X, Play, Pause, Trash2, HelpCircle, Download } from 'lucide-react';

export interface Voice {
  id: string;
  name: string;
  data: string;
  transcript: string;
  isPreset?: boolean;
}

interface VoiceSelectorProps {
  voices: Voice[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUploadClick: () => void;
  onDeleteVoice?: (id: string) => void;
}

export function VoiceSelector({ voices, selectedId, onSelect, onUploadClick, onDeleteVoice }: VoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expandedTranscriptId, setExpandedTranscriptId] = useState<string | null>(null);

  const selectedVoice = voices.find(v => v.id === selectedId);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const filteredVoices = voices.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const togglePreview = (e: React.MouseEvent, voice: Voice) => {
    e.stopPropagation();
    if (playingId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(voice.data);
      audio.onended = () => {
        setPlayingId(null);
        audioRef.current = null;
      };
      audio.play().catch(err => console.error("Preview play failed:", err));
      audioRef.current = audio;
      setPlayingId(voice.id);
    }
  };

  // Cleanup audio on unmount or modal close
  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-2 bg-bg-panel border border-border-color rounded-lg hover:bg-accent-bg/5 transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none w-full sm:w-[280px]"
      >
        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
          <User size={14} className="text-text-secondary" />
        </div>
        <span className="text-sm font-medium text-text-primary truncate flex-1 text-left">
          {selectedVoice ? selectedVoice.name : 'Select Voice'}
        </span>
        <ChevronDown size={16} className="text-text-muted shrink-0" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div 
            ref={modalRef}
            className="w-full max-w-md bg-bg-panel border border-border-color rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Select a voice"
          >
            <div className="p-4 border-b border-border-subtle flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search voices..."
                  className="w-full bg-bg-input border border-border-color rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color transition-colors"
                />
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent-bg/5 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              <div className="flex flex-col gap-1">
                {filteredVoices.length > 0 ? (
                  filteredVoices.map(voice => (
                    <div key={voice.id} className="flex flex-col">
                      <button
                        onClick={() => {
                          onSelect(voice.id);
                          setIsOpen(false);
                        }}
                      className={`group flex items-center gap-3 w-full text-left p-3 rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color ${
                        selectedId === voice.id ? 'bg-accent-bg/10' : 'hover:bg-accent-bg/5'
                      }`}
                    >
                      {voice.data ? (
                        <button
                          onClick={(e) => togglePreview(e, voice)}
                          className="group/play relative w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden focus-visible:ring-2 focus-visible:ring-white/30 outline-none"
                          aria-label={playingId === voice.id ? "Pause preview" : "Play preview"}
                        >
                          <User 
                            size={16} 
                            className={`transition-opacity duration-200 ${playingId === voice.id ? 'opacity-0' : 'group-hover/play:opacity-0'} ${selectedId === voice.id ? 'text-text-primary' : 'text-text-secondary'}`} 
                          />
                          <div className={`absolute inset-0 flex items-center justify-center bg-zinc-600 transition-opacity duration-200 ${playingId === voice.id ? 'opacity-100' : 'opacity-0 group-hover/play:opacity-100'}`}>
                            {playingId === voice.id ? <Pause size={14} className="text-white" /> : <Play size={14} className="text-white ml-0.5" />}
                          </div>
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
                          <User size={16} className={selectedId === voice.id ? 'text-text-primary' : 'text-text-secondary'} />
                        </div>
                      )}
                      <span className={`text-sm flex-1 truncate ${selectedId === voice.id ? 'font-medium text-text-primary' : 'text-text-primary'}`}>
                        {voice.name}
                      </span>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                        {voice.transcript && (
                          <button 
                            className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors outline-none ${
                              expandedTranscriptId === voice.id 
                                ? 'bg-accent-bg/10 text-accent-text' 
                                : 'hover:bg-accent-bg/10 text-text-muted hover:text-text-primary'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTranscriptId(expandedTranscriptId === voice.id ? null : voice.id);
                            }}
                            title="Show Transcript"
                          >
                            <HelpCircle size={14} />
                          </button>
                        )}
                        {voice.data && (
                          <a
                            href={voice.data}
                            download={`${voice.name.replace(/[^a-zA-Z0-9]/g, '_')}_reference`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-accent-bg/10 text-text-muted hover:text-text-primary transition-colors"
                            title="Download Reference Audio"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                      {selectedId === voice.id && <Check size={16} className="text-text-primary shrink-0 mr-1" />}
                      {!voice.isPreset && onDeleteVoice && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteVoice(voice.id);
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-500 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          title="Delete custom voice"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      </button>
                      
                      {expandedTranscriptId === voice.id && voice.transcript && (
                        <div className="mx-3 mb-2 px-4 py-3 bg-bg-input/50 rounded-lg text-xs text-text-secondary border border-border-subtle animate-in slide-in-from-top-2 fade-in duration-200 shadow-inner">
                          <span className="font-semibold tracking-wide text-[10px] uppercase text-text-primary/70 mb-1.5 block">Reference Transcript</span>
                          <p className="italic leading-relaxed">"{voice.transcript}"</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-sm text-text-muted">
                    No voices found for "{search}"
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border-subtle bg-bg-input">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onUploadClick();
                }}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-accent-bg text-accent-text hover:bg-accent-bg/90 transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
              >
                + Add Custom Voice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
