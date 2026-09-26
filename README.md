<div align="center">
  <img src="src/app/icon.svg" alt="GenVoice Studio Logo" width="128" height="128" />
</div>

<h1 align="center">GenVoice Studio</h1>

<p align="center"><strong>AI-powered voice cloning & generation from text — built on Kaggle GPU infrastructure.</strong></p>

<p align="center">
GenVoice Studio lets you clone a voice or design a new one and synthesize any text at broadcast quality, all from a seamless, mobile-responsive web interface. No GPU required on your end — generation runs on a free Kaggle T4 GPU via their API.
</p>

<p align="center">Powered by <a href="https://huggingface.co/BreezeBlue/Breeze-TTS-2">Breeze TTS 2</a>.</p>

---

## 🌟 Key Features

- **Voice Clone & Voice Design**
  - **Voice Clone:** Upload any custom audio clip (WAV/MP3) to instantly clone a speaker's voice.
  - **Voice Design:** Create an entirely new voice from scratch simply by describing it (e.g., "A raspy old man with a British accent").
- **✨ AI Write Story** 
  - Need a script? Use the built-in AI story generator. Pick a topic, tone (e.g., Dramatic, Funny), and length, and it uses Kaggle's LLM endpoints to write an expressive script with vocal cues like `(laugh)` and `(sigh)`.
- **Smart Generation Routing & Chunking**
  - Short text is generated rapidly in a single pass.
  - Long text is automatically chunked at the sentence level to prevent GPU out-of-memory errors. 
- **Studio-Grade Editor**
  - Live progress bars and ETA countdowns for ongoing generations.
  - Granular chunk editor: Switch between **Crossfade** (smooth blending) and **Trim** (hard cut) for individual sentences, and preview immediately.
  - **Result Mode:** Once audio is generated, the UI cleanly transforms into a focused result player, with quick options to Retry or start a New Script.
- **BYOK (Bring Your Own Kaggle) & Admin Auth**
  - Users can authenticate directly on the site using their own Kaggle Username/Key (no server config required).
  - Site owners can use an Admin Password to fall back to server-configured `.env` credentials.
- **Serverless & Resilient**
  - Fully serverless frontend and middleware hosted on Vercel. 
  - Heavily optimized polling mechanism with transient error resilience (transparently handles Kaggle 503s during long-running notebook sessions).

---

## 🏗️ Stack & Architecture

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React, Tailwind CSS |
| Backend | Next.js API Routes (Edge-compatible) |
| AI Model | [Breeze TTS 2](https://huggingface.co/BreezeBlue/Breeze-TTS-2) |
| Compute Engine | Kaggle Notebooks API (T4 x2) + Kaggle LLM API |
| Deployment | Vercel |

### How It Works

1. **Authentication:** The frontend mints an OAuth model proxy token via Kaggle's API using the user's (or admin's) credentials.
2. **Execution:** The `/api/generate` route pushes a dynamic Jupyter Notebook to Kaggle via the `kernel-push` API. 
3. **Compute:** A Kaggle T4 GPU spins up, installs dependencies, loads Breeze TTS 2, processes the instructions (cloning or designing), and generates the WAV outputs.
4. **Resilient Polling:** The `/api/status` route persistently polls Kaggle's status endpoints. It intelligently ignores transient network drops (like 503s/504s) and parses live progress.
5. **Retrieval:** Upon completion, the API fetches the final `.wav` outputs (or chunks) directly from Kaggle's artifact storage and delivers them to the user.

---

## 🚀 Local Development

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

Create a `.env.local` file:

```env
# Fallback credentials used when logging in via 'Admin Mode'
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_TOKEN=your_kaggle_api_key
KAGGLE_KERNEL_SLUG=genvoice-api
APP_PASSWORD=your_chosen_admin_password
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## ☁️ Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the environment variables (`KAGGLE_USERNAME`, `KAGGLE_TOKEN`, `KAGGLE_KERNEL_SLUG`, `APP_PASSWORD`) in your Vercel project settings.
4. Deploy!

---

## ⚠️ Limitations

- **Generation time:** Kaggle container startup + model loading takes roughly ~2 minutes. Actual inference takes an additional 1-5+ minutes depending on text length.
- **Kaggle Quotas:** Free Kaggle tiers provide 30 GPU hours/week per account.
- **API Timeouts:** Next.js Serverless functions time out after 10–15s on Vercel's free tier. GenVoice avoids this by strictly separating the trigger (`/api/generate`) from the asynchronous status loop (`/api/status`).

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
