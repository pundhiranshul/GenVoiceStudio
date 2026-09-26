import { NextResponse } from 'next/server';

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

async function recommendVoices(token: string, baseUri: string, text: string, voices: any[]) {
  const cleanBaseUri = baseUri.replace(/\/$/, '');
  const url = `${cleanBaseUri}/openapi/chat/completions`;
  
  const prompt = `You are a helpful casting director AI. You are given a script and a list of available voice actors.
Analyze the script and recommend 3 to 4 voices that would be the best fit for it.
Respond with a JSON array where each object has:
- "id": The ID of the voice
- "name": The name of the voice
- "reason": A short sentence on why this voice fits the script

Do NOT wrap the response in markdown blocks like \`\`\`json. Return only the raw JSON array.

Available voices:
${JSON.stringify(voices.map(v => ({ id: v.id, name: v.name })), null, 2)}

Script:
${text}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'google/gemini-3.7-flash', 
      messages: [{ role: 'user', content: prompt }]
    })
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Model proxy error (${res.status}): ${errText}`);
  }
  
  const data = await res.json();
  if (data.choices && data.choices.length > 0 && data.choices[0].message) {
    let content = data.choices[0].message.content;
    try {
      if (content.startsWith('\`\`\`json')) {
        content = content.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      }
      return JSON.parse(content);
    } catch (err) {
      throw new Error('Failed to parse AI response as JSON: ' + content);
    }
  }
  throw new Error('Unexpected response format from model proxy');
}

export async function POST(req: Request) {
  try {
    const { text, voices, password, username: reqUsername, key: reqKey, modelProxyKey, modelProxyExpiresAt } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text' }, { status: 400 });
    }
    if (!voices || voices.length === 0) {
      return NextResponse.json({ error: 'Missing voices list' }, { status: 400 });
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

    let recommendations = [];
    try {
      recommendations = await recommendVoices(currentToken, currentBaseUri, text, voices);
    } catch (e: any) {
      if (!didJustMint && (e.message.includes('Model proxy error (401)') || e.message.includes('Model proxy error (403)'))) {
        const mintRes = await mintProxyToken(username, key);
        currentToken = mintRes.token;
        currentExpiry = mintRes.expiryTime;
        currentBaseUri = mintRes.baseUri;
        
        recommendations = await recommendVoices(currentToken, currentBaseUri, text, voices);
      } else {
        throw e;
      }
    }

    return NextResponse.json({ 
      success: true, 
      recommendations,
      modelProxyKey: currentToken,
      modelProxyExpiresAt: currentExpiry,
      modelProxyBaseUri: currentBaseUri
    });

  } catch (error: any) {
    console.error("Voice Recommend Gen Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
