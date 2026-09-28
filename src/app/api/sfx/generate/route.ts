import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { prompt, kaggleUsername, kaggleKey } = body;

    let username = kaggleUsername ? kaggleUsername.trim() : null;
    let token = kaggleKey ? kaggleKey.trim() : null;
    let slug = 'genvoice-sfx-generator';

    if (!username || !token) {
      username = process.env.KAGGLE_USERNAME || null;
      token = process.env.KAGGLE_TOKEN || process.env.KAGGLE_KEY || null;
    }

    if (!username || !token) {
      return NextResponse.json({ error: 'Kaggle credentials not provided or not configured on server.' }, { status: 500 });
    }

    // Prepare Python script for SFX generation
    const pythonScript = `
import os
import sys
import subprocess

# Stable Audio Open requires torchsde for the DPM-Solver
subprocess.check_call([sys.executable, "-m", "pip", "install", "torchsde", "-q"])

import glob
import torch
import soundfile as sf
from diffusers import StableAudioPipeline
import json

PROMPT = json.loads('''${JSON.stringify(prompt || 'Cinematic explosion')}''')
OUTPUT_PATH = "/kaggle/working/sfx_output.wav"

def find_dataset_path(base_dir):
    paths = glob.glob(f"{base_dir}/**/model_index.json", recursive=True)
    if paths:
        return os.path.dirname(paths[0])
    return base_dir

DATASET_PATH = find_dataset_path("/kaggle/input")

def generate_sfx():
    print(f"Loading model offline from {DATASET_PATH}...")
    pipe = StableAudioPipeline.from_pretrained(
        DATASET_PATH, 
        torch_dtype=torch.float16, 
        local_files_only=True
    )
    pipe = pipe.to("cuda")

    print(f"Generating SFX for prompt: '{PROMPT}'")
    audio = pipe(
        PROMPT,
        audio_end_in_s=8.0,
        num_inference_steps=100
    ).audios

    output = audio[0].T.cpu().numpy()
    
    print(f"Saving to {OUTPUT_PATH}")
    sf.write(OUTPUT_PATH, output.astype('float32'), pipe.vae.sampling_rate, subtype='PCM_16')
    print("DONE")

if __name__ == "__main__":
    generate_sfx()
`;

    const payload = {
      slug: `${username}/${slug}`,
      newTitle: "GenVoice SFX Generator",
      text: pythonScript,
      language: "python",
      kernelType: "script",
      isPrivate: true,
      enableGpu: true,
      enableInternet: true,
      datasetDataSources: ["daijizaiten/voicegen-sound-effect"],
      competitionDataSources: [],
      kernelDataSources: [],
      modelDataSources: [],
      categoryIds: []
    };

    const cleanUsername = username.trim();
    const cleanToken = token.trim();

    let authHeader = '';
    if (cleanToken.length === 32 && /^[0-9a-f]+$/i.test(cleanToken)) {
      authHeader = 'Basic ' + Buffer.from(`${cleanUsername}:${cleanToken}`).toString('base64');
    } else {
      authHeader = 'Bearer ' + cleanToken;
    }

    const payloadString = JSON.stringify(payload);

    const kaggleRes = await fetch('https://www.kaggle.com/api/v1/kernels/push', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000)
    });

    const kaggleText = await kaggleRes.text();
    let kaggleData: any = {};
    try {
      kaggleData = JSON.parse(kaggleText);
    } catch (e) {
      return NextResponse.json({ error: `Kaggle returned non-JSON. Status: ${kaggleRes.status}. Body: ${kaggleText.substring(0, 200)}` }, { status: 502 });
    }

    if (!kaggleRes.ok) {
      return NextResponse.json({ error: `Kaggle API error ${kaggleRes.status}: ${JSON.stringify(kaggleData)}` }, { status: 502 });
    }

    // Wait a brief moment before returning success to ensure Kaggle has registered the push
    await new Promise(r => setTimeout(r, 2000));

    return NextResponse.json({ success: true, kernel: `${username}/${slug}` });

  } catch (err: any) {
    console.error('[GENERATE SFX API] Error:', err);
    return NextResponse.json({ error: `Internal error: ${err.message}` }, { status: 500 });
  }
}
