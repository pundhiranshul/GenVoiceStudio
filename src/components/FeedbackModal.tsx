"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Video,
  BookOpen,
  Gamepad2,
  Briefcase,
  Bot,
  Sparkles,
  Check,
  ArrowRight,
  MessageSquareHeart,
  HelpCircle,
  ThumbsUp
} from "lucide-react";

export interface FeedbackModalProps {
  isOpen: boolean;
  trigger: "generation" | "exit" | "manual";
  autoSubmit: boolean;
  onClose: () => void;
  onSubmitSuccess?: (purpose: string) => void;
}

interface PurposeOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  {
    id: "content-creation",
    label: "Content Creation",
    description: "YouTube, TikTok, Reels, Podcasts & Voiceovers",
    icon: Video,
  },
  {
    id: "audiobooks",
    label: "Audiobooks & Narration",
    description: "Audiobooks, stories, documentaries & education",
    icon: BookOpen,
  },
  {
    id: "gaming",
    label: "Game Dev & Animation",
    description: "Character dialogue, NPCs & game cutscenes",
    icon: Gamepad2,
  },
  {
    id: "commercial",
    label: "Commercial & Marketing",
    description: "Product ads, brand promos & corporate videos",
    icon: Briefcase,
  },
  {
    id: "ai-agents",
    label: "AI Agents & Voicebots",
    description: "Conversational assistants, IVR & automated calls",
    icon: Bot,
  },
  {
    id: "personal",
    label: "Personal & Creative Fun",
    description: "Voice cloning, experimenting & creative hobbies",
    icon: Sparkles,
  },
];

export function FeedbackModal({
  isOpen,
  trigger,
  autoSubmit,
  onClose,
  onSubmitSuccess,
}: FeedbackModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSelectedId(null);
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting && !isSubmitted) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, isSubmitted, onClose]);

  if (!isOpen) return null;

  const handleRecordFeedback = async (purposeId: string) => {
    const selectedOption = PURPOSE_OPTIONS.find((opt) => opt.id === purposeId);
    const purposeLabel = selectedOption ? selectedOption.label : purposeId;

    setIsSubmitting(true);

    const feedbackPayload = {
      purpose: purposeLabel,
      purposeId,
      trigger,
      timestamp: new Date().toISOString(),
      username:
        typeof window !== "undefined"
          ? localStorage.getItem("kaggleUsername") || "anonymous"
          : "anonymous",
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("genvoice_feedback_submitted", JSON.stringify(feedbackPayload));
      localStorage.removeItem("genvoice_feedback_docked");
      window.dispatchEvent(new Event("feedback-submitted"));
    }

    // Send telemetry to backend (non-blocking)
    try {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackPayload),
      }).catch(() => {});
    } catch {
      // Ignore network errors
    }

    setIsSubmitted(true);
    if (onSubmitSuccess) onSubmitSuccess(purposeLabel);

    setTimeout(() => {
      onClose();
    }, 850);
  };

  const handleOptionClick = (id: string) => {
    if (isSubmitting || isSubmitted) return;
    setSelectedId(id);

    if (autoSubmit) {
      handleRecordFeedback(id);
    }
  };

  const handleManualSubmit = () => {
    if (!selectedId || isSubmitting || isSubmitted) return;
    handleRecordFeedback(selectedId);
  };

  const badgeText =
    trigger === "generation"
      ? "First Voice Generated 🎉"
      : trigger === "exit"
      ? "Quick Question 👋"
      : "GenVoice Feedback 💡";

  const titleText =
    trigger === "generation"
      ? "What are you creating with GenVoice?"
      : trigger === "exit"
      ? "Before you leave, what brought you here?"
      : "What purpose are you using GenVoice for?";

  const subtitleText = autoSubmit
    ? "Select an option below to help us tailor future voice models:"
    : "Select your primary use case below and click Submit to help shape upcoming features:";

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting && !isSubmitted) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-xl bg-bg-panel border border-border-color rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 sm:p-8 animate-in zoom-in-95 duration-200 relative"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button (dock into left panel) */}
        {!isSubmitted && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color cursor-pointer"
            aria-label="Close and dock feedback to left panel"
            title="Close (dock to sidebar)"
          >
            <X size={18} />
          </button>
        )}

        {/* Header */}
        <div className="flex flex-col items-start gap-2.5 mb-6 pr-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-bg/10 text-accent-bg border border-accent-bg/15">
            {badgeText}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {titleText}
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {subtitleText}
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {PURPOSE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedId === option.id;

            return (
              <button
                key={option.id}
                type="button"
                disabled={isSubmitting || isSubmitted}
                onClick={() => handleOptionClick(option.id)}
                className={`flex items-start gap-3.5 p-3.5 sm:p-4 rounded-2xl text-left transition-all border outline-none select-none cursor-pointer group ${
                  isSelected
                    ? "bg-accent-bg text-accent-text border-accent-bg shadow-md scale-[1.01]"
                    : "bg-bg-input text-text-primary border-border-color hover:border-accent-bg/40 hover:bg-bg-hover"
                } ${isSubmitting || isSubmitted ? "pointer-events-none" : ""}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "bg-accent-text/15 text-accent-text"
                      : "bg-bg-panel border border-border-color text-text-secondary group-hover:text-text-primary"
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs sm:text-sm truncate">
                      {option.label}
                    </span>
                    {isSelected && <Check size={14} className="shrink-0 animate-in zoom-in-50" />}
                  </div>
                  <p
                    className={`text-[11px] leading-tight line-clamp-2 mt-0.5 ${
                      isSelected ? "text-accent-text/80" : "text-text-muted"
                    }`}
                  >
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Success Banner (when submitted) */}
        {isSubmitted && (
          <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
            <ThumbsUp size={16} />
            <span>Thank you for your feedback! It helps us shape GenVoice.</span>
          </div>
        )}

        {/* Manual Submit Button (Only shown when autoSubmit is false) */}
        {!autoSubmit && !isSubmitted && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
            >
              Maybe later
            </button>
            <button
              type="button"
              disabled={!selectedId || isSubmitting}
              onClick={handleManualSubmit}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-sm ${
                selectedId
                  ? "bg-accent-bg text-accent-text hover:opacity-90 cursor-pointer"
                  : "bg-bg-input text-text-muted border border-border-color cursor-not-allowed opacity-60"
              }`}
            >
              <span>Submit Feedback</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
