export interface TemplateAvatar {
  id: string;
  url: string;
  label: string;
}

export const TEMPLATE_AVATARS: TemplateAvatar[] = [
  { id: 'tpl_1', url: '/avatars/avatar_tpl_1.jpg', label: 'Marcus' },
  { id: 'tpl_2', url: '/avatars/avatar_tpl_2.jpg', label: 'Maya' },
  { id: 'tpl_3', url: '/avatars/avatar_tpl_3.jpg', label: 'Carlos' },
  { id: 'standard', url: '/avatars/avatar_standard.jpg', label: 'Alex' },
  { id: 'ellen', url: '/avatars/avatar_ellen.jpg', label: 'Ellen' },
  { id: 'james', url: '/avatars/avatar_james.jpg', label: 'James' },
  { id: 'amy', url: '/avatars/avatar_amy.jpg', label: 'Amy' },
  { id: 'juniper', url: '/avatars/avatar_juniper.jpg', label: 'Juniper' },
  { id: 'mark', url: '/avatars/avatar_mark.jpg', label: 'Mark' },
  { id: 'arabella', url: '/avatars/avatar_arabella.jpg', label: 'Arabella' },
  { id: 'jane', url: '/avatars/avatar_jane.jpg', label: 'Jane' },
  { id: 'hope', url: '/avatars/avatar_hope.jpg', label: 'Hope' },
];

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
  el_v3_0: '/avatars/avatar_tpl_3.jpg',
  el_v3_1: '/avatars/avatar_tpl_1.jpg',
  el_v3_2: '/avatars/avatar_james.jpg',
  el_v3_3: '/avatars/avatar_mark.jpg',
  el_v3_4: '/avatars/avatar_tpl_2.jpg',
  el_v3_5: '/avatars/avatar_standard.jpg',
  el_v3_6: '/avatars/avatar_tpl_1.jpg',
  el_v3_7: '/avatars/avatar_amy.jpg',
  el_v3_8: '/avatars/avatar_juniper.jpg',
  el_v3_9: '/avatars/avatar_hope.jpg',
  el_v3_10: '/avatars/avatar_tpl_3.jpg',
  el_v3_11: '/avatars/avatar_arabella.jpg',
  el_v3_12: '/avatars/avatar_standard.jpg',
  el_v3_13: '/avatars/avatar_james.jpg',
  el_v3_14: '/avatars/avatar_tpl_1.jpg',
};

export function getVoiceAvatar(voice?: { id?: string; avatar?: string; name?: string } | null): string {
  if (!voice) return '/avatars/avatar_standard.jpg';
  if (voice.avatar) return voice.avatar;
  if (voice.id && PRESET_AVATAR_MAP[voice.id]) {
    return PRESET_AVATAR_MAP[voice.id];
  }
  return '/avatars/avatar_tpl_1.jpg';
}
