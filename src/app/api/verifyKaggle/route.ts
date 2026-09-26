import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { kaggleUsername, kaggleKey } = await req.json();

    if (!kaggleUsername || !kaggleKey) {
      return NextResponse.json({ error: 'Username and API Key are required' }, { status: 400 });
    }

    const cleanUsername = kaggleUsername.trim();
    const cleanToken = kaggleKey.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    // Push a tiny dummy script that requests internet access
    const payload = {
      slug: `${cleanUsername}/genvoice-verify`,
      newTitle: "GenVoice Verify",
      text: "print('Verification successful.')",
      language: "python",
      kernelType: "script",
      isPrivate: true,
      enableGpu: false,
      enableInternet: true,
      datasetDataSources: [],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: []
    };

    const kaggleRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const kaggleData = await kaggleRes.text();
    
    if (!kaggleRes.ok) {
      if (kaggleRes.status === 401) {
        return NextResponse.json({ error: 'Invalid Kaggle credentials.' }, { status: 401 });
      }
      return NextResponse.json({ error: `Kaggle API Error: ${kaggleData}` }, { status: kaggleRes.status });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(kaggleData);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid response from Kaggle API' }, { status: 500 });
    }

    if (parsedData.hasError || parsedData.error) {
      const errorMsg = parsedData.error || parsedData.hasError;
      if (errorMsg.includes("Internet") || errorMsg.includes("phone verification")) {
        return NextResponse.json({ 
          error: 'Your Kaggle account requires phone verification to use internet in notebooks. Please verify your phone number in Kaggle settings.' 
        }, { status: 403 });
      }
      return NextResponse.json({ error: `Kaggle Push Error: ${errorMsg}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
