export const PRESET_AVATAR_MAP: Record<string, string> = {
  std_S0: '/avatars/avatar_standard.jpg',
  el_v3_15: '/avatars/avatar_ellen.jpg',
  el_v3_16: '/avatars/avatar_james.jpg',
  el_v3_17: '/avatars/avatar_amy.jpg',
  el_v3_18: '/avatars/avatar_juniper.jpg',
  el_v3_19: '/avatars/avatar_mark.jpg',
  el_v3_20: '/avatars/avatar_arabella.jpg',
  el_v3_21: '/avatars/avatar_jane.jpg',
  el_v3_22: '/avatars/avatar_hope.jpg',
  el_v3_14: '/avatars/avatar_tpl_1.jpg', // Daniel ONLY
  el_v3_0: '/avatars/avatar_tpl_3.jpg',  // Roger
  el_v3_4: '/avatars/avatar_tpl_2.jpg',  // River
};

/**
 * Generates an AI portrait image URL using an AI image model
 * based on the character description or voice persona name.
 */
export function generateAIAvatarUrl(promptOrName: string): string {
  const clean = promptOrName
    .replace(/^Cast a male voice actor in his\.\.\./i, 'male voice actor in his 40s')
    .replace(/[^a-zA-Z0-9\s,.-]/g, ' ')
    .trim();
  const visualPrompt = `photographic portrait headshot of ${clean || 'voice actor'}, authentic realistic human face, natural studio lighting, 35mm photo`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(visualPrompt)}?width=256&height=256&nologo=true`;
}

/**
 * Checks whether a voice is a recorded voice (which should use the simple avatar).
 */
export function isRecordedVoice(voice?: { id?: string; name?: string; isPreset?: boolean; type?: string; avatar?: string } | null): boolean {
  if (!voice) return false;
  if (voice.isPreset) return false;
  if (voice.type === 'recorded') return true;
  if (voice.id?.startsWith('rec_')) return true;

  // If explicitly tagged as ai-generated, not recorded
  if (voice.type === 'ai-generated' || (voice.avatar && !voice.avatar.includes('avatar_tpl_1'))) {
    return false;
  }

  const name = (voice.name || '').toLowerCase();
  if (
    name.includes('voice v') ||
    name.includes('recorded') ||
    name.includes('my voice') ||
    name.includes('recording') ||
    name.includes('mic voice') ||
    name === 'my recorded voice'
  ) {
    return true;
  }

  return false;
}

/**
 * Resolves the avatar for a given voice:
 * - Shipped presets return their authentic photo.
 * - Daniel returns Daniel's avatar ONLY.
 * - AI generated voices return their generated AI image.
 * - Recorded voices return null (so the simple avatar icon is rendered).
 */
export function getVoiceAvatar(voice?: { id?: string; avatar?: string; name?: string; isPreset?: boolean; type?: string } | null): string | null {
  if (!voice) return null;

  // 1. Shipped presets (Daniel is mapped exclusively to el_v3_14)
  if (voice.id && PRESET_AVATAR_MAP[voice.id]) {
    return PRESET_AVATAR_MAP[voice.id];
  }

  // 2. Explicit avatar already saved (e.g. AI-generated avatar)
  // Ensure we don't leak Daniel's avatar (avatar_tpl_1.jpg) to any non-Daniel voice
  if (voice.avatar && !voice.avatar.includes('avatar_tpl_1.jpg')) {
    return voice.avatar;
  }

  // 3. Recorded voices use simple avatar only (like before)
  if (isRecordedVoice(voice)) {
    return null;
  }

  // 4. Shipped preset without static file -> AI model generated unique portrait
  if (voice.isPreset && voice.name) {
    return generateAIAvatarUrl(voice.name);
  }

  // 5. AI generated / designed voice -> use AI model to generate persona image
  if (voice.name && !isRecordedVoice(voice)) {
    return generateAIAvatarUrl(voice.name);
  }

  return null;
}
