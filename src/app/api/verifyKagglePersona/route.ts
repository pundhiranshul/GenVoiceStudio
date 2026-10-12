import { NextResponse } from 'next/server';

const KAGGLE_PROXY_MINT_URL = 'https://www.kaggle.com/api/v1/models.ModelProxyApiService/CreateDefaultModelProxyToken';

export async function POST(req: Request) {
  try {
    const { kaggleUsername, kaggleKey } = await req.json();

    if (!kaggleUsername || !kaggleKey) {
      return NextResponse.json({ verified: false, error: 'Username and API Key are required' }, { status: 400 });
    }

    const cleanUsername = kaggleUsername.trim();
    const cleanToken = kaggleKey.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    // Step 1: Mint proxy token
    let mintRes;
    try {
      mintRes = await fetch(KAGGLE_PROXY_MINT_URL, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
    } catch (netErr: any) {
      return NextResponse.json({ verified: false, error: 'Network error connecting to Kaggle' }, { status: 502 });
    }

    if (!mintRes.ok) {
      const errText = await mintRes.text();
      if (mintRes.status === 401) {
        return NextResponse.json({ verified: false, error: 'Invalid Kaggle credentials' }, { status: 401 });
      }
      if (mintRes.status === 403 || errText.toLowerCase().includes('verif') || errText.toLowerCase().includes('identity')) {
        return NextResponse.json({ verified: false, error: 'Kaggle Identity Verification required' });
      }
      return NextResponse.json({ verified: false, error: `Failed to initialize model proxy: ${errText}` });
    }

    const mintData = await mintRes.json();
    const token = mintData.token;
    const baseUri = mintData.baseUri || 'https://mp-staging.kaggle.net/models';
    const expiryTime = mintData.expiryTime;

    if (!token) {
      return NextResponse.json({ verified: false, error: 'No token received from Kaggle' });
    }

    // Step 2: Test ping model proxy with minimal 1-token request
    const cleanBaseUri = baseUri.replace(/\/$/, '');
    const url = `${cleanBaseUri}/openapi/chat/completions`;

    try {
      const testRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'google/gemini-3.7-flash',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      if (testRes.ok) {
        return NextResponse.json({
          verified: true,
          modelProxyKey: token,
          modelProxyExpiresAt: expiryTime,
          modelProxyBaseUri: cleanBaseUri
        });
      }

      const testErrText = await testRes.text();
      if (testRes.status === 403 || testErrText.toLowerCase().includes('verif') || testErrText.toLowerCase().includes('permission') || testErrText.toLowerCase().includes('denied')) {
        return NextResponse.json({
          verified: false,
          error: 'Identity verification (Persona) not completed on Kaggle.'
        });
      }

      return NextResponse.json({
        verified: false,
        error: `AI access check failed: ${testErrText}`
      });
    } catch (e: any) {
      return NextResponse.json({
        verified: false,
        error: `Failed to ping AI model endpoint: ${e.message}`
      });
    }

  } catch (error: any) {
    return NextResponse.json({ verified: false, error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
