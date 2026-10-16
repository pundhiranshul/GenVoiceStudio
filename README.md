<div align="center">

  <img src="src/app/icon.svg" alt="GenVoice Studio Logo" width="96" height="96" />

  # GenVoice Studio

  **Broadcast-quality voice cloning, neural text-to-speech, and expressive audio synthesis — powered by free Kaggle GPU infrastructure.**

  [![Live Demo](https://img.shields.io/badge/Demo-Live_Studio-6366f1?style=flat-square&logo=vercel&logoColor=white)](https://gen-voice-eight.vercel.app/)
  [![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v3-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Compute](https://img.shields.io/badge/Kaggle-Dual_T4_GPUs-20beff?style=flat-square&logo=kaggle&logoColor=white)](https://www.kaggle.com/)
  [![Model](https://img.shields.io/badge/Breeze_TTS_2-HuggingFace-ffd21e?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co/BreezeBlue/Breeze-TTS-2)
  [![License](https://img.shields.io/badge/License-MIT-22c55e?style=flat-square)](./LICENSE)

  <p align="center">
    <a href="https://gen-voice-eight.vercel.app/" target="_blank" rel="noopener noreferrer"><strong>Explore the Live Studio →</strong></a>
    &nbsp;&nbsp;•&nbsp;&nbsp;
    <a href="https://gen-voice-eight.vercel.app/samples/genvoice_voice_1791392674247.mp3" target="_blank" rel="noopener noreferrer"><strong>▶️ Play Audio Sample ↗</strong></a>
  </p>

</div>

---

### Navigation

- [Overview](#-overview)
- [Audio Showcase & Voice Samples](#-audio-showcase--expressive-vocal-synthesis)
- [Key Features](#-key-features)
- [Architecture & Workflow](#-architecture--how-it-works)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Technical Considerations](#-technical-considerations)
- [License](#-license)

---

## 💡 Overview

**GenVoice Studio** is a full-featured, open-source audio production workstation that delivers studio-grade voice cloning, zero-shot voice design, and expressive long-form speech generation without commercial subscription fees.

Traditional speech-synthesis platforms gate broadcast-quality voices and generous character limits behind expensive monthly subscriptions. GenVoice Studio bridges the gap by orchestrating high-performance neural speech synthesis on **Kaggle's free dual T4 GPU environment**, providing studio-quality results at **zero cost**.

### Platform Comparison

| Capability | Commercial TTS (e.g. ElevenLabs) | GenVoice Studio |
| :--- | :--- | :--- |
| **Pricing Model** | Usage-based credits ($5 – $330+/month) | **100% Free & Open Source** |
| **Compute Allowance** | Strict character tiers & rate limits | **30 free T4 GPU hours/week** via Kaggle |
| **Expressive Acoustic Cues** | Limited markup or flat delivery | **Native vocal & emotional cues** (`(sigh)`, `(laughs)`, `(gulps)`, `(inhale)`) |
| **Script Generation & Optimization** | Paid external integrations required | **Built-in AI Story Studio** (DeepSeek R1, Gemini, Claude via Kaggle API) |
| **Inference Orchestration** | Standard cloud queue | **Pipelined Dual-GPU balancing** (cuts multi-sentence latency by ~50%) |
| **Audio Post-Processing** | Black-box output | **Chunk timeline editor** with Crossfade and Trim controls |
| **Data Privacy & Control** | Proprietary cloud silo | **Self-hosted Next.js app** with Bring-Your-Own-Kaggle (BYOK) auth |

---

## 🎧 Audio Showcase & Expressive Vocal Synthesis

### How GenVoice Studio Produces Sound

Unlike traditional text-to-speech engines that produce monotonous, robotic readings, GenVoice Studio utilizes **Breeze TTS 2** conditioned on both acoustic reference timbres and **in-stream expressive markup tags**. 

When generating speech, the neural acoustic pipeline interprets embedded vocal markers directly into the generated waveform:
- **Respiratory Dynamics:** Tags like `(inhale)`, `(exhale)`, `(gasp)`, and `(sigh)` introduce physiological breathing sounds and lung releases that pace the narrative.
- **Somatic Realism:** Cues like `(gulps)`, `(clears throat)`, `(cough)`, and `(sniffs)` impart authentic human cadence and tension.
- **Emotional Modulation:** Markers such as `(laughs)`, `(chuckles)`, `(moan)`, and `(pauses)` modulate pitch contour, vocal fry, and dramatic timing.

---

### Featured Generation Sample

Listen to this long-form dramatic narration generated entirely end-to-end on GenVoice Studio (*The Autobiography of Albert Einstein*):

- <a href="https://gen-voice-eight.vercel.app/samples/genvoice_voice_1791392674247.mp3" target="_blank" rel="noopener noreferrer">▶️ <strong>Play Audio Sample ↗</strong></a>
- <a href="https://github.com/pundhiranshul/GenVoiceStudio/blob/main/public/samples/genvoice_voice_1791392674247.mp3" target="_blank" rel="noopener noreferrer">🎧 <strong>Play in GitHub Audio Viewer ↗</strong></a>
- <a href="https://github.com/pundhiranshul/GenVoiceStudio/raw/main/public/samples/genvoice_voice_1791392674247.wav" target="_blank" rel="noopener noreferrer">⬇️ <strong>Download Master Audio (WAV, 24.9 MB)</strong></a>

---

### Sample Script & Acoustic Markup

Notice how acoustic tags (`(gulps)`, `(sigh)`, `(inhale)`, `(pauses)`, `(clears throat)`, `(gasp)`, etc.) are placed throughout the script to direct the pacing, tension, and breathing of the speaker:

<details open>
<summary><strong>📜 Click to View Annotated Generation Transcript</strong></summary>

<br />

> **(gulps)** Listen—listen closely. I'm going to tell you the "autobiography" of Albert Einstein, but not the one with clean equations and polite portraits. No. This one... this one has teeth. **(sigh)** I remember the night I learned that the world could be wrong in ways that made your skin crawl. I was small then—small enough that the shadows under my bed looked like they had thoughts of their own. **(inhale)** I would stare at the ceiling and wait for the darkness to move. It never hurried. It never needed to. It just... stayed. **(pauses)** My mother said I was quiet, that I watched the world like a question. **(clears throat)** She didn't understand that some questions don't ask for answers. Some questions... ask for you. **(gasp)** At school they taught me numbers, but at night I heard them whisper—like the ink in my notebook was alive. I don't mean metaphorically. I mean I'd open my book and the symbols would rearrange themselves. They slid into shapes that weren't equations. They were warnings. **(sniffs)** I'd close the book fast, and still—still I could feel the cold logic of those shapes pressing against my eyes. **(pauses)** You want the truth? Fine. I'll tell it. I walked through my childhood like it was a corridor built from cracked glass. Every time I tried to speak, my words felt delayed, like they had to travel through something thick and hungry. **(cough)** And when I laughed—when I tried to laugh—my laugh sounded wrong, like it came from someone else's throat. **(laughs)** Hear me? That laugh... that laugh doesn't comfort. It invites. I remember the train station. The clocks. The way time behaved like a frightened animal. I stood there and watched the world shift depending on where I looked, and I thought, "Good. Finally, the universe admits it's unstable." **(inhale)** But then the instability noticed me back. There was a moment—just a moment—when I felt time bend, not as a concept, but as a pressure. Like a hand closing slowly around my thoughts. **(exhale)** I couldn't tell if I was thinking, or if something else was thinking through me. And yes, I became the man with theories. I know what you've heard. You've heard about relativity like it's a friendly idea. **(sighs)** But those ideas... they came with footsteps behind them. When I wrote about speed, the paper warmed as if it had a pulse. When I wrote about light, I saw streaks in the dark that didn't belong to lightning or lamps. They were... signals. **(gasp)** People thought I was brilliant. Sometimes I felt brilliant. Sometimes I felt hunted. In cafés, when I pretended to be normal, I noticed how silence gathered around my chair. Like the air was waiting for me to say something incorrect. Like the room wanted to correct me permanently. **(sniffs)** Then came the years—years of debate, applause, invitations. I wore my smile the way you wear a mask over a wound. **(clears throat)** Each handshake felt like a transaction I didn't fully understand. Each compliment sounded like a lock turning. And the night I feared the most—oh, I still feel it in my bones—there was no lightning. No thunder. Only the steady, patient ticking of a clock somewhere in my home. **(moan)** I tried to ignore it. I tried to read. But the ticking grew sharper, like it was measuring me. I sat up in bed and whispered, "What do you want?" The room answered with a soft, distant knock—three taps—like someone on the other side of time itself. **(pauses)** I didn't sleep after that. I just... listened. **(sigh)** So here is my autobiography, spoken in the way I can still speak without being swallowed: I chased understanding, yes. I wrote, I calculated, I sought the rules of the universe. But somewhere along the line, the rules began to chase me too. **(inhale)** Not loudly. Not dramatically. Quietly—like a slow draft under a door. And if you think my theories are only about space and time... then you haven't been alone with your own equations at night. Now tell me—do you hear that? **(pauses)** That ticking? **(gasp)** It's getting closer. **(exhale)**

</details>

---

### Supported Vocal Cue Reference

The built-in script optimizer and synthesis pipeline recognize the following vocal and acoustic tags:

| Category | Supported Acoustic Tags | Effect / Role |
| :--- | :--- | :--- |
| **Breathing & Pauses** | `(sigh)`, `(sighs)`, `(gasp)`, `(inhale)`, `(exhale)`, `(pauses)` | Adjusts respiratory cadence, tension, and dramatic timing |
| **Throat & Mouth** | `(clears throat)`, `(cough)`, `(sniffs)`, `(yawns)`, `(burp)`, `(burps)`, `(gulps)` | Adds organic physical reactions and character realism |
| **Laughter** | `(laughs)`, `(chuckles)`, `(giggles)` | Modulates vocal tone with spontaneous mirth or irony |
| **Crying & Emotion** | `(cry)`, `(sob)`, `(moan)` | Injects sorrow, pain, or visceral emotional inflection |
| **Vocalization** | `(shouts)`, `(singing)`, `(sing)`, `(humming)`, `(hum)`, `(grunt)` | Alters projection, melodic tone, and effort levels |

---

## 🌟 Key Features

- **🎙️ Voice Cloning & Voice Design**
  - **Voice Cloning:** Upload any short audio sample (WAV/MP3) to replicate the speaker's vocal characteristics, timbre, and accent.
  - **Voice Design:** Synthesize novel personas purely from text descriptions (e.g., *"A raspy, seasoned detective in his 50s with a world-weary cadence"*).

- **✨ AI Story Studio & Script Optimizer**
  - Integrated script generation powered by Kaggle's LLM endpoints (DeepSeek R1, Gemini, Claude).
  - One-click script optimization that automatically injects valid acoustic tags and natural punctuation for seamless TTS delivery.

- **⚡ Pipelined Dual-GPU Architecture**
  - Orchestrates Kaggle's dual T4 GPU environment (`cuda:0` and `cuda:1`).
  - While chunk 1 is being synthesized on `cuda:0`, a background shadow worker mounts the model from the Linux OS page cache directly onto `cuda:1`, interleaving sentence generation and reducing latency by ~50%.

- **🎛️ Studio-Grade Timeline Editor**
  - Real-time generation progress and dynamic ETA estimation.
  - Granular chunk controls: configure **Crossfade** (smooth acoustic blending) or **Trim** (crisp cuts) between adjacent sentences with instant in-browser previews.

- **🔊 Sound FX & Asset Library**
  - Dedicated sound effects synthesis module (`/sfx`) for Foley and ambient audio.
  - Centralized library to store, preview, and export synthesized audio clips.

- **🔐 Flexible Authentication (BYOK & Admin Mode)**
  - **BYOK (Bring Your Own Kaggle):** End users can authenticate with their own Kaggle credentials (`kaggle.json`) directly in the client.
  - **Admin Mode:** Site administrators can supply server-level environment variables for friction-free public or team access.

---

## 🏗️ Architecture & How It Works

```
┌────────────────────────────────────────────────────────┐
│                   Next.js 16 Web App                   │
│   (Studio UI, Chunk Editor, Audio Preview, Story Gen)  │
└───────────────┬────────────────────────▲───────────────┘
                │                        │
       1. Push Kernel            4. Poll Status & Stream
                │                        │
┌───────────────▼────────────────────────┴───────────────┐
│              Next.js Edge & API Routes (Vercel)         │
│         /api/generate  •  /api/status  •  /api/story   │
└───────────────┬────────────────────────▲───────────────┘
                │                        │
       2. Kaggle API            3. WAV Artifact Retrieval
                │                        │
┌───────────────▼────────────────────────┴───────────────┐
│             Kaggle Notebook Execution Environment       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Dual T4 GPUs (cuda:0 & cuda:1)                   │  │
│  │ Model: Breeze TTS 2 (7GB acoustic weights)       │  │
│  │ Page-Cache Threaded Pipelining & Stitching       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Decoupled Asynchronous Processing

Serverless functions on Vercel's free tier impose a 10–15 second timeout. GenVoice Studio solves this via a decoupled queue architecture:

1. **Trigger (`/api/generate`):** Pushes a parameterized Kaggle notebook containing generation parameters and reference audio via Kaggle's `kernel-push` API, responding immediately.
2. **Execution:** The Kaggle container warms up, initializes the dual T4 pipeline, downloads the model weights using your authenticated HuggingFace token, and synthesizes the audio.
3. **Resilient Polling (`/api/status`):** The frontend polls Kaggle's status endpoints with exponential backoff and transient error tolerance (ignoring temporary 502/503/504 responses).
4. **Retrieval:** When the notebook finishes, the generated master audio chunks are fetched directly from Kaggle's artifact storage and delivered to the studio editor.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18.0 or later) & npm
- A free [Kaggle Account](https://www.kaggle.com/) with API access enabled
- A free [Hugging Face Account](https://huggingface.co/) for an Access Token

---

### Step 1: Clone and Install

```bash
git clone https://github.com/pundhiranshul/genVoice.git
cd genVoice
npm install
```

---

### Step 2: Configure Kaggle Secrets (Crucial)

To enable fast generation and prevent Hugging Face rate limits on the 7GB model download:

1. Log in to [Kaggle](https://www.kaggle.com/) and navigate to **Account Settings** → **Secrets**.
2. Add a new secret with:
   - **Label:** `HF_TOKEN`
   - **Value:** Your Hugging Face Access Token (read permissions).

> [!IMPORTANT]
> Without the `HF_TOKEN` secret set on your Kaggle account, Hugging Face downloads may be throttled or fail during notebook execution.

---

### Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Fallback credentials used for Admin Mode authentication
KAGGLE_USERNAME=your_kaggle_username
KAGGLE_TOKEN=your_kaggle_api_key
KAGGLE_KERNEL_SLUG=genvoice-api
APP_PASSWORD=your_chosen_admin_password
```

> [!TIP]
> You can retrieve your `KAGGLE_USERNAME` and `KAGGLE_TOKEN` by clicking **Create New API Token** under your Kaggle account settings (which downloads a `kaggle.json` file).

---

### Step 4: Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to launch the studio.

---

## ☁️ Deployment

### Deploy to Vercel

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com/).
3. In your Vercel project settings, add the required environment variables:
   - `KAGGLE_USERNAME`
   - `KAGGLE_TOKEN`
   - `KAGGLE_KERNEL_SLUG`
   - `APP_PASSWORD`
4. Click **Deploy**.

---

## ⚠️ Technical Considerations

- **Cold Starts:** Kaggle container provisioning and pip-dependency initialization typically take 30–60 seconds on the initial run.
- **Compute Quotas:** Free Kaggle accounts include 30 GPU hours per week.
- **Asynchronous Loop:** Due to Vercel's serverless function timeout limits, all audio rendering operations are executed asynchronously in Kaggle kernels rather than within Next.js API route handlers.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

<div align="center">
  <sub>Built with ❤️ using <a href="https://nextjs.org/">Next.js</a>, <a href="https://huggingface.co/BreezeBlue/Breeze-TTS-2">Breeze TTS 2</a>, and <a href="https://www.kaggle.com/">Kaggle</a>.</sub>
</div>
