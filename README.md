<div align="center">
  <img src="src/app/icon.svg" alt="GenVoice Studio Logo" width="128" height="128" />
</div>

<h1 align="center">GenVoice Studio</h1>

<p align="center"><strong>AI-powered voice cloning & generation from text — built on Kaggle GPU infrastructure.</strong></p>

<p align="center">
GenVoice Studio lets you clone a voice or design a new one and synthesize any text at broadcast quality, all from a seamless, mobile-responsive web interface. No GPU required on your end — generation runs on a free Kaggle T4 GPU via their API.
</p>

<p align="center">Powered by <a href="https://huggingface.co/BreezeBlue/Breeze-TTS-2">Breeze TTS 2</a>.</p>

<h3 align="center">
  <a href="https://gen-voice-eight.vercel.app/">🔥 Try GenVoice Studio Live Now! 🔥</a>
</h3>

---

<div align="center">

## 💸 **The Ultimate Free Alternative to ElevenLabs**

# **GenVoice Studio is an entirely FREE, practically UNLIMITED voice cloning, text-to-speech, and AI story writing studio.**

Unlike corporate TTS services that trap you behind paywalls, **GenVoice Studio** bypasses them completely by tapping into **Kaggle's Free GPU and AI Credits**.

| Feature | 🏢 ElevenLabs & Competitors | 🎙️ GenVoice Studio |
| :--- | :--- | :--- |
| **Pricing** | Pay-per-character pricing tiers | **100% Free** broadcast-quality voice cloning |
| **Limits** | Strict token quotas and rate limits | **Practically Unlimited** (30 free T4 GPU hours/week) |
| **AI Story Writing** | Requires expensive external API integrations | **Free built-in AI** (DeepSeek R1, Gemini, Claude) |
| **Infrastructure** | Expensive proprietary subscriptions | **Zero-Cost Operation** via Vercel & Kaggle |

</div>

---


## 🌟 Key Features

- **Voice Clone & Voice Design**
  - **Voice Clone:** Upload any custom audio clip (WAV/MP3) to instantly clone a speaker's voice.
  - **Voice Design:** Create an entirely new voice from scratch simply by describing it (e.g., "A raspy old man with a British accent").
- **✨ AI Write Story** 
  - Need a script? Use the built-in AI story generator. Pick a topic, tone (e.g., Dramatic, Funny), and length, and it uses Kaggle's LLM endpoints to write an expressive script with vocal cues like `(laugh)` and `(sigh)`.
- **⚡ Pipelined Dual-GPU Load Balancing**
  - To generate long texts quickly, the backend uses Kaggle's dual T4x2 GPU setup.
  - An intelligent threaded pipeline loads the 7GB model onto `cuda:0` and immediately begins generating chunk 1. Simultaneously, a background shadow thread pulls the model from the Linux OS page cache directly onto `cuda:1`, allowing perfect overlapping of generation tasks to cut multi-sentence inference times in half.
- **Studio-Grade Editor**
  - Live progress bars and ETA countdowns for ongoing generations.
  - Granular chunk editor: Switch between **Crossfade** (smooth blending) and **Trim** (hard cut) for individual sentences, and preview immediately.
- **BYOK (Bring Your Own Kaggle) & Admin Auth**
  - Users can authenticate directly on the site using their own Kaggle Username/Key.
  - Site owners can use an Admin Password to fall back to server-configured credentials.

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
3. **Pipelined Compute:** A Kaggle T4 GPU spins up, executes optimal Python threads to initialize two model runtimes across the GPUs, and seamlessly processes instructions natively in memory.
4. **Resilient Polling:** The `/api/status` route persistently polls Kaggle's status endpoints. It intelligently ignores transient network drops (like 503s/504s) and parses live progress.
5. **Retrieval:** Upon completion, the API fetches the final `.wav` outputs directly from Kaggle's artifact storage.

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- A [Kaggle account](https://www.kaggle.com/) with API access enabled
- A Kaggle API key (`kaggle.json` → username + key)
- A [HuggingFace account](https://huggingface.co/) for an Access Token (to bypass download rate limits)

### Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/pundhiranshul/genVoice.git
   cd genVoice
   npm install
   ```

2. **Configure your Kaggle Account (Crucial for Speed!):**
   - Go to your Kaggle Account Settings -> **Secrets**.
   - Add a new secret named `HF_TOKEN` and paste your HuggingFace Access Token. 
   - *Without this, the 7GB model download will hit HuggingFace's unauthenticated rate limit and cause the generation pipeline to fail or crawl.*

3. **Create a `.env.local` file:**
   ```env
   # Fallback credentials used when logging in via 'Admin Mode'
   KAGGLE_USERNAME=your_kaggle_username
   KAGGLE_TOKEN=your_kaggle_api_key
   KAGGLE_KERNEL_SLUG=genvoice-api
   APP_PASSWORD=your_chosen_admin_password
   ```

4. **Run the development server:**
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

- **Cold Starts:** Kaggle container startup + dependency initialization takes roughly ~30-60 seconds.
- **Kaggle Quotas:** Free Kaggle tiers provide 30 GPU hours/week per account.
- **API Timeouts:** Next.js Serverless functions time out after 10–15s on Vercel's free tier. GenVoice gracefully bypasses this by strictly separating the Kaggle execution trigger (`/api/generate`) from the asynchronous UI status loop (`/api/status`).

---

## 📄 License

MIT License. See [LICENSE](./LICENSE) for details.
