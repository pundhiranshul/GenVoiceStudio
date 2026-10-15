import { NextResponse } from 'next/server';
import { sanitizeText } from '@/utils/sanitizeText';
import { AUDIO_TAGS_STRING } from '@/utils/audioTags';

const KAGGLE_PROXY_MINT_URL = 'https://www.kaggle.com/api/v1/models.ModelProxyApiService/CreateDefaultModelProxyToken';

async function mintProxyToken(username: string | null, key: string) {
  let authHeader = '';
  if (key.length === 32 && /^[0-9a-f]+$/i.test(key)) {
    authHeader = 'Basic ' + Buffer.from(`${username}:${key}`).toString('base64');
  } else {
    authHeader = 'Bearer ' + key;
  }
  
  const res = await fetch(KAGGLE_PROXY_MINT_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  });
  
  if (!res.ok) {
    throw new Error(`Failed to mint proxy token: ${res.status} ${res.statusText}`);
  }
  
  const data = await res.json();
  return {
    token: data.token,
    baseUri: data.baseUri,
    expiryTime: data.expiryTime
  };
}

async function optimizeDesign(token: string, baseUri: string, text: string, instruction: string, model: string = 'google/gemini-3.7-flash') {
  const cleanBaseUri = baseUri.replace(/\/$/, '');
  const url = `${cleanBaseUri}/openapi/chat/completions`;
  
  const prompt = `You are an expert AI assistant specializing in Voice Design prompt engineering and voice persona creation.
You are given a rough idea, premise, or draft instruction for a synthetic voice.

Tasks:
1. OPTIMIZE THE PROMPT ("prompt"):
   Enhance the voice design prompt with specific vocal characteristics: age, gender, nationality/accent, vocal timbre/tone (e.g. gravelly, warm, crisp, resonant, soft-spoken), pacing, and speaking style. Keep the prompt concise and under 2 sentences.

2. SUGGEST AN ACCURATE VOICE PERSONA NAME ("name"):
   IMPORTANT: This voice name is directly used by an AI image generation model to generate an authentic photographic portrait avatar for the designed voice.
   - POPULAR PERSONALITIES / CELEBRITIES / HISTORICAL FIGURES:
     If the user's input refers to, mentions, or describes a specific famous or popular person, historical figure, leader, celebrity, or iconic figure (e.g. "Mahatma Gandhi", "Albert Einstein", "Morgan Freeman", "Steve Jobs", "Winston Churchill", "Barack Obama", "Sherlock Holmes"), the voice name MUST be their real full name (e.g. "Mahatma Gandhi", "Albert Einstein", "Morgan Freeman"). NEVER replace a real famous personality with a generic description like "Elderly Indian Spiritual Leader" or "Famous Theoretical Physicist". Using their actual full name is required so the AI image model can generate their true likeness.
   - FICTIONAL OR ORIGINAL PERSONAS:
     If the voice is not a specific famous figure, provide a descriptive persona name specifying demographic and visual attributes such as age group, gender, nationality/ethnicity, and character archetype (e.g. "Elderly Scottish Storyteller", "Young British Female Detective", "Middle-Aged Deep-Voiced Executive", "Wise Buddhist Monk", "Cheerful Californian Surfer Guy", "Warm Southern Grandma").
   - DO NOT use generic single first names alone (such as "Caleb", "Serena", "David", "Emma") unless it's a globally recognized mononym, and DO NOT use abstract labels (such as "Voice 1", "Echo", "Synthesizer").
   - Keep the name concise: between 2 to 4 words.

${instruction ? `User's specific instruction: ${instruction}\n` : ''}

You MUST return the output as a valid JSON object with EXACTLY two keys:
{
  "name": "The suggested full name (for famous figures) or descriptive persona name (2-4 words)",
  "prompt": "The optimized voice design prompt (under 2 sentences)"
}
Do NOT return markdown formatting like \`\`\`json. Return ONLY the raw JSON object.

Original text:
${text}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: model, 
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Model proxy error (${res.status}): ${errText}`);
  }
  
  const data = await res.json();
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  throw new Error('Unexpected response format from model proxy');
}

export async function POST(req: Request) {
  try {
    const { text, instruction, password, username: reqUsername, key: reqKey, modelProxyKey, modelProxyExpiresAt, aiModel } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }

    let username = reqUsername ? reqUsername.trim() : null;
    let key = reqKey ? reqKey.trim() : null;

    if (username && key) {
      // Using custom credentials
    } else {
      // Using shared credentials
      if (password !== (process.env.APP_PASSWORD || 'secret')) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
      username = process.env.KAGGLE_USERNAME || null;
      key = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null;
    }

    if (!key) {
      return NextResponse.json({ error: 'Kaggle credentials not provided or not configured on server.' }, { status: 500 });
    }

    let currentToken = modelProxyKey;
    let currentExpiry = modelProxyExpiresAt;
    let currentBaseUri = 'https://mp-staging.kaggle.net/models'; 
    let didJustMint = false;

    if (currentToken && currentExpiry) {
      const expiryDate = new Date(currentExpiry);
      const now = new Date();
      const fiveMinsFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (expiryDate <= fiveMinsFromNow) {
        currentToken = null; 
      }
    } else {
      currentToken = null;
    }

    if (!currentToken) {
      const mintRes = await mintProxyToken(username, key);
      currentToken = mintRes.token;
      currentExpiry = mintRes.expiryTime;
      currentBaseUri = mintRes.baseUri;
      didJustMint = true;
    }

    let optimizedResult = '';
    try {
      optimizedResult = await optimizeDesign(currentToken, currentBaseUri, text, instruction, aiModel);
    } catch (e: any) {
      if (!didJustMint && (e.message.includes('Model proxy error (401)') || e.message.includes('Model proxy error (403)'))) {
        const mintRes = await mintProxyToken(username, key);
        currentToken = mintRes.token;
        currentExpiry = mintRes.expiryTime;
        currentBaseUri = mintRes.baseUri;
        
        optimizedResult = await optimizeDesign(currentToken, currentBaseUri, text, instruction, aiModel);
      } else {
        throw e;
      }
    }

    let parsedResult;
    try {
      const cleanedResult = optimizedResult.replace(/```json\n?|\n?```/g, '').trim();
      parsedResult = JSON.parse(cleanedResult);
    } catch (e) {
      console.error("Failed to parse JSON from AI:", optimizedResult);
      // Fallback: derive a descriptive persona snippet from text
      const cleanSnippet = text.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/).slice(0, 4).join(' ');
      parsedResult = {
        name: cleanSnippet || "Custom AI Voice Persona",
        prompt: optimizedResult.replace(/```[\s\S]*?```/g, '').trim() || text
      };
    }

    return NextResponse.json({ 
      success: true, 
      optimizedText: parsedResult.prompt,
      suggestedName: parsedResult.name,
      modelProxyKey: currentToken,
      modelProxyExpiresAt: currentExpiry,
      modelProxyBaseUri: currentBaseUri
    });

  } catch (error: any) {
    console.error("Optimize Gen Error:", error);
    const msg = error.message || "";
    if (msg.includes('403') || msg.toLowerCase().includes('verif') || msg.toLowerCase().includes('identity') || msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
      return NextResponse.json({ 
        error: "Kaggle Identity Verification required: Google Gemini AI features require camera verification at https://www.kaggle.com/settings to prevent bot abuse.",
        requiresPersona: true
      }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
