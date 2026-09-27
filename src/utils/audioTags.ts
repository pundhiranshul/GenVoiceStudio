export const VOCAL_TAGS = [
  {
    category: "Laughter",
    colorClass: "text-yellow-500",
    tags: ["(laughs)", "(chuckles)", "(giggles)"]
  },
  {
    category: "Crying & Emotion",
    colorClass: "text-blue-500",
    tags: ["(cry)", "(sob)", "(moan)"]
  },
  {
    category: "Breathing & Pauses",
    colorClass: "text-teal-500",
    tags: ["(sigh)", "(sighs)", "(gasp)", "(inhale)", "(exhale)", "(pauses)"]
  },
  {
    category: "Throat & Mouth",
    colorClass: "text-orange-500",
    tags: ["(clears throat)", "(cough)", "(sniffs)", "(smacks lips)", "(yawns)", "(burp)", "(burps)", "(gulps)"]
  },
  {
    category: "Vocalization",
    colorClass: "text-purple-500",
    tags: ["(shouts)", "(singing)", "(sing)", "(humming)", "(hum)", "(grunt)"]
  }
];

export const ALL_AUDIO_TAGS = VOCAL_TAGS.flatMap(cat => cat.tags);
export const AUDIO_TAGS_STRING = ALL_AUDIO_TAGS.join(', ');
