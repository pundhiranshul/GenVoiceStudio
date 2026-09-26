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

    const scriptCode = `
import requests
import json
import traceback

results = {"internet": False, "gpu": False, "error": None}

# Check Internet
try:
    requests.get("https://github.com", timeout=10)
    results["internet"] = True
    print("INTERNET: SUCCESS")
except Exception as e:
    results["internet"] = False
    results["error"] = f"Internet failed: {e}"
    print(f"INTERNET: FAILED - {e}")

# Check GPU
try:
    import torch
    if torch.cuda.is_available():
        results["gpu"] = True
        print("GPU: SUCCESS")
    else:
        results["gpu"] = False
        results["error"] = "CUDA is not available. GPU allocation failed."
        print("GPU: FAILED - CUDA not available")
except Exception as e:
    results["gpu"] = False
    print(f"GPU: FAILED - {e}")

with open("/kaggle/working/verify_results.json", "w") as f:
    json.dump(results, f)

print(f"FINAL_RESULT: {json.dumps(results)}")
`;

    const payload = {
      slug: `${cleanUsername}/genvoice-verify`,
      newTitle: "GenVoice Verify",
      text: scriptCode,
      language: "python",
      kernelType: "script",
      isPrivate: true,
      enableGpu: true,
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
      if (errorMsg.includes("Internet") || errorMsg.includes("phone verification") || errorMsg.includes("GPU")) {
        return NextResponse.json({ 
          error: 'Your Kaggle account requires phone verification to use internet and free GPUs. Please verify your phone number in Kaggle settings.' 
        }, { status: 403 });
      }
      return NextResponse.json({ error: `Kaggle Push Error: ${errorMsg}` }, { status: 400 });
    }

    let actualKernelRef = `${cleanUsername}/genvoice-verify`;
    if (parsedData.ref) {
      actualKernelRef = parsedData.ref.replace(/^\/code\//, '');
    } else if (parsedData.url) {
      const urlParts = parsedData.url.split('/');
      actualKernelRef = `${urlParts[urlParts.length - 2]}/${urlParts[urlParts.length - 1]}`;
    }

    return NextResponse.json({ success: true, ref: actualKernelRef });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'An unexpected error occurred' }, { status: 500 });
  }
}
