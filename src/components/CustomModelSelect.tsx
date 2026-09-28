"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export const AVAILABLE_AI_MODELS = [
  // Low Cost / Fast
  'openai/gpt-5.4-nano-2026-03-17',
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.5-flash-lite',
  'openai/gpt-5.4-mini-2026-03-17',

  // Medium Cost / Balanced
  'google/gemini-3-flash-preview',
  'google/gemini-3.5-flash',
  'google/gemini-3.6-flash',
  'google/gemini-3.7-flash',
  'google/gemini-3.8-flash',
  'qwen/qwen3-next-80b-a3b-instruct',
  'openai/gpt-oss-120b',

  // Higher Cost / Powerful
  'openai/gpt-5.4-2026-03-05',
  'openai/gpt-5.5-2026-04-23',
  'qwen/qwen3-235b-a22b-instruct-2507',
  'openai/gpt-5.6-luna',
  'qwen/qwen3-coder-480b-a35b-instruct',

  // Highest Cost / Reasoning & Pro
  'openai/gpt-5.6-terra',
  'google/gemini-3.1-pro-preview',
  'anthropic/claude-sonnet-5@default',
  'openai/gpt-6-astra',
  'deepseek-ai/deepseek-r1-0528'
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
