"use client";

import { useState, useRef, useEffect } from "react";
import { get, set } from "idb-keyval";
import { Sparkles, Terminal, Settings2, Shield, Loader2, Square, Wand2, Moon, Sun, Info, X, Key, Copy, Check, Bug, Download, User, ArrowLeft, Mic, ChevronDown, Menu, AudioLines, LayoutTemplate } from 'lucide-react';
import { VoiceSelector, Voice } from "@/components/VoiceSelector";
import { AudioPlayer } from "@/components/AudioPlayer";
import { stitchChunks } from "@/utils/audioEditor";
import { VOCAL_TAGS, AUDIO_TAGS_STRING } from "@/utils/audioTags";

const GenVoiceLogo = ({ size = 24, className = "", animate = false }) => {
  const getEqClass = (y: number) => {
    if (!animate) return "";
    if (y <= 26) return "animate-eq-5";
    if (y <= 36) return "animate-eq-4";
    if (y <= 46) return "animate-eq-3";
    if (y <= 56) return "animate-eq-2";
    if (y <= 66) return "animate-eq-1";
    return "";
  };

  const getDelay = (x: number, y: number) => {
    return `${((x * 13 + y * 17) % 10) * 0.1}s`;
  };

  const Block = ({ x, y, w, h, fill }: { x: number, y: number, w: number, h: number, fill: string }) => (
    <rect 
      x={x} y={y} width={w} height={h} rx="4" fill={fill}
      className={getEqClass(y)} 
      style={animate ? { animationDelay: getDelay(x, y) } : {}} 
    />
  );

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <rect x="2" y="2" width="96" height="96" rx="16" fill="#F8F3E9" stroke="#C2BFD0" strokeWidth="4" />
      
      {/* Wavy animated background lines */}
      <g className={animate ? "animate-wave-1" : ""}>
        <path d="M 2 70 Q 20 50, 40 70 T 70 70 T 98 70" stroke="#FDE39A" strokeWidth="0.5" fill="none" opacity="0.8" />
      </g>
      <g className={animate ? "animate-wave-2" : ""}>
        <path d="M 2 60 Q 30 30, 50 70 T 80 50 T 98 60" stroke="#99D6F3" strokeWidth="0.5" fill="none" opacity="0.6" />
      </g>
      <g className={animate ? "animate-wave-3" : ""}>
        <path d="M 2 50 Q 20 80, 50 40 T 90 70 T 98 50" stroke="#F89397" strokeWidth="0.5" fill="none" opacity="0.4" />
      </g>
      <g className={animate ? "animate-wave-4" : ""}>
        <path d="M 2 65 Q 15 45, 30 65 T 60 45 T 98 65" stroke="#AFAAB9" strokeWidth="0.5" fill="none" opacity="0.5" />
      </g>

      {/* Left Column (Straight) */}
      <Block x={22} y={36} w={14} h={8} fill="#A6C1A9" />
      <Block x={22} y={46} w={14} h={8} fill="#ACDEB8" />
      <Block x={22} y={56} w={14} h={8} fill="#CFE98F" />
      <Block x={22} y={66} w={14} h={8} fill="#A5D6EE" />
      <Block x={22} y={76} w={14} h={8} fill="#8FBEEC" />

      {/* Center Column */}
      <Block x={43} y={26} w={14} h={8} fill="#D78B95" />
      <Block x={43} y={36} w={14} h={8} fill="#E1A2AA" />
      <Block x={43} y={46} w={14} h={8} fill="#ECA194" />
      <Block x={43} y={56} w={14} h={8} fill="#EEAF81" />
      <Block x={43} y={66} w={14} h={8} fill="#F4CD83" />
      <Block x={43} y={76} w={14} h={8} fill="#F9E493" />

      {/* Right Column (Straight) */}
      <Block x={64} y={36} w={14} h={8} fill="#A6C1A9" />
      <Block x={64} y={46} w={14} h={8} fill="#ACDEB8" />
      <Block x={64} y={56} w={14} h={8} fill="#CFE98F" />
      <Block x={64} y={66} w={14} h={8} fill="#A5D6EE" />
      <Block x={64} y={76} w={14} h={8} fill="#8FBEEC" />
    </svg>
  );
};

// ── constants & helpers ────────────────────────────────────────────
const CHUNK_THRESHOLD = 600;

const AVAILABLE_AI_MODELS = [
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

type AppStatus = "idle" | "generating" | "complete" | "error";
type AudioFile = { name: string; data: string };
type CustomVoice = { id: string; name: string; data: string; transcript: string; isPreset?: boolean; };

const PRESET_VOICES: CustomVoice[] = [
  { id: "el_v3_15", name: "Ellen - Serious, Direct and Confident", data: "/presets/el_15.mp3", transcript: "Freedom kindles the flames of hope in every heart.", isPreset: true },
  { id: "el_v3_16", name: "James - Husky, Engaging and Bold", data: "/presets/el_16.mp3", transcript: "Cleanliness is the key to a healthy, happy life.", isPreset: true },
  { id: "el_v3_17", name: "Amy - Natural and Sweet", data: "/presets/el_17.mp3", transcript: "Life can be funny sometimes with all the hills and valleys, but without the lows, you'd never get to experience the highs.", isPreset: true },
  { id: "el_v3_18", name: "Juniper - Grounded and Professional", data: "/presets/el_18.mp3", transcript: "Hey everybody. This is Juniper. I think I would be a great choice for your podcast. I'm pretty laid back. I'm pretty casual. Give me a try.", isPreset: true },
  { id: "el_v3_19", name: "Mark - Natural Conversations", data: "/presets/el_19.mp3", transcript: "I think this is a really nice way to just talk naturally together, you know? Talk plainly. Let's give it a shot.", isPreset: true },
  { id: "el_v3_20", name: "Arabella - Mysterious and Emotive", data: "/presets/el_20.mp3", transcript: "The people who are crazy enough to think they can change the world are the ones who do.", isPreset: true },
  { id: "el_v3_21", name: "Jane - Professional Audiobook Reader", data: "/presets/el_21.mp3", transcript: "Hello, I'm Jane. A great voice for any form of narration where you need a strong, older female voice.", isPreset: true },
  { id: "el_v3_22", name: "Hope - upbeat and clear", data: "/presets/el_22.mp3", transcript: "Hey, are you looking for a fresh and engaging voice for your podcast or social media? Then I'm the voice for you.", isPreset: true },
  { id: "el_v3_0", name: "Roger - Confident and Deep", data: "/presets/el_0.wav", transcript: "It is not so important to know everything as to appreciate what we learn.", isPreset: true },
  { id: "el_v3_1", name: "Charlie - Friendly and Conversational", data: "/presets/el_1.wav", transcript: "Love all, trust a few, do wrong to none.", isPreset: true },
  { id: "el_v3_2", name: "George - Warm and Authoritative", data: "/presets/el_2.wav", transcript: "God has given you one face, and you make yourself another.", isPreset: true },
  { id: "el_v3_3", name: "Callum - Smooth and Engaging", data: "/presets/el_3.wav", transcript: "Life without love is like a tree without blossoms or fruit.", isPreset: true },
  { id: "el_v3_4", name: "River - Calm and Neutral", data: "/presets/el_4.wav", transcript: "Nature is a mutable cloud which is always and never the same.", isPreset: true },
  { id: "el_v3_5", name: "Harry - Bright and Energetic", data: "/presets/el_5.wav", transcript: "Friends show their love in times of trouble, not in happiness.", isPreset: true },
  { id: "el_v3_6", name: "Liam - Strong and Articulate", data: "/presets/el_6.wav", transcript: "Life isn't about finding yourself. Life is about creating yourself.", isPreset: true },
  { id: "el_v3_7", name: "Alice - Soft and Sweet", data: "/presets/el_7.wav", transcript: "Just trust yourself, then you will know how to live.", isPreset: true },
  { id: "el_v3_8", name: "Matilda - Warm and Expressive", data: "/presets/el_8.wav", transcript: "Ideas are the beginning points of all fortunes.", isPreset: true },
  { id: "el_v3_9", name: "Jessica - Bright and Professional", data: "/presets/el_9.wav", transcript: "If you spend your whole life waiting for the storm, you'll never enjoy the sunshine.", isPreset: true },
  { id: "el_v3_10", name: "Eric - Deep and Resonant", data: "/presets/el_10.wav", transcript: "Gratitude is riches. Complaint is poverty.", isPreset: true },
  { id: "el_v3_11", name: "Bella - Clear and Engaging", data: "/presets/el_11.wav", transcript: "In the theater of life, we are all actors sharing the same scene.", isPreset: true },
  { id: "el_v3_12", name: "Chris - Friendly and Upbeat", data: "/presets/el_12.wav", transcript: "A single rose can be my garden... a single friend, my world.", isPreset: true },
  { id: "el_v3_13", name: "Brian - Professional and Trustworthy", data: "/presets/el_13.wav", transcript: "The thing always happens that you really believe in; and the belief in a thing makes it happen.", isPreset: true },
  { id: "el_v3_14", name: "Daniel - Calm and Authoritative", data: "/presets/el_14.wav", transcript: "The world is round, and the place which may seem like the end may also be the beginning.", isPreset: true }
];

function niceName(f: string) {
  if (f.includes("reference")) return "Reference Voice";
  if (f.includes("single"))    return "Generated Output";
  if (f.includes("chunked"))   return "Stitched Output";
  const m = f.match(/chunk_(\d+)/);
  if (m) return `Chunk ${parseInt(m[1]) + 1}`;
  return f;
}
function getDownloadFilename(f: string) {
  if (f.includes("reference")) return "GenVoice_Reference.wav";
  if (f.includes("single") || f.includes("chunked")) return "GenVoice_Final.wav";
  const m = f.match(/chunk_(\d+)/);
  if (m) return `GenVoice_Chunk_${m[1]}.wav`;
  return f;
}
function getCategory(f: string) {
  if (f.includes("reference")) return "reference";
  if (f.includes("single") || f.includes("chunked")) return "final";
  return "chunk";
}
function fmtEta(s: number) {
  if (s <= 0) return "<1s";
  if (s < 60)  return `~${Math.round(s)}s`;
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return r ? `~${m}m ${r}s` : `~${m}m`;
}

const PANGRAMS = [
  "The quick brown fox jumps over the lazy dog.",
  "Pack my box with five dozen liquor jugs.",
  "Sphinx of black quartz, judge my vow.",
  "How vexingly quick daft zebras jump.",
  "A wizard's job is to vex chumps quickly in fog.",
  "Heavy boxes perform quick waltzes and jigs."
];

const getWelcomeMessages = (name: string) => [
  `What do you want to say today, ${name}?`,
  `Ready to create some audio, ${name}?`,
  `Hey ${name}, let's synthesize something awesome!`,
  `Welcome back, ${name}. What's on your mind?`,
  `Hello ${name}, what shall we voice today?`,
  `${name}, the mic is yours! What's the script?`,
  `Good to see you, ${name}. Type your text here...`,
  `Hey ${name}, what story are we telling today?`,
  `Let's make some noise, ${name}! What's the plan?`,
  `Waiting for your input, ${name}...`,
  `Unleash your creativity, ${name}. What's next?`,
  `Type something magical, ${name}...`,
  `The studio is yours, ${name}. What are we saying?`,
  `What's the script for today, ${name}?`,
  `Hey ${name}, your audience is waiting...`,
  `Ready when you are, ${name}. Let's go!`,
  `${name}'s Studio Session: What's the first line?`,
  `Let's hear it, ${name}! Type your text here.`,
  `Welcome ${name}! What are we working on?`,
  `Greetings ${name}! What text should I read?`
];

const DEFAULT_WELCOME_MESSAGES = [
  "What do you want to say today?",
  "Ready to create some audio?",
  "Let's synthesize something awesome!",
  "Welcome back. What's on your mind?",
  "Hello, what shall we voice today?",
  "The mic is yours! What's the script?",
  "Good to see you. Type your text here...",
  "What story are we telling today?",
  "Let's make some noise! What's the plan?",
  "Waiting for your input...",
  "Unleash your creativity. What's next?",
  "Type something magical...",
  "The studio is yours. What are we saying?",
  "What's the script for today?",
  "Your audience is waiting...",
  "Ready when you are. Let's go!",
  "Studio Session: What's the first line?",
  "Let's hear it! Type your text here.",
  "Welcome! What are we working on?",
  "Greetings! What text should I read?"
];

// ── Custom Model Select Component ─────────────────────────────────
const CustomModelSelect = ({ value, onChange, options, className = "" }: { value: string, onChange: (val: string) => void, options: string[], className?: string }) => {
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
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''} text-text-muted`} />
      </button>

      {isOpen && (
        <div className="absolute z-[100] mt-1 max-h-64 w-56 right-0 overflow-y-auto overflow-x-hidden overscroll-contain rounded-lg bg-bg-panel border border-border-color shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border-subtle mb-1 bg-bg-panel sticky top-0 z-10">
            Sorted: Lowest to Highest Cost
          </div>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-bg-hover ${opt === value ? 'bg-accent-bg/10 text-accent-bg font-semibold' : 'text-text-secondary'}`}
              onClick={() => { onChange(opt); setIsOpen(false); }}
            >
              {opt.split('/').pop()}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── main ───────────────────────────────────────────────────────────
export default function Home() {
  const [isDark, setIsDark]         = useState(true);
  const [showSplash, setShowSplash] = useState(false);
  const [hasCredentials, setHasCredentials] = useState(false);
  const [canCancelAuth, setCanCancelAuth] = useState(false);
  const [authMode, setAuthMode]   = useState<'byok' | 'admin'>('byok');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyScreen, setVerifyScreen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'pending' | 'internet' | 'gpu' | 'success' | 'error'>('pending');
  const [verifyError, setVerifyError] = useState("");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const [password, setPassword]   = useState("");
  const [kaggleUsername, setKaggleUsername] = useState("");
  const [kaggleKey, setKaggleKey] = useState("");
  const [modelProxyKey, setModelProxyKey] = useState("");
  const [modelProxyExpiresAt, setModelProxyExpiresAt] = useState("");
  const [text, setText] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("voice_text") || "" : "");
  useEffect(() => { sessionStorage.setItem("voice_text", text); }, [text]);
  const [status, setStatus]       = useState<AppStatus>("idle");
  const [message, setMessage]     = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("What do you want to say?");
  const [audios, setAudios]       = useState<AudioFile[]>([]);
  const audiosRef                 = useRef<AudioFile[]>([]);
  const [showLogs, setShowLogs]   = useState(false);
  const [logs, setLogs]           = useState<string[]>([]);

  const [chunks, setChunks]         = useState<string[]>([]);
  const [chunksDone, setChunksDone] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [cellsDone, setCellsDone]   = useState(0);
  const [cellsTotal, setCellsTotal] = useState(0);
  const [isLongMode, setIsLongMode] = useState(false);
  const [eta, setEta]               = useState("");
  const [chunkTrims, setChunkTrims] = useState<number[]>([]);
  const [chunkTrimModes, setChunkTrimModes] = useState<('crossfade' | 'trim')[]>([]);

  const [stitchedAudioUrl, setStitchedAudioUrl] = useState<string | null>(null);
  const [isStitching, setIsStitching] = useState(false);

  const [instructions, setInstructions] = useState("");
  const [designPrompt, setDesignPrompt] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("voice_design_prompt") || "" : "");
  useEffect(() => { sessionStorage.setItem("voice_design_prompt", designPrompt); }, [designPrompt]);
  const [generatedPreviewText, setGeneratedPreviewText] = useState("");
  const [isVoiceSaved, setIsVoiceSaved] = useState(false);
  const [guidanceScale, setGuidanceScale] = useState(2);
  const [isOptimizingDesign, setIsOptimizingDesign] = useState(false);
  const [optimizeDesignError, setOptimizeDesignError] = useState("");
  const [showWriteDesignModal, setShowWriteDesignModal] = useState(false);
  const [writeDesignTopic, setWriteDesignTopic] = useState("");
  const [isWritingDesign, setIsWritingDesign] = useState(false);
  const [writeDesignError, setWriteDesignError] = useState("");

  const [generationMode, setGenerationMode] = useState<'clone' | 'design'>('clone');
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("el_v3_15"); // Ellen as default
  const allVoices = [...PRESET_VOICES, ...customVoices];

  const [showUpload, setShowUpload] = useState(false);
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceText, setNewVoiceText] = useState("");
  const [newVoiceFile, setNewVoiceFile] = useState<File | null>(null);

  const [copiedText, setCopiedText] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  
  // AI Story Gen State
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [storyTopic, setStoryTopic] = useState("");
  const [storyTone, setStoryTone] = useState("Dramatic");
  const [customTone, setCustomTone] = useState("");
  const [storyLength, setStoryLength] = useState("Short (~100 words)");
  const [customLength, setCustomLength] = useState("");
  const [isStoryGen, setIsStoryGen] = useState(false);
  const [storyError, setStoryError] = useState("");

  // AI Optimize State
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState("");

  const [aiModel, setAiModel] = useState("google/gemini-3.7-flash");

  // AI Recommend Voices State
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [recommendedVoices, setRecommendedVoices] = useState<{id: string, name: string, reason: string}[]>([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recommendError, setRecommendError] = useState("");
  
  const [uploadError, setUploadError] = useState("");

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppedRef = useRef(false);

  const stopRun = () => {
    setShowStopModal(true);
  };

  const insertTag = (tag: string) => {
    if (!textAreaRef.current) return;
    const el = textAreaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const charBefore = start > 0 ? el.value[start - 1] : '';
    const charAfter = end < el.value.length ? el.value[end] : '';
    const prepend = charBefore && charBefore !== ' ' && charBefore !== '\n' ? ' ' : '';
    const append = charAfter !== ' ' && charAfter !== '\n' ? ' ' : '';
    const insertStr = `${prepend}${tag}${append}`;
    
    const newText = el.value.substring(0, start) + insertStr + el.value.substring(end);
    const newCursorPos = start + insertStr.length;
    
    setText(newText);
    
    // Use timeout to allow React to render the new text before setting the cursor
    setTimeout(() => {
      if (textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copyAllTags = () => {
    const allTags = VOCAL_TAGS.flatMap(cat => cat.tags).join(', ');
    navigator.clipboard.writeText(allTags);
    setCopiedTags(true);
    setTimeout(() => setCopiedTags(false), 2000);
  };

  const handleSaveVoice = async (src: string) => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], "designed_voice.wav", { type: blob.type || "audio/wav" });
      setNewVoiceFile(file);
      setNewVoiceText(generatedPreviewText || text);
      const activePrompt = true ? designPrompt : instructions;
      setNewVoiceName(activePrompt ? activePrompt.substring(0, 30) + "..." : "New Custom Voice"); 
      setUploadError("");
      setShowUpload(true);
    } catch (e) {
      console.error("Failed to save voice:", e);
    }
  };

  const handleDeleteVoice = async (id: string) => {
    const updated = customVoices.filter(v => v.id !== id);
    setCustomVoices(updated);
    await set('custom_voices', updated);
    if (selectedVoiceId === id) {
      setSelectedVoiceId("el_v3_15");
    }
  };

  useEffect(() => {
    get('custom_voices').then(val => {
      if (val) setCustomVoices(val);
    });

    const storedUsername = localStorage.getItem('kaggleUsername');
    const storedKey = localStorage.getItem('kaggleKey');
    const storedPass = localStorage.getItem('appPassword');
    const storedProxyKey = localStorage.getItem('modelProxyKey');
    const storedProxyExpires = localStorage.getItem('modelProxyExpiresAt');
    const storedAiModel = localStorage.getItem('aiModel');
    
    if (storedUsername) setKaggleUsername(storedUsername);
    if (storedKey) setKaggleKey(storedKey);
    if (storedPass) setPassword(storedPass);
    if (storedProxyKey) setModelProxyKey(storedProxyKey);
    if (storedProxyExpires) setModelProxyExpiresAt(storedProxyExpires);
    if (storedAiModel && AVAILABLE_AI_MODELS.includes(storedAiModel)) setAiModel(storedAiModel);

    if ((storedUsername && storedKey) || storedPass) {
      setHasCredentials(true);
    }

    // Splash screen removed — navigation is now instant
    
    // Initialize theme based on document class
    setIsDark(document.documentElement.classList.contains('dark'));
    
    return () => {
    };
  }, []);

  useEffect(() => {
    if (hasCredentials) {
      const messages = kaggleUsername ? getWelcomeMessages(kaggleUsername) : DEFAULT_WELCOME_MESSAGES;
      setWelcomeMessage(messages[Math.floor(Math.random() * messages.length)]);
    }
  }, [kaggleUsername, hasCredentials]);

  
  const handleOptimizeDesignPrompt = async () => {
    if (!designPrompt.trim()) return;
    setIsOptimizingDesign(true);
    setOptimizeDesignError("");
    try {
      const payload: any = {
        text: designPrompt,
        instruction: "Optimize this prompt for Voice Design. Enhance it by adding descriptive words about the age, gender, accent, tone, and character. Keep it under 2 sentences.",
        aiModel: typeof AVAILABLE_AI_MODELS !== 'undefined' ? AVAILABLE_AI_MODELS[0] : 'openai/gpt-4o'
      };
      const pass = localStorage.getItem('appPassword');
      if (pass) {
        payload.password = pass;
      } else {
        payload.username = kaggleUsername;
        payload.key = kaggleKey;
      }
      const mKey = localStorage.getItem('modelProxyKey');
      const mExp = localStorage.getItem('modelProxyExpiresAt');
      if (mKey && mExp) {
        payload.modelProxyKey = mKey;
        payload.modelProxyExpiresAt = mExp;
      }
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to optimize prompt");
      if (data.modelProxyKey && data.modelProxyExpiresAt) {
        localStorage.setItem('modelProxyKey', data.modelProxyKey);
        localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
      }
      setDesignPrompt(data.optimizedText);
    } catch (err: any) {
      setOptimizeDesignError(err.message);
    } finally {
      setIsOptimizingDesign(false);
    }
  };

  const handleWriteDesignPrompt = async () => {
    if (!writeDesignTopic.trim()) return;
    setIsWritingDesign(true);
    setWriteDesignError("");
    try {
      const payload: any = {
        text: writeDesignTopic,
        instruction: "You are an expert voice actor casting director. Write a highly detailed Voice Design instruction prompt based on the user's premise. Describe the age, gender, accent, tone, and character. Just output the prompt itself, nothing else. Keep it under 2 sentences.",
        aiModel: typeof AVAILABLE_AI_MODELS !== 'undefined' ? AVAILABLE_AI_MODELS[0] : 'openai/gpt-4o'
      };
      const pass = localStorage.getItem('appPassword');
      if (pass) {
        payload.password = pass;
      } else {
        payload.username = kaggleUsername;
        payload.key = kaggleKey;
      }
      const mKey = localStorage.getItem('modelProxyKey');
      const mExp = localStorage.getItem('modelProxyExpiresAt');
      if (mKey && mExp) {
        payload.modelProxyKey = mKey;
        payload.modelProxyExpiresAt = mExp;
      }
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to write prompt");
      if (data.modelProxyKey && data.modelProxyExpiresAt) {
        localStorage.setItem('modelProxyKey', data.modelProxyKey);
        localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
      }
      setDesignPrompt(data.optimizedText);
      setShowWriteDesignModal(false);
    } catch (err: any) {
      setWriteDesignError(err.message);
    } finally {
      setIsWritingDesign(false);
    }
  };

  const toggleTheme = () => {
    if (document.documentElement.classList.contains('dark')) {
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  };

  const startRef      = useRef<number | null>(null);
  const firstChunkRef = useRef<number | null>(null);
  const logsEndRef    = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) =>
    setLogs(p => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const handleDownloadZip = async () => {
    if (audiosRef.current.length === 0) return;
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const chunksToDownload = audiosRef.current.filter(a => a.name.includes("chunk"));
    chunksToDownload.forEach(audio => {
      const base64Data = audio.data.split(',')[1];
      zip.file(audio.name, base64Data, { base64: true });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'genvoice_chunks.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!chunksDone || !chunksTotal) return;
    if (!firstChunkRef.current) firstChunkRef.current = Date.now();
    const elapsed = (Date.now() - firstChunkRef.current) / 1000;
    setEta(fmtEta((elapsed / chunksDone) * (chunksTotal - chunksDone)));
  }, [chunksDone, chunksTotal]);



  const handleOptimizeScript = async () => {
    if (!text.trim() || (!password && (!kaggleUsername || !kaggleKey))) return;
    setIsOptimizing(true);
    setOptimizeError("");
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          instruction: optimizeInstruction,
          password,
          username: kaggleUsername, 
          key: kaggleKey,
          modelProxyKey,
          modelProxyExpiresAt,
          aiModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.success && data.optimizedText) {
        setText(data.optimizedText);
        setShowOptimizeModal(false);
        setOptimizeInstruction("");
        if (data.modelProxyKey && data.modelProxyExpiresAt) {
          setModelProxyKey(data.modelProxyKey);
          setModelProxyExpiresAt(data.modelProxyExpiresAt);
          localStorage.setItem('modelProxyKey', data.modelProxyKey);
          localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
        }
      }
    } catch (e: any) {
      setOptimizeError("Failed to optimize script: " + e.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRecommendVoices = async () => {
    if (!text.trim() || (!password && (!kaggleUsername || !kaggleKey))) return;
    setIsRecommending(true);
    setRecommendError("");
    try {
      const res = await fetch('/api/voicerecommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text, 
          voices: allVoices,
          password,
          username: kaggleUsername, 
          key: kaggleKey,
          modelProxyKey,
          modelProxyExpiresAt,
          aiModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.success && data.recommendations) {
        setRecommendedVoices(data.recommendations);
        setShowRecommendModal(true);
        if (data.modelProxyKey && data.modelProxyExpiresAt) {
          setModelProxyKey(data.modelProxyKey);
          setModelProxyExpiresAt(data.modelProxyExpiresAt);
          localStorage.setItem('modelProxyKey', data.modelProxyKey);
          localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
        }
      }
    } catch (e: any) {
      setRecommendError("Failed to get recommendations: " + e.message);
    } finally {
      setIsRecommending(false);
    }
  };

  const handleStoryGenerate = async () => {
    if (!storyTopic.trim() || (!password && (!kaggleUsername || !kaggleKey))) return;
    setIsStoryGen(true);
    setStoryError("");
    
    const finalLength = storyLength === "Custom" ? customLength : storyLength;
    const finalTone = storyTone === "Custom" ? customTone : storyTone;
    
    const prompt = `Write a ${finalLength} story about ${storyTopic} with a ${finalTone} tone. The story MUST be written as a spoken script for a single narrator. CRITICAL: You must include vocal expressions naturally throughout the script to add emotion. Valid tags are: ${AUDIO_TAGS_STRING}. Do NOT output any title, markdown formatting, or introductory text. Just the script.`;
    
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          password,
          username: kaggleUsername, 
          key: kaggleKey,
          modelProxyKey,
          modelProxyExpiresAt,
          aiModel
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.success && data.story) {
        setText(data.story);
        setIsStoryGen(false);
        setShowStoryModal(false);
        setStoryTopic("");
        
        // Save the minted token if returned
        if (data.modelProxyKey && data.modelProxyExpiresAt) {
          setModelProxyKey(data.modelProxyKey);
          setModelProxyExpiresAt(data.modelProxyExpiresAt);
          localStorage.setItem('modelProxyKey', data.modelProxyKey);
          localStorage.setItem('modelProxyExpiresAt', data.modelProxyExpiresAt);
        }
      } else {
        throw new Error("Story generation failed to return text.");
      }
      
    } catch (e: any) {
      setIsStoryGen(false);
      setStoryError("Failed to start story generation: " + e.message);
    }
  };

  const handleGenerate = async (overrideText?: string | React.MouseEvent) => {
    const textToUse = typeof overrideText === 'string' ? overrideText : text;
    if ((!password && (!kaggleUsername || !kaggleKey)) || !textToUse) {
      setStatus("error");
      setMessage("Please enter either your App Password or your Kaggle Credentials, and text to synthesize.");
      return;
    }
    const activeInstructions = true ? designPrompt : instructions;
    if (true && (!activeInstructions || activeInstructions.trim() === "")) {
      setStatus("error");
      setMessage("Please provide a Voice Design Instruction to design the voice.");
      return;
    }
    isStoppedRef.current = false;
    setIsVoiceSaved(false);
    setStatus("generating"); setMessage("Submitting…");
    setAudios([]); audiosRef.current = []; setLogs([]); setChunks([]);
    setChunksDone(0); setChunksTotal(0); setCellsDone(0); setCellsTotal(0); setEta(""); setIsLongMode(false);
    startRef.current = Date.now(); firstChunkRef.current = null;
    addLog("Initializing…");
    try {
      let referenceAudio = "";
      let referenceText = "";
      
      if (false) {
        const v = allVoices.find(x => x.id === selectedVoiceId);
        if (v) {
          // @ts-ignore
          if (v?.data?.startsWith("/")) {
            // @ts-ignore
            const r = await fetch(v?.data);
            const blob = await r.blob();
            const reader = new FileReader();
            referenceAudio = await new Promise<string>((resolve) => {
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } else {
            // @ts-ignore
            referenceAudio = v?.data;
          }
          // @ts-ignore
          referenceText = v?.transcript;
        }
      }

      const runId = Math.random().toString(36).substring(2, 10);
      const payload = { password, kaggleUsername, kaggleKey, text: textToUse, referenceAudio, referenceText, runId, instructions: activeInstructions, guidanceScale };
      const res  = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submit failed");

      const { kernel, isLong, charCount, chunks: sc, cellsTotal: ct } = data;
      if (ct) setCellsTotal(ct);
      if (isLong) {
        setIsLongMode(true);
        setChunks(sc || []);
        setChunksTotal(sc?.length || 0);
        addLog(`Long text (${charCount} chars) — ${sc?.length || "?"} chunks queued.`);
      } else {
        addLog(`Short text (${charCount} chars) — single-shot queued.`);
      }
      setMessage("Generating...");
      addLog(`Kernel: ${kernel}`);
      pollTimeoutRef.current = setTimeout(() => pollStatus(kernel, runId), 15000);
    } catch (e: any) {
      setStatus("error"); setMessage(e.message); addLog(`ERROR: ${e.message}`);
    }
  };

  const pollStatus = async (kernel: string, runId: string) => {
    if (isStoppedRef.current) return;
    try {
      addLog("Polling status…");
      const url = new URL("/api/status", window.location.href);
      url.searchParams.set("kernel", kernel);
      url.searchParams.set("runId", runId);
      if (kaggleUsername && kaggleKey) {
        url.searchParams.set("kaggleUsername", kaggleUsername);
        url.searchParams.set("kaggleKey", kaggleKey);
      }
      const existingAudios = audiosRef.current.map(a => a.name).join(',');
      if (existingAudios) {
        url.searchParams.set("existingAudios", existingAudios);
      }
      const res  = await fetch(url.toString());
      const rawText = await res.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (e) {
        throw new Error(`Server returned invalid JSON. Status: ${res.status}. Body: ${rawText.substring(0, 100)}`);
      }
      if (data.error) { setStatus("error"); setMessage(data.error); addLog(`ERROR: ${data.error}`); return; }

      if (data.status === "complete") {
        addLog("Complete! Fetching audio…");
        if (data.audios?.length) {
          setStatus("complete"); setMessage("Generation complete!");
          setAudios(data.audios);
          if (isLongMode) setChunksDone(chunksTotal);
          setCellsDone(cellsTotal || 1);
          addLog(`${data.audios.length} audio files ready.`);
        } else {
          setStatus("error"); setMessage("No audio in output."); addLog("ERROR: No audio.");
        }
      } else if (data.status === "error") {
        setStatus("error"); setMessage(`Kaggle Error`); addLog(`ERROR: ${data.status}`);
      } else if (["cancel", "cancel_requested", "cancel_acknowledged"].includes(data.status)) {
        setStatus("idle"); setMessage(`Generation cancelled.`); addLog(`CANCELLED: ${data.status}`);
        isStoppedRef.current = true;
      } else {
        if (data.newAudios?.length > 0) {
          const newMerged = [...audiosRef.current, ...data.newAudios];
          audiosRef.current = newMerged;
          setAudios(newMerged);
        }
        if (data.chunksTotal > 0) { setChunksTotal(data.chunksTotal); setChunksDone(data.chunksCurrent); }
        if (data.cellsTotal > 0) { setCellsTotal(data.cellsTotal); }
        
        // We do NOT stop polling here when audio is found.
        // We let it continue polling until Kaggle returns status === "complete" or "error".
        if (data.chunksTotal > 0 && data.chunksCurrent === data.chunksTotal) {
          if (isLongMode) setChunksDone(data.chunksTotal || chunksTotal);
        }

        const info = data.chunksTotal > 0 ? ` (${data.chunksCurrent}/${data.chunksTotal})` : "";
        setMessage(`Generating${info}...`);
        addLog(`${(data.status || "unknown").toUpperCase()}${info}`);
        pollTimeoutRef.current = setTimeout(() => pollStatus(kernel, runId), 10000);
      }
    } catch (e: any) {
      setStatus("error"); setMessage("Poll failed: " + e.message); addLog(`ERROR: ${e.message}`);
    }
  };

  const isGen      = status === "generating";
  const finalAudios = audios.filter(a => getCategory(a.name) === "final");
  const isAudioShown = (chunksTotal > 0 && chunksDone === chunksTotal) || (!isLongMode && finalAudios.some(a => a.name.includes('single.wav')));

  const handleNewScript = () => {
    setText("");
    setAudios([]);
    setChunksTotal(0);
    setChunksDone(0);
    setStatus("idle");
    setMessage("");
    setCellsDone(0);
    setCellsTotal(0);
    setStitchedAudioUrl(null);
    setGeneratedPreviewText("");
  };

  // Simulated cell progress since Kaggle API doesn't expose live notebook stdout
  useEffect(() => {
    if (isGen && cellsTotal > 0 && startRef.current) {
      const timer = setInterval(() => {
        const elapsed = (Date.now() - startRef.current!) / 1000;
        setCellsDone(prev => {
          let expected = 0;
          if (elapsed < 148) {
            expected = (elapsed / 148) * 1;
          } else if (elapsed < 150) {
            expected = 1 + ((elapsed - 148) / 2) * 1;
          } else if (elapsed < 326) {
            expected = 2 + ((elapsed - 150) / 176) * 1;
          } else if (elapsed < 336) {
            expected = 3 + ((elapsed - 326) / 10) * 2.5; // reaches 5.5 (approx 75%)
          } else {
            if (isAudioShown) {
              // Audio is shown, slowly fill up to 6.7 (90%) while waiting for Kaggle run to fully end
              expected = 5.9 + ((elapsed - 336) / 300) * 0.8;
              if (expected > 6.7) expected = 6.7; 
            } else {
              // Generating chunks (Waiting for audio), cap at 5.9 (80%)
              const genTime = (chunksTotal || 1) * 60; // ~60s per chunk
              expected = 5.5 + ((elapsed - 336) / genTime) * 0.4;
              if (expected > 5.9) expected = 5.9;
            }
          }
          
          if (expected > cellsTotal - 0.2) expected = cellsTotal - 0.2;
          return Math.max(prev, expected);
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isGen, cellsTotal, chunksTotal, isAudioShown]);

  const refAudios  = audios.filter(a => getCategory(a.name) === "reference");

  const chunkAudios = audios
    .filter(a => getCategory(a.name) === "chunk")
    .sort((a, b) => {
      const aMatch = a.name.match(/chunk_(\d+)/);
      const bMatch = b.name.match(/chunk_(\d+)/);
      const aNum = aMatch ? parseInt(aMatch[1], 10) : 0;
      const bNum = bMatch ? parseInt(bMatch[1], 10) : 0;
      return aNum - bNum;
    });

  useEffect(() => {
    let currentUrl: string | null = null;
    let isActive = true;

    if (chunkAudios.length > 1) {
      setIsStitching(true);
      const stitch = async () => {
        try {
          const blobs = await Promise.all(chunkAudios.map(async a => {
            const res = await fetch(a.data);
            return res.blob();
          }));
          const stitchedBlob = await stitchChunks(blobs, chunkTrims, chunkTrimModes);
          if (!isActive) return;
          const url = URL.createObjectURL(stitchedBlob);
          currentUrl = url;
          setStitchedAudioUrl(url);
        } catch (e) {
          console.error("Stitching failed", e);
        } finally {
          if (isActive) setIsStitching(false);
        }
      };
      stitch();
    } else {
      setStitchedAudioUrl(null);
    }
    return () => {
      isActive = false;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [audios, chunkTrims, chunkTrimModes]);

  const renderHighlightedText = (t: string) => {
    const regex = /(\([^)]+\))/g;
    const parts = t.split(regex);
    return parts.map((part, i) => {
      if (part.match(regex)) {
        let colorClass = "text-purple-400"; // fallback
        const lower = part.toLowerCase();
        for (const cat of VOCAL_TAGS) {
          if (cat.tags.some(tag => lower.includes(tag.slice(1, -1)))) {
            colorClass = cat.colorClass;
            break;
          }
        }
        // No extra font-weight — inherit from parent to keep character widths identical
        return <span key={i} className={colorClass} style={{ fontWeight: 'inherit' }}>{part}</span>;
      }
      // Return plain string node, not a span, to avoid extra inline box boundaries
      return part;
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const el = e.currentTarget;
      if (el.selectionStart === el.selectionEnd) {
        if (e.key === 'Backspace') {
          const textBefore = text.slice(0, el.selectionStart);
          const tagMatch = textBefore.match(/(\([^)]+\))$/);
          if (tagMatch) {
            e.preventDefault();
            const startPos = el.selectionStart - tagMatch[0].length;
            setText(text.slice(0, startPos) + text.slice(el.selectionStart));
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = startPos;
              }
            }, 0);
          }
        } else if (e.key === 'Delete') {
          const textAfter = text.slice(el.selectionStart);
          const tagMatch = textAfter.match(/^(\([^)]+\))/);
          if (tagMatch) {
            e.preventDefault();
            const endPos = el.selectionStart + tagMatch[0].length;
            setText(text.slice(0, el.selectionStart) + text.slice(endPos));
            setTimeout(() => {
              if (textAreaRef.current) {
                textAreaRef.current.selectionStart = textAreaRef.current.selectionEnd = el.selectionStart;
              }
            }, 0);
          }
        }
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    const pos = el.selectionStart;
    const textBefore = text.slice(0, pos);
    const textAfter = text.slice(pos);
    const openIndex = textBefore.lastIndexOf('(');
    const closeIndexBefore = textBefore.lastIndexOf(')');
    
    // If the closest bracket before cursor is '(', we are inside a tag
    if (openIndex > closeIndexBefore || openIndex !== -1 && closeIndexBefore === -1) {
      const closeIndexAfter = textAfter.indexOf(')');
      if (closeIndexAfter !== -1) {
        e.preventDefault();
        const start = openIndex;
        const end = pos + closeIndexAfter + 1;
        el.setSelectionRange(start, end);
      }
    }
  };

  if (showSplash) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg-base text-text-primary">
        <div className="flex flex-col items-center gap-5 animate-in zoom-in duration-1000 slide-in-from-bottom-4">
            <GenVoiceLogo size={96} animate={true} />
          <h1 className="text-2xl font-semibold tracking-tight mt-1">GenVoice Studio</h1>
          
          {/* Dynamic loading bar */}
          <div className="w-48 h-1 bg-border-subtle rounded-full overflow-hidden mt-2 relative">
            <div className="absolute top-0 left-0 h-full bg-accent-bg rounded-full w-full animate-[progress_2s_ease-in-out_forwards]" style={{ transformOrigin: 'left' }} />
          </div>
        </div>
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes progress {
            0% { transform: scaleX(0); }
            50% { transform: scaleX(0.7); }
            100% { transform: scaleX(1); }
          }
        `}} />
      </div>
    );
  }

  if (!hasCredentials) {
    if (verifyScreen) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base text-text-primary p-6 animate-in fade-in duration-500 overflow-y-auto">
          <div className="max-w-xl w-full bg-bg-panel border border-border-color rounded-3xl p-8 sm:p-10 shadow-xl my-auto flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 mb-4">
              <GenVoiceLogo size={48} animate={verifyStatus === 'pending' || verifyStatus === 'internet' || verifyStatus === 'gpu'} />
              <h1 className="text-xl font-semibold tracking-tight mt-2">Verifying Kaggle Environment</h1>
              <p className="text-sm text-text-muted text-center leading-relaxed">This takes about 30-60 seconds as a test kernel is provisioned.</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-bg-input rounded-xl border border-border-color">
                <span className="font-medium text-sm text-text-primary">Outbound Internet Access</span>
                {verifyStatus === 'pending' || verifyStatus === 'internet' ? (
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'gpu' || verifyStatus === 'success' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                )}
              </div>

              <div className="flex items-center justify-between p-4 bg-bg-input rounded-xl border border-border-color">
                <span className="font-medium text-sm text-text-primary">GPU Allocation (Quota & T4)</span>
                {verifyStatus === 'pending' || verifyStatus === 'internet' ? (
                   <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'gpu' ? (
                  <Loader2 size={16} className="animate-spin text-text-muted" />
                ) : verifyStatus === 'success' ? (
                  <Check size={16} className="text-green-500" />
                ) : (
                  <X size={16} className="text-red-500" />
                )}
              </div>
            </div>

            {verifyStatus === 'error' && (
              <div className="flex flex-col gap-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                  <strong className="font-semibold">Verification Failed: </strong>
                  {verifyError}
                </div>

                <div className="p-5 bg-accent-bg/5 border border-accent-bg/10 rounded-xl text-sm text-text-secondary">
                  <p className="font-medium text-text-primary mb-3 text-base">How to fix this:</p>
                  <ol className="list-decimal pl-4 space-y-2">
                    <li>Go to <a href="https://www.kaggle.com/settings" target="_blank" rel="noreferrer" className="text-accent-bg hover:underline font-medium">kaggle.com/settings</a></li>
                    <li>Find <strong>"Phone verify"</strong> under Phone verification and complete the steps to unlock internet access.</li>
                    <li>Make sure you haven't exceeded your weekly 30-hour free GPU quota.</li>
                  </ol>
                </div>

                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => {
                      setVerifyScreen(false);
                      setIsVerifying(false);
                    }}
                    className="flex-1 bg-bg-input text-text-primary font-medium py-3.5 rounded-xl hover:bg-bg-hover transition-all shadow-sm flex items-center justify-center gap-2 border border-border-color"
                  >
                    Go Back
                  </button>
                  <button 
                    onClick={async () => {
                      // Just re-trigger the same onClick flow from the start button
                      setVerifyStatus('pending');
                      setVerifyError("");
                      
                      try {
                        const startRes = await fetch('/api/verifyKaggleStart', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ kaggleUsername, kaggleKey })
                        });
                        const startData = await startRes.json();
                        
                        if (!startRes.ok) {
                          throw new Error(startData.error || "Failed to start verification process.");
                        }
                        
                        setVerifyStatus('internet');
                        const ref = startData.ref;
                        
                        let polling = true;
                        let attempts = 0;
                        while (polling) {
                          attempts++;
                          if (attempts > 30) {
                            polling = false;
                            setVerifyStatus('error');
                            setVerifyError("Verification timed out after 2 minutes.");
                            break;
                          }
                          const statusRes = await fetch('/api/verifyKaggleStatus', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ kaggleUsername, kaggleKey, ref })
                          });
                          
                          const statusData = await statusRes.json();
                          
                          if (statusData.status === 'running') {
                            await new Promise(r => setTimeout(r, 4000));
                          } else if (statusData.status === 'complete') {
                            polling = false;
                            const results = statusData.results;
                            if (results.internet) {
                              setVerifyStatus('gpu');
                            }
                            
                            if (results.internet && results.gpu) {
                              setVerifyStatus('success');
                              setTimeout(() => {
                                setVerifyScreen(false);
                                setIsVerifying(false);
                                localStorage.setItem('kaggleUsername', kaggleUsername);
                                localStorage.setItem('kaggleKey', kaggleKey);
                                localStorage.removeItem('appPassword');
                                setPassword('');
                                setHasCredentials(true);
                                setStatus("idle");
                                setMessage("");
                              }, 1000);
                            } else {
                              setVerifyStatus('error');
                              setVerifyError(results.error || "Verification failed. Internet or GPU not available.");
                            }
                          } else {
                            polling = false;
                            setVerifyStatus('error');
                            setVerifyError(statusData.error || "Failed to complete verification.");
                          }
                        }
                      } catch (e: any) {
                        setVerifyStatus('error');
                        setVerifyError(e.message);
                      }
                    }}
                    className="flex-1 bg-accent-bg text-accent-text font-medium py-3.5 rounded-xl hover:bg-accent-bg/90 transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    Retry Verification
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-base text-text-primary p-6 animate-in fade-in duration-500 overflow-y-auto">
        <div className={`max-w-xl w-full bg-bg-panel border border-border-color rounded-3xl p-8 sm:p-10 shadow-xl my-auto ${status === 'error' ? 'animate-shake' : ''} relative`}>
          
          {canCancelAuth && !verifyScreen && (
            <button
              onClick={() => {
                setKaggleUsername(localStorage.getItem('kaggleUsername') || '');
                setKaggleKey(localStorage.getItem('kaggleKey') || '');
                setPassword(localStorage.getItem('appPassword') || '');
                setHasCredentials(true);
              }}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}

          <div className="flex flex-col items-center gap-3 mb-8">
            <GenVoiceLogo size={48} />
            <h1 className="text-2xl font-semibold tracking-tight mt-2">Welcome to GenVoice</h1>
            <p className="text-sm text-text-muted text-center leading-relaxed">Choose how you want to authenticate to run your inferences.</p>
          </div>

          <div className="flex bg-bg-input p-1 rounded-lg border border-border-color mb-8">
            <button 
              onClick={() => setAuthMode('byok')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring-color ${authMode === 'byok' ? 'bg-bg-panel text-text-primary shadow-sm border border-border-color' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
            >
              Your Own Kaggle
            </button>
            <button 
              onClick={() => setAuthMode('admin')}
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring-color ${authMode === 'admin' ? 'bg-bg-panel text-text-primary shadow-sm border border-border-color' : 'text-text-muted hover:text-text-secondary border border-transparent'}`}
            >
              Admin Access
            </button>
          </div>

          {authMode === 'byok' ? (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-accent-bg/5 border border-accent-bg/10 rounded-xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed mb-2">
                <Info size={16} className="text-accent-bg shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-text-primary">How to get your credentials:</span>
                  <ol className="list-decimal pl-3.5 space-y-1 text-text-muted">
                    <li>Create an account at <a href="https://www.kaggle.com" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com</a></li>
                    <li><strong>Important:</strong> You must verify your phone number. This is required by Kaggle to allow internet access (to download the AI models) and to use their free GPUs. Go to <a href="https://www.kaggle.com/settings" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com/settings</a>, find <strong>"Phone verify"</strong> under Phone verification, and follow the steps.</li>
                    <li>On the same settings page, your username is listed under <strong>"Your username"</strong>.</li>
                    <li>Then go to <a href="https://www.kaggle.com/settings/api" target="_blank" rel="noreferrer" className="text-accent-bg underline underline-offset-2 hover:opacity-80">kaggle.com/settings/api</a>.</li>
                    <li>Click <strong>"Create New Token"</strong>, enter <strong>"GenVoice"</strong> as the Token Name, click <strong>Generate</strong>, and copy the API Key.</li>
                  </ol>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Kaggle Username"
                  value={kaggleUsername}
                  onChange={e => setKaggleUsername(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
                <input
                  type="password"
                  placeholder="Kaggle API Key"
                  value={kaggleKey}
                  onChange={e => setKaggleKey(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-4 bg-bg-hover border border-border-color rounded-xl flex items-start gap-3 text-xs text-text-secondary leading-relaxed mb-2">
                <Shield size={16} className="text-text-muted shrink-0 mt-0.5" />
                <span>Access the shared hosted instance. This requires the master App Password.</span>
              </div>
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="App Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3.5 text-sm text-text-primary placeholder:text-text-muted outline-none focus:border-border-color focus-visible:ring-2 focus-visible:ring-ring-color transition-all shadow-sm"
                />
              </div>
            </div>
          )}

          <button
            disabled={isVerifying}
            onClick={async () => {
              if (authMode === 'byok' && kaggleUsername && kaggleKey) {
                setIsVerifying(true);
                setVerifyScreen(true);
                setVerifyStatus('pending');
                setVerifyError("");
                
                try {
                  const startRes = await fetch('/api/verifyKaggleStart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ kaggleUsername, kaggleKey })
                  });
                  const startData = await startRes.json();
                  
                  if (!startRes.ok) {
                    throw new Error(startData.error || "Failed to start verification process.");
                  }
                  
                  setVerifyStatus('internet');
                  const ref = startData.ref;
                  
                  // Start polling
                  let polling = true;
                  let attempts = 0;
                  while (polling) {
                    attempts++;
                    if (attempts > 30) {
                      polling = false;
                      setVerifyStatus('error');
                      setVerifyError("Verification timed out after 2 minutes.");
                      break;
                    }
                    const statusRes = await fetch('/api/verifyKaggleStatus', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ kaggleUsername, kaggleKey, ref })
                    });
                    
                    const statusData = await statusRes.json();
                    
                    if (statusData.status === 'running') {
                      await new Promise(r => setTimeout(r, 4000));
                    } else if (statusData.status === 'complete') {
                      polling = false;
                      const results = statusData.results;
                      if (results.internet) {
                        setVerifyStatus('gpu');
                      }
                      
                      if (results.internet && results.gpu) {
                        setVerifyStatus('success');
                        setTimeout(() => {
                          setVerifyScreen(false);
                          setIsVerifying(false);
                          localStorage.setItem('kaggleUsername', kaggleUsername);
                          localStorage.setItem('kaggleKey', kaggleKey);
                          localStorage.removeItem('appPassword');
                          setPassword('');
                          setHasCredentials(true);
                          setStatus("idle");
                          setMessage("");
                        }, 1000);
                      } else {
                        setVerifyStatus('error');
                        setVerifyError(results.error || "Verification failed. Internet or GPU not available.");
                      }
                    } else {
                      polling = false;
                      setVerifyStatus('error');
                      setVerifyError(statusData.error || "Failed to complete verification.");
                    }
                  }
                } catch (e: any) {
                  setVerifyStatus('error');
                  setVerifyError(e.message);
                }
              } else if (authMode === 'admin' && password) {
                setIsVerifying(true);
                try {
                  const res = await fetch('/api/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                  });
                  if (!res.ok) {
                    throw new Error("Invalid admin password");
                  }
                  localStorage.setItem('appPassword', password);
                  localStorage.removeItem('kaggleUsername');
                  localStorage.removeItem('kaggleKey');
                  setKaggleUsername('');
                  setKaggleKey('');
                  setHasCredentials(true);
                  setStatus("idle");
                  setMessage("");
                } catch (e: any) {
                  setMessage(e.message);
                  setStatus("error");
                  setTimeout(() => setStatus("idle"), 3000);
                } finally {
                  setIsVerifying(false);
                }
              } else {
                setMessage("Please fill in all required fields.");
                setStatus("error");
                setTimeout(() => setStatus("idle"), 3000);
              }
            }}
            className="w-full mt-8 bg-accent-bg text-accent-text font-medium py-3.5 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {isVerifying ? <Loader2 size={16} className="animate-spin" /> : null}
            {isVerifying ? "Verifying..." : "Enter Studio"}
          </button>
          
          {status === 'error' && <p className="text-red-400 text-xs text-center mt-4 animate-in fade-in">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[100dvh] md:h-screen md:overflow-hidden bg-bg-base text-text-primary selection:bg-accent-bg/20 selection:text-text-primary">

      {/* ── Top Header ────────────────────────────────────────────── */}
      <header className="h-16 px-6 flex items-center justify-end border-b border-border-color shrink-0 relative z-50">
        <div className="flex items-center gap-4 z-10">

          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border-color bg-bg-panel/50">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">AI Model:</span>
            <CustomModelSelect
              value={aiModel}
              onChange={(val) => {
                setAiModel(val);
                localStorage.setItem('aiModel', val);
              }}
              options={AVAILABLE_AI_MODELS}
              className="w-[180px]"
            />
          </div>

          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-bg-hover text-text-muted hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          
          <button
            onClick={() => {
              setHasCredentials(false);
              setCanCancelAuth(true);
            }}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
            aria-label="Change Credentials"
          >
            <Key size={14} />
            <span className="hidden sm:inline">Auth</span>
          </button>
        </div>
      </header>

      {/* ── Main Voice Design Layout ─────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-y-auto bg-bg-base">
        <div className="w-full max-w-2xl mx-auto px-6 py-10 flex flex-col gap-8">

          {/* Description Card */}
          <div className="p-4 bg-accent-bg/5 border border-accent-bg/10 rounded-2xl flex items-start gap-3 text-sm text-text-secondary leading-relaxed">
            <Sparkles size={16} className="text-accent-bg shrink-0 mt-0.5" />
            <span>
              <strong>Voice Design</strong> creates an entirely new voice from scratch based purely on your <strong>Voice Design Instruction</strong> below. Describe the age, gender, accent, tone, and character.
            </span>
          </div>

          {/* Model */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">Model</label>
            <div className="px-3 py-2.5 bg-bg-input border border-border-color rounded-xl text-sm text-text-primary">
              Breeze-TTS 2
            </div>
          </div>

          {/* Voice Design Instruction */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                Voice Design Instruction
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowWriteDesignModal(true); setWriteDesignError(""); }}
                  disabled={status !== "idle" && status !== "complete" && status !== "error"}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-primary bg-bg-input border border-border-color hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  <Sparkles size={12} className="text-accent-bg" /> AI Write
                </button>
                <button
                  onClick={handleOptimizeDesignPrompt}
                  disabled={isOptimizingDesign || !designPrompt.trim() || (status !== "idle" && status !== "complete" && status !== "error")}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-primary bg-bg-input border border-border-color hover:bg-bg-hover transition-colors disabled:opacity-50"
                >
                  {isOptimizingDesign ? <Loader2 size={12} className="animate-spin text-accent-bg" /> : <Wand2 size={12} className="text-accent-bg" />}
                  AI Optimize
                </button>
              </div>
            </div>
            {optimizeDesignError && <p className="text-xs text-red-500">{optimizeDesignError}</p>}
            <textarea
              value={designPrompt}
              onChange={(e) => setDesignPrompt(e.target.value)}
              placeholder={"e.g., A raspy old man with a British accent..."}
              className="w-full h-28 p-3 bg-bg-input border border-border-color rounded-xl text-sm text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:ring-2 focus:ring-ring-color transition-all"
            />
          </div>

          {/* Guidance Scale */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">Guidance Scale</label>
              <span className="text-[11px] font-mono text-text-muted">{guidanceScale}</span>
            </div>
            <input
              type="range"
              min="1" max="10" step="0.1"
              value={guidanceScale}
              onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-border-color rounded-lg appearance-none cursor-pointer accent-accent-bg"
            />
            <p className="text-[10px] text-text-muted leading-relaxed">
              Higher values strengthen guidance. Recommended: 4.0 for Voice Design, 1–3 for expressive cloning.
            </p>
          </div>

          {/* Error */}
          {status === "error" && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              <strong className="font-semibold block mb-0.5">Generation Failed:</strong>
              {message}
            </div>
          )}

          {/* Generate & Save Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const randomPangram = PANGRAMS[Math.floor(Math.random() * PANGRAMS.length)];
                const textToGen = text.trim() || randomPangram;
                setGeneratedPreviewText(textToGen);
                handleGenerate(textToGen);
              }}
              disabled={isGen || !designPrompt.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-accent-bg text-accent-text hover:bg-accent-bg/90 disabled:opacity-50 transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
            >
              {isGen ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" /> Generating Preview...
                </span>
              ) : "Generate Voice Preview"}
            </button>

            {status === 'complete' && (stitchedAudioUrl || (finalAudios && finalAudios.length > 0)) && !isGen && (
              <button
                disabled={isVoiceSaved}
                onClick={() => handleSaveVoice(stitchedAudioUrl || finalAudios[0].data)}
                className="w-full py-3 rounded-xl text-sm font-medium bg-bg-input text-text-primary border border-border-color hover:bg-bg-hover disabled:opacity-50 disabled:hover:bg-bg-input transition-colors focus-visible:ring-2 focus-visible:ring-ring-color outline-none"
              >
                {isVoiceSaved ? "Saved to Custom Voices!" : "Save to Custom Voices"}
              </button>
            )}

            {/* Audio Preview */}
            {status === 'complete' && (stitchedAudioUrl || (finalAudios && finalAudios.length > 0)) && (
              <div className="mt-2">
                <audio
                  controls
                  src={stitchedAudioUrl || finalAudios[0].data}
                  className="w-full"
                />
              </div>
            )}
          </div>

        </div>
      </div>



      {/* ── Footer & Dev Logs ─────────────────────────────────────── */}
      {/* ── Footer & Dev Logs ─────────────────────────────────────── */}
      <footer className="h-8 flex items-center justify-between px-6 border-t border-border-color bg-bg-base shrink-0 relative z-20">
        <span className="text-[10px] text-text-muted">
          Built by <a href="https://github.com/pundhiranshul" target="_blank" rel="noreferrer" className="text-text-secondary hover:text-text-primary transition-colors underline decoration-white/20 underline-offset-2">Anshul Pundhir</a>
        </span>
        <button
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-1.5 text-[10px] text-text-muted hover:text-text-primary transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color rounded"
        >
          <Terminal size={12} />
          {showLogs ? "Hide Dev Logs" : "Show Dev Logs"}
        </button>
      </footer>

      {/* Floating Logs Drawer (Dev Only) */}
      {showLogs && (
        <div className="fixed bottom-8 right-6 w-[calc(100vw-3rem)] sm:w-[400px] h-[300px] bg-bg-panel border border-border-color rounded-t-xl rounded-bl-xl shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-8 fade-in duration-200">
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 font-mono text-[10px]">
            {logs.length === 0
              ? <span className="text-text-muted">Waiting for logs...</span>
              : logs.map((log, i) => (
                <div key={i} className="leading-relaxed text-text-secondary break-words">
                  <span className="text-text-muted">{log.slice(0, 11)}</span>{log.slice(11)}
                </div>
              ))}
            <div ref={logsEndRef}/>
          </div>
        </div>
      )}
      {/* ── Modals ────────────────────────────────────────────────── */}

      {/* Upload Modal (Custom Voice) */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border-color rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-medium text-text-primary">Upload Custom Voice</h3>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">Voice Name</label>
              <input type="text" value={newVoiceName} onChange={e => setNewVoiceName(e.target.value)} placeholder="e.g. My Voice" className="w-full bg-bg-input border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-border-color" />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">Audio File (WAV/MP3)</label>
              <input type="file" accept="audio/*" onChange={e => setNewVoiceFile(e.target.files?.[0] || null)} className="text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-accent-bg file:text-accent-text hover:file:bg-accent-bg/90 cursor-pointer" />
              {newVoiceFile && <span className="text-xs text-text-muted mt-1">Pre-selected: {newVoiceFile.name} (Ready to save)</span>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">Exact Transcript (Required)</label>
              <textarea value={newVoiceText} onChange={e => setNewVoiceText(e.target.value)} placeholder="Transcript of the audio file..." rows={3} className="w-full bg-bg-input border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary outline-none resize-none focus:border-border-color" />
            </div>

            <div className="flex justify-end gap-3 mt-2 items-center">
              {uploadError && <span className="text-red-500 text-xs mr-auto">{uploadError}</span>}
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-full text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">Cancel</button>
              <button onClick={() => {
                if (!newVoiceName || !newVoiceText || !newVoiceFile) return setUploadError("Fill all fields");
                setUploadError("");
                const reader = new FileReader();
                reader.onload = async () => {
                  const data = reader.result as string;
                  const newVoice: CustomVoice = { id: Date.now().toString(), name: newVoiceName, transcript: newVoiceText, data };
                  const updated = [...customVoices, newVoice];
                  setCustomVoices(updated);
                  await set('custom_voices', updated);
                  setSelectedVoiceId(newVoice.id);
                  setShowUpload(false);
                  setNewVoiceName(""); setNewVoiceText(""); setNewVoiceFile(null);
                  setIsVoiceSaved(true);
                };
                reader.readAsDataURL(newVoiceFile);
              }} className="px-4 py-2 rounded-full text-sm font-medium bg-accent-bg text-accent-text hover:bg-accent-bg/90 transition-colors">Save Voice</button>
            </div>
          </div>
        </div>
      )}
      {/* Stop Run Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border-color rounded-2xl p-6 shadow-xl max-w-sm w-full relative mx-4">
            <button
              onClick={() => setShowStopModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring-color rounded-lg p-1"
            >
              <X size={16} />
            </button>
            <h3 className="text-lg font-semibold text-text-primary mb-2 tracking-tight">Stop Generation</h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              Programmatic stopping is not supported by Kaggle. To stop generation, please open Kaggle, look in the <strong className="text-text-primary">bottom left corner</strong> and click <strong className="text-text-primary">View Active Events</strong>.
              <br/><br/>
              You will see <strong className="text-text-primary">genvoice-api</strong> running. Click the three dots and select <strong className="text-text-primary">Stop Session</strong>.
              <br/><br/>
              Once stopped, the studio will detect the cancellation automatically.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowStopModal(false)}
                className="flex-1 px-4 py-2.5 bg-bg-hover text-text-primary text-sm font-medium rounded-xl transition-colors hover:bg-bg-hover-strong outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Close
              </button>
              <a
                href="https://www.kaggle.com/"
                target="_blank"
                rel="noreferrer"
                onClick={() => setShowStopModal(false)}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Open Kaggle
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Story Gen Modal */}
      {showStoryModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-panel w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={20} /> AI Write Story
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Uses Kaggle AI credits to write an expressive script with vocal cues like (laugh) and (sigh).
              </p>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Topic / Premise</label>
                <textarea
                  value={storyTopic}
                  onChange={e => setStoryTopic(e.target.value)}
                  placeholder="A lonely astronaut discovers a strange planet..."
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-text-muted resize-none transition-colors"
                  rows={3}
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-primary">Tone</label>
                    <select 
                      value={storyTone}
                      onChange={e => setStoryTone(e.target.value)}
                      className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-text-muted transition-colors appearance-none"
                    >
                      <option>Dramatic</option>
                      <option>Funny</option>
                      <option>Scary</option>
                      <option>Educational</option>
                      <option>Neutral</option>
                      <option>Custom</option>
                    </select>
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <label className="text-sm font-medium text-text-primary">Length</label>
                    <select 
                      value={storyLength}
                      onChange={e => setStoryLength(e.target.value)}
                      className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-text-muted transition-colors appearance-none"
                    >
                      <option value="Short (~100 words)">Short (~100 words)</option>
                      <option value="Medium (~300 words)">Medium (~300 words)</option>
                      <option value="Long (~500 words)">Long (~500 words)</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                {/* Custom Inputs */}
                {(storyTone === "Custom" || storyLength === "Custom") && (
                  <div className="flex gap-4 animate-in slide-in-from-top-2 duration-200">
                    {storyTone === "Custom" ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Custom Tone</label>
                        <input 
                          type="text"
                          value={customTone}
                          onChange={e => setCustomTone(e.target.value)}
                          placeholder="e.g. Sarcastic, Melancholic"
                          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-text-muted transition-colors"
                        />
                      </div>
                    ) : <div className="flex-1" />}
                    
                    {storyLength === "Custom" ? (
                      <div className="flex-1 flex flex-col gap-2">
                        <label className="text-sm font-medium text-text-primary">Custom Length</label>
                        <input 
                          type="text"
                          value={customLength}
                          onChange={e => setCustomLength(e.target.value)}
                          placeholder="e.g. 1000 words, 2 paragraphs"
                          className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none focus:border-text-muted transition-colors"
                        />
                      </div>
                    ) : <div className="flex-1" />}
                  </div>
                )}
              </div>
            </div>

            {storyError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
                  <div className="mt-0.5"><Shield size={16} /></div>
                  <div className="break-words w-full flex flex-col gap-2">
                    <span>{storyError}</span>
                    <div className="flex items-center gap-2 p-2 bg-bg-panel border border-border-color rounded-md mt-1">
                      <label className="text-xs font-semibold text-text-primary">Change Model:</label>
                      <CustomModelSelect 
                        value={aiModel} 
                        onChange={val => { setAiModel(val); localStorage.setItem('aiModel', val); }}
                        options={AVAILABLE_AI_MODELS}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border-subtle bg-bg-base flex gap-3">
              <button
                onClick={() => setShowStoryModal(false)}
                disabled={isStoryGen}
                className="flex-1 px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Cancel
              </button>
              <button
                onClick={handleStoryGenerate}
                disabled={!storyTopic.trim() || isStoryGen}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 disabled:opacity-50 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                {isStoryGen ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Writing...
                  </>
                ) : (
                  "Generate Script"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Optimize Modal */}
      {showOptimizeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border-color rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-base/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-bg/10 flex items-center justify-center text-accent-text">
                  <Wand2 size={16} />
                </div>
                <h2 className="text-sm font-semibold text-text-primary tracking-wide">Optimize Script</h2>
              </div>
              <button 
                onClick={() => setShowOptimizeModal(false)}
                className="p-1.5 rounded-full hover:bg-bg-hover text-text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-6 bg-bg-panel overflow-y-auto max-h-[60vh]">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                  Instructions (Optional)
                </label>
                <textarea
                  value={optimizeInstruction}
                  onChange={(e) => setOptimizeInstruction(e.target.value)}
                  placeholder="e.g. Add commas, breathing marks (sigh), or make the tone more enthusiastic."
                  rows={3}
                  className="w-full px-3 py-2 bg-bg-input text-text-primary text-sm rounded-lg border border-border-color placeholder-text-muted outline-none focus:border-ring-color transition-colors resize-none"
                />
              </div>
            </div>

            {optimizeError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
                  <div className="mt-0.5"><Shield size={16} /></div>
                  <div className="break-words w-full flex flex-col gap-2">
                    <span>{optimizeError}</span>
                    <div className="flex items-center gap-2 p-2 bg-bg-panel border border-border-color rounded-md mt-1">
                      <label className="text-xs font-semibold text-text-primary">Change Model:</label>
                      <CustomModelSelect 
                        value={aiModel} 
                        onChange={val => { setAiModel(val); localStorage.setItem('aiModel', val); }}
                        options={AVAILABLE_AI_MODELS}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border-subtle bg-bg-base flex gap-3">
              <button
                onClick={() => setShowOptimizeModal(false)}
                disabled={isOptimizing}
                className="flex-1 px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Cancel
              </button>
              <button
                onClick={handleOptimizeScript}
                disabled={isOptimizing}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 disabled:opacity-50 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                {isOptimizing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Optimizing...
                  </>
                ) : (
                  "Optimize"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Voice Recommend Modal */}
      {showRecommendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-bg-panel border border-border-color rounded-2xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-bg-base/50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent-bg/10 flex items-center justify-center text-accent-text">
                  <Sparkles size={16} />
                </div>
                <h2 className="text-sm font-semibold text-text-primary tracking-wide">Recommended Voices</h2>
              </div>
              <button 
                onClick={() => setShowRecommendModal(false)}
                className="p-1.5 rounded-full hover:bg-bg-hover text-text-muted transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 flex flex-col gap-4 bg-bg-panel overflow-y-auto max-h-[60vh]">
              {recommendedVoices.length > 0 ? (
                recommendedVoices.map((voice, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-4 border border-border-color rounded-xl bg-bg-base/50 hover:border-accent-bg/30 transition-colors">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-text-primary">{voice.name || allVoices.find(v => v.id === voice.id)?.name || voice.id}</span>
                      <button 
                        onClick={() => {
                          setSelectedVoiceId(voice.id);
                          setShowRecommendModal(false);
                        }}
                        className="px-3 py-1 bg-accent-bg text-accent-text text-xs rounded-lg font-medium hover:bg-accent-bg/90"
                      >
                        Select
                      </button>
                    </div>
                    <span className="text-xs text-text-secondary leading-relaxed">{voice.reason}</span>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-secondary text-center py-6">No recommendations found.</div>
              )}
            </div>
            <div className="p-4 border-t border-border-subtle bg-bg-base flex justify-end">
              <button
                onClick={() => setShowRecommendModal(false)}
                className="px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* AI Write Prompt Modal */}
      {showWriteDesignModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-bg-panel w-full max-w-lg rounded-2xl shadow-xl border border-border-subtle flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border-subtle">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-accent-bg" /> AI Write Prompt
              </h2>
              <p className="text-sm text-text-muted mt-1">
                Vaguely describe your character and the AI will augment it into a highly detailed Voice Design prompt.
              </p>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-primary">Topic / Premise</label>
                <textarea
                  value={writeDesignTopic}
                  onChange={e => setWriteDesignTopic(e.target.value)}
                  placeholder="e.g. A grumpy old wizard..."
                  className="w-full bg-bg-input border border-border-color rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-text-muted resize-none transition-colors"
                  rows={3}
                />
              </div>
            </div>

            {writeDesignError && (
              <div className="px-6 pb-4">
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-start gap-2">
                  <div className="break-words w-full flex flex-col gap-2">
                    <span>{writeDesignError}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 border-t border-border-subtle bg-bg-base flex gap-3">
              <button
                onClick={() => setShowWriteDesignModal(false)}
                disabled={isWritingDesign}
                className="flex-1 px-4 py-2.5 bg-bg-input text-text-primary text-sm font-medium rounded-xl text-center transition-colors hover:bg-bg-hover disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                Cancel
              </button>
              <button
                onClick={handleWriteDesignPrompt}
                disabled={!writeDesignTopic.trim() || isWritingDesign}
                className="flex-1 px-4 py-2.5 bg-accent-bg text-accent-text text-sm font-medium rounded-xl text-center transition-colors hover:bg-accent-bg/90 disabled:opacity-50 flex justify-center items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring-color"
              >
                {isWritingDesign ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Writing...
                  </>
                ) : "Generate Prompt"}
              </button>
            </div>
          </div>
        </div>
      )}
  
    </div>
  );
}