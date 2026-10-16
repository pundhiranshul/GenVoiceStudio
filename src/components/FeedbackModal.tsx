"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Video,
  BookOpen,
  Gamepad2,
  Sparkles,
  Check,
  ArrowRight,
  Bug,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  Loader2,
  ThumbsUp,
} from "lucide-react";

export interface FeedbackModalProps {
  isOpen: boolean;
  trigger?: "generation" | "exit" | "manual" | "bug";
  mode?: "poll" | "report";
  initialCategory?: "bug" | "suggestion" | "other";
  autoSubmit?: boolean;
  onClose: () => void;
  onSubmitSuccess?: (result?: any) => void;
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
    description: "YouTube, podcasts & social media",
    icon: Video,
  },
  {
    id: "audiobooks",
    label: "Audiobooks & Narration",
    description: "Audiobooks, storytelling & education",
    icon: BookOpen,
  },
  {
    id: "gaming",
    label: "Gaming & Animation",
    description: "Character dialogue, NPCs & games",
    icon: Gamepad2,
  },
  {
    id: "personal",
    label: "Personal & Creative",
    description: "Voice cloning, experimenting & fun",
    icon: Sparkles,
  },
];

type ReportCategory = "bug" | "suggestion" | "other";

interface CategoryMeta {
  id: ReportCategory;
  label: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  placeholder: string;
  submitText: string;
}

const REPORT_CATEGORIES: CategoryMeta[] = [
  {
    id: "bug",
    label: "Report Bug",
    subtitle: "Encountered an issue or unexpected error",
    badge: "Bug Report",
    badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: Bug,
    placeholder: "What happened? Describe what you were doing, what went wrong, or error message...",
    submitText: "Submit Bug Report",
  },
  {
    id: "suggestion",
    label: "Suggestion",
    subtitle: "Ideas, feature requests, or enhancements",
    badge: "Feature Suggestion",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: Lightbulb,
    placeholder: "What would make GenVoice better? Describe your idea or feature request...",
    submitText: "Send Suggestion",
  },
  {
    id: "other",
    label: "Others",
    subtitle: "General feedback, thoughts, or questions",
    badge: "General Feedback",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    icon: MessageSquare,
    placeholder: "Tell us what's on your mind or share any thoughts...",
    submitText: "Send Feedback",
  },
];

export function FeedbackModal({
  isOpen,
  trigger = "manual",
  mode,
  initialCategory = "bug",
  autoSubmit = false,
  onClose,
  onSubmitSuccess,
}: FeedbackModalProps) {
  // Determine effective mode: if caller specified mode use it; otherwise poll for generation/exit triggers
  const initialMode = mode || (trigger === "generation" || trigger === "exit" ? "poll" : "report");
  const [activeMode, setActiveMode] = useState<"poll" | "report">(initialMode);

  // Poll state
  const [selectedPurposeId, setSelectedPurposeId] = useState<string | null>(null);

  // Report state
  const [category, setCategory] = useState<ReportCategory>(initialCategory);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [currentPage, setCurrentPage] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Sync mode and category whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const targetMode = mode || (trigger === "generation" || trigger === "exit" ? "poll" : "report");
      setActiveMode(targetMode);
      setCategory(initialCategory || "bug");
      setSelectedPurposeId(null);
      setMessage("");
      setEmail("");
      setIsSubmitting(false);
      setIsSubmitted(false);
      setSubmitError(null);
      setIsCategoryOpen(false);

      if (typeof window !== "undefined") {
        setCurrentPage(window.location.pathname || "/");
      }
    }
  }, [isOpen, mode, trigger, initialCategory]);

  // Close category dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    if (isCategoryOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCategoryOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCategoryOpen) {
          setIsCategoryOpen(false);
        } else if (!isSubmitting) {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isCategoryOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const currentCategoryMeta =
    REPORT_CATEGORIES.find((c) => c.id === category) || REPORT_CATEGORIES[0];
  const CategoryIcon = currentCategoryMeta.icon;

  // Handler for submitting Purpose Poll
  const handleRecordPurposePoll = async (purposeId: string) => {
    const selectedOption = PURPOSE_OPTIONS.find((opt) => opt.id === purposeId);
    const purposeLabel = selectedOption ? selectedOption.label : purposeId;

    setIsSubmitting(true);
    setSubmitError(null);

    const feedbackPayload = {
      type: "poll",
      category: "Purpose Poll",
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

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackPayload),
      });
    } catch {
      // Non-blocking telemetry
    }

    setIsSubmitted(true);
    if (onSubmitSuccess) onSubmitSuccess(purposeLabel);

    setTimeout(() => {
      onClose();
    }, 900);
  };

  // Handler for submitting Bug Report / Suggestion / Other
  const handleSubmitReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload = {
      type: category,
      category: currentCategoryMeta.label,
      message: message.trim(),
      email: email.trim(),
      page: currentPage || (typeof window !== "undefined" ? window.location.pathname : "/"),
      trigger: trigger || (category === "bug" ? "bug" : "manual"),
      timestamp: new Date().toISOString(),
      username:
        typeof window !== "undefined"
          ? localStorage.getItem("kaggleUsername") || "anonymous"
          : "anonymous",
    };

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to send report. Please try again.");
      }

      setIsSubmitted(true);
      if (onSubmitSuccess) onSubmitSuccess(payload);

      // Auto close after brief acknowledgment
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit. Please check your connection.");
      setIsSubmitting(false);
    }
  };

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
        {/* Close Button */}
        {!isSubmitted && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-text-muted hover:text-text-primary hover:bg-bg-hover rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color cursor-pointer z-10"
            aria-label="Close dialog"
            title="Close"
          >
            <X size={18} />
          </button>
        )}

        {/* ========================================================
            MODE: REPORT / SUGGESTION / OTHER (Default Bug Reporter)
           ======================================================== */}
        {activeMode === "report" && (
          <div>
            {isSubmitted ? (
              <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center mb-4">
                  <ThumbsUp size={28} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Thank You
                </h3>
                <p className="text-sm text-text-secondary max-w-sm leading-relaxed mb-6">
                  {category === "bug"
                    ? "Your bug report has been submitted."
                    : category === "suggestion"
                    ? "Your suggestion has been submitted."
                    : "Your feedback has been submitted."}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-accent-bg text-accent-text hover:opacity-90 font-medium text-sm transition-all shadow-sm"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex flex-col items-start gap-1 pr-8">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                    Report an Issue or Suggestion
                  </h2>
                </div>

                {/* Dropdown to pick category: Report Bug, Suggestion, Others */}
                <div className="flex flex-col gap-1.5" ref={categoryDropdownRef}>
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Category
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-color hover:border-border-color/80 text-text-primary text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-bg-panel border border-border-color/50 flex items-center justify-center shrink-0">
                          <CategoryIcon size={14} className="text-text-primary" />
                        </div>
                        <span className="truncate">{currentCategoryMeta.label}</span>
                        <span className="text-xs text-text-muted hidden sm:inline truncate">
                          — {currentCategoryMeta.subtitle}
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`text-text-muted transition-transform shrink-0 ${
                          isCategoryOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Custom site-styled dropdown menu */}
                    {isCategoryOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-bg-panel border border-border-color rounded-2xl shadow-2xl p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                        {REPORT_CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.id;

                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setCategory(cat.id);
                                setIsCategoryOpen(false);
                              }}
                              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                                isSelected
                                  ? "bg-accent-bg/15 text-accent-text font-medium"
                                  : "text-text-primary hover:bg-bg-hover"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                    isSelected
                                      ? "bg-accent-bg/25 text-accent-text"
                                      : "bg-bg-input border border-border-color text-text-muted"
                                  }`}
                                >
                                  <Icon size={14} />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs sm:text-sm font-semibold truncate leading-tight">
                                    {cat.label}
                                  </span>
                                  <span className="text-[11px] text-text-muted truncate">
                                    {cat.subtitle}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={15} className="shrink-0 text-accent-text" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Textarea */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                      {category === "bug"
                        ? "Bug Description"
                        : category === "suggestion"
                        ? "Suggestion Details"
                        : "Message"}{" "}
                      <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px] text-text-muted">
                      {message.length} / 5000
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    maxLength={5000}
                    value={message}
                    disabled={isSubmitting}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={currentCategoryMeta.placeholder}
                    className="w-full h-28 px-3.5 py-3 rounded-xl bg-bg-input border border-border-color text-text-primary placeholder:text-text-muted text-sm leading-relaxed resize-none outline-none focus:border-accent-bg focus:ring-1 focus:ring-accent-bg transition-colors"
                  />
                </div>

                {/* Email (Optional) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    Contact Email <span className="text-text-muted font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    disabled={isSubmitting}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com (if you'd like follow-up)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-bg-input border border-border-color text-text-primary placeholder:text-text-muted text-sm outline-none focus:border-accent-bg focus:ring-1 focus:ring-accent-bg transition-colors"
                  />
                </div>

                {/* Error Banner if submit fails */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    {submitError}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-subtle mt-1">
                  <div className="flex items-center gap-2 text-[11px] text-text-muted truncate">
                    {currentPage && (
                      <span className="px-2 py-0.5 rounded-md bg-bg-input border border-border-color truncate">
                        Page: {currentPage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={onClose}
                      className="h-10 px-4 rounded-xl text-xs sm:text-sm text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer flex items-center justify-center"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!message.trim() || isSubmitting}
                      className={`h-10 flex items-center gap-2 px-5 rounded-xl text-xs sm:text-sm font-semibold border transition-colors shadow-sm ${
                        message.trim() && !isSubmitting
                          ? "bg-accent-bg text-accent-text border-transparent hover:opacity-90 cursor-pointer"
                          : "bg-bg-input text-text-muted border-border-color cursor-not-allowed opacity-60"
                      }`}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>{currentCategoryMeta.submitText}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            MODE: POLL (First Voice Generation / Exit Intent Poll)
           ======================================================== */}
        {activeMode === "poll" && (
          <div>
            {/* Header */}
            <div className="flex flex-col items-start gap-2.5 mb-6 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-bg/10 text-accent-bg border border-accent-bg/15">
                {trigger === "generation"
                  ? "First Voice Generated"
                  : trigger === "exit"
                  ? "Quick Question"
                  : "GenVoice Feedback"}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
                {trigger === "generation"
                  ? "What are you creating with GenVoice?"
                  : trigger === "exit"
                  ? "Before you leave, what brought you here?"
                  : "What purpose are you using GenVoice for?"}
              </h2>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                {autoSubmit
                  ? "Select an option below to help us tailor future voice models:"
                  : "Select your primary use case below and click Submit to help shape upcoming features:"}
              </p>
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
              {PURPOSE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedPurposeId === option.id;

                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSubmitting || isSubmitted}
                    onClick={() => {
                      if (isSubmitting || isSubmitted) return;
                      setSelectedPurposeId(option.id);
                      if (autoSubmit) {
                        handleRecordPurposePoll(option.id);
                      }
                    }}
                    className={`flex items-start gap-3.5 p-4 rounded-2xl text-left transition-all border outline-none select-none cursor-pointer group ${
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
                        <span
                          className={`font-semibold text-xs sm:text-sm leading-snug ${
                            isSelected ? "text-accent-text" : "text-text-primary"
                          }`}
                        >
                          {option.label}
                        </span>
                        {isSelected && <Check size={14} className="shrink-0 text-accent-text animate-in zoom-in-50" />}
                      </div>
                      <p
                        className={`text-xs leading-normal mt-1 ${
                          isSelected ? "text-accent-text/85" : "text-text-muted"
                        }`}
                      >
                        {option.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Success Banner */}
            {isSubmitted && (
              <div className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom-2">
                <ThumbsUp size={16} />
                <span>Thank you for your feedback! It helps us shape GenVoice.</span>
              </div>
            )}

            {/* Manual Submit Button / Switcher */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border-subtle mt-1">
              <button
                type="button"
                onClick={() => setActiveMode("report")}
                className="text-xs text-text-muted hover:text-accent-bg transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Bug size={13} />
                <span>Need to report a bug or suggest a feature?</span>
              </button>

              {!autoSubmit && !isSubmitted && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-4 rounded-xl text-xs sm:text-sm text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer flex items-center justify-center"
                  >
                    Maybe later
                  </button>
                  <button
                    type="button"
                    disabled={!selectedPurposeId || isSubmitting}
                    onClick={() => {
                      if (selectedPurposeId) handleRecordPurposePoll(selectedPurposeId);
                    }}
                    className={`h-10 flex items-center gap-2 px-5 rounded-xl text-xs sm:text-sm font-medium border transition-colors shadow-sm ${
                      selectedPurposeId
                        ? "bg-accent-bg text-accent-text border-transparent hover:opacity-90 cursor-pointer"
                        : "bg-bg-input text-text-muted border-border-color cursor-not-allowed opacity-60"
                    }`}
                  >
                    <span>Submit</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
