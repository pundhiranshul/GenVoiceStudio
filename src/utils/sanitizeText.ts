import { ALL_AUDIO_TAGS } from './audioTags';

export function sanitizeText(text: string): string {
  if (!text) return text;
  
  let cleanText = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...');

  cleanText = cleanText.replace(/\([^)]+\)/g, (match: string) => {
    const lowerMatch = match.toLowerCase();
    if (ALL_AUDIO_TAGS.includes(lowerMatch)) {
      return lowerMatch;
    }
    console.warn(`[SANITIZE API] Stripped unsupported tag: ${match}`);
    return ''; // Strip unsupported tags
  });
  
  return cleanText.replace(/ +/g, ' ').trim();
}
