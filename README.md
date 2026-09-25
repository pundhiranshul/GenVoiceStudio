<div align="center">
  <img src="src/app/icon.svg" alt="GenVoice Studio Logo" width="128" height="128" />
</div>

<h1 align="center">GenVoice Studio</h1>

<p align="center"><strong>AI-powered voice cloning from text — built on Kaggle GPU infrastructure.</strong></p>

<p align="center">
GenVoice Studio lets you clone a voice and synthesize any text at broadcast quality, all from a web interface.
No GPU required on your end — generation runs on a free Kaggle T4 GPU via their API.
</p>

<p align="center">Built with <a href="https://huggingface.co/BreezeBlue/Breeze-TTS-2">Breeze TTS 2</a> by BreezeBlue.</p>

---

## Features

- **Voice cloning from a reference clip** — uses a LibriSpeech sample to clone a voice style
- **Smart generation routing** — short text (<100 words) uses a fast single-shot pass; long text automatically switches to sentence-level chunked generation with crossfade stitching to prevent GPU out-of-memory
- **Real-time chunk progress** — see each sentence being generated with a live progress bar and ETA countdown
- **All outputs surfaced** — reference audio, individual sentence chunks, stitched final audio all available for playback and download
- **Serverless** — hosted on Vercel with no persistent backend; all compute happens on Kaggle

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React, Tailwind CSS |
| Backend | Next.js API Routes (Edge-compatible) |
| AI Model | [Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2) |
| GPU Compute | Kaggle Notebooks API (T4 x2) |
| Deployment | Vercel |

---

## How It Works

```
User submits text
       │
       ▼
/api/generate (Next.js)
  - Injects text into Kaggle notebook
  - Detects short vs long text
  - Pushes notebook to Kaggle API
       │
       ▼
Kaggle T4 GPU executes notebook
  1. Clone breeze-tts repo + install deps
  2. Download Breeze TTS 2 checkpoint (HuggingFace)
  3. Build reference voice from LibriSpeech
  4. Generate audio (single-shot or chunked)
  5. Save .wav outputs to /kaggle/working/
       │
       ▼
/api/status (Next.js) polls Kaggle every 10s
  - Parses partial logs for chunk progress
  - On complete: fetches all .wav files (paginated)
  - Downloads in parallel, returns as base64
       │
       ▼
Frontend plays reference, chunks, and final audio
```

---

## Local Development

### Prerequisites
- Node.js 18+
- A [Kaggle account](https://www.kaggle.com/) with API access enabled
- A Kaggle API key (`kaggle.json` → username + key)

### Setup

```bash
git clone https://github.com/pundhiranshul/genVoice.git
cd genVoice
npm install
```

Create `.env.local`:

```env
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_TOKEN=your_kaggle_api_key
KAGGLE_KERNEL_SLUG=genvoice-api
APP_PASSWORD=your_chosen_password
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set the same environment variables (`KAGGLE_USERNAME`, `KAGGLE_TOKEN`, `KAGGLE_KERNEL_SLUG`, `APP_PASSWORD`) in the Vercel dashboard
4. Deploy

---

## Limitations

- **Generation time:** 5–15 minutes per request (dominated by Kaggle container startup + model loading, ~2 min; actual inference ~3–10 min depending on text length)
- **Kaggle GPU quota:** Free tier provides 30 GPU hours/week
- **Vercel function timeout:** Status polling calls are capped at 10s per invocation; audio download calls use AbortSignal timeouts to stay within limits
---

## License

MIT License. See [LICENSE](./LICENSE) for details.
