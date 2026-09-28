"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export const AVAILABLE_AI_MODELS = [
  "google/gemini-3.7-flash",
  "google/gemini-3.7-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-pro",
  "meta-llama/llama-3-70b-instruct",
  "meta-llama/llama-3-8b-instruct",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
  "mistralai/mixtral-8x7b-instruct",
  "openai/gpt-4o",
  "openai/gpt-4o-mini"
];

export const CustomModelSelect = ({ 
  value, 
  onChange, 
  options, 
  className = "" 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: string[], 
  className?: string 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 w-full bg-transparent text-text-primary px-2 py-1 rounded outline-none focus:ring-2 focus:ring-ring-color border border-transparent hover:border-border-color transition-colors"
      >
        <span className="truncate font-medium text-xs">{value.split('/').pop()}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-text-muted shrink-0`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 max-h-64 w-full min-w-[224px] right-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg bg-bg-panel border border-border-color shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-bg-hover transition-colors truncate
                ${value === opt ? "bg-accent-bg/10 text-accent-text font-medium" : "text-text-secondary"}
              `}
              title={opt}
            >
              {opt.split('/').pop()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
