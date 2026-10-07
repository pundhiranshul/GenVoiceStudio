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
  
  const prompt = `You are a helpful AI assistant for optimizing prompts meant for Voice Design. 
You are given a rough idea or prompt for a voice.
Please optimize the prompt by enhancing it with descriptive words about age, gender, accent, tone, and character. Keep the optimized prompt under 2 sentences.
Additionally, you MUST suggest a short, catchy, and unique name for this voice (e.g. "Grumpy Old Wizard", "Sweet British Nanny", "Energetic Tech Bro", "Serena", "Caleb", etc).
${instruction ? `User's specific instruction: ${instruction}\n` : ''}

You MUST return the output as a valid JSON object with EXACTLY two keys:
{
  "name": "The suggested short name",
  "prompt": "The optimized voice design prompt"
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
      // Fallback
      parsedResult = {
        name: "Optimized Voice",
        prompt: optimizedResult
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
