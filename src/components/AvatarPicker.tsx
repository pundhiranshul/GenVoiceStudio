'use client';

import { Check } from 'lucide-react';
import { TEMPLATE_AVATARS, TemplateAvatar } from '@/lib/avatars';

interface AvatarPickerProps {
  selectedAvatar: string;
  onSelectAvatar: (avatarUrl: string) => void;
  label?: string;
  className?: string;
}

export function AvatarPicker({
  selectedAvatar,
  onSelectAvatar,
  label = "Voice Avatar",
  className = ""
}: AvatarPickerProps) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
            {label}
          </label>
          <span className="text-[11px] text-text-muted">
            Choose a persona avatar
          </span>
        </div>
      )}
      
      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar sm:grid sm:grid-cols-6 sm:overflow-visible">
        {TEMPLATE_AVATARS.map((tpl: TemplateAvatar) => {
          const isSelected = selectedAvatar === tpl.url;
          return (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onSelectAvatar(tpl.url)}
              className={`group relative flex flex-col items-center gap-1 p-1 rounded-xl transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring-color shrink-0 ${
                isSelected
                  ? 'bg-accent-bg/10'
                  : 'hover:bg-bg-hover'
              }`}
              title={tpl.label}
              aria-label={`Select ${tpl.label} avatar`}
            >
              <div
                className={`relative w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden transition-all duration-150 ${
                  isSelected
                    ? 'ring-2 ring-accent-bg ring-offset-2 ring-offset-bg-panel scale-105 shadow-md'
                    : 'opacity-75 group-hover:opacity-100 group-hover:scale-105 ring-1 ring-border-color/60'
                }`}
              >
                <img
                  src={tpl.url}
                  alt={tpl.label}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isSelected && (
                  <div className="absolute inset-0 bg-accent-bg/25 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-accent-bg text-accent-text flex items-center justify-center shadow-sm">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] truncate max-w-[52px] leading-tight transition-colors ${
                  isSelected ? 'font-medium text-text-primary' : 'text-text-muted group-hover:text-text-secondary'
                }`}
              >
                {tpl.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
