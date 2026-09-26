export function sanitizeText(text: string): string {
  if (!text) return text;
  
  let cleanText = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/…/g, '...');

  cleanText = cleanText
    .replace(/\(laughs\)/gi, '(laugh)')
    .replace(/\(sighs\)/gi, '(sigh)')
    .replace(/\(coughs\)/gi, '(cough)');
    
  cleanText = cleanText.replace(/\([^)]+\)/g, (match: string) => {
    const lowerMatch = match.toLowerCase();
    if (['(laugh)', '(sigh)', '(cough)', '(clears throat)'].includes(lowerMatch)) {
      return lowerMatch;
    }
    console.warn(`[SANITIZE API] Stripped unsupported tag: ${match}`);
    return ''; // Strip unsupported tags
  });
  
  return cleanText.replace(/ +/g, ' ').trim();
}
