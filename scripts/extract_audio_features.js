const fs = require("fs");
const path = require("path");

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepRe = Math.cos(angle);
    const wStepIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wRe = 1, wIm = 0;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j], uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextWRe = wRe * wStepRe - wIm * wStepIm;
        wIm = wRe * wStepIm + wIm * wStepRe;
        wRe = nextWRe;
      }
    }
  }
}

const wavPath = path.join(__dirname, "../public/samples/AuthenticationGuide_1.wav");
const outPath = path.join(__dirname, "../src/data/authAudioFeatures.json");

const buf = fs.readFileSync(wavPath);
const headerOffset = 44;
const totalSamples = Math.floor((buf.length - headerOffset) / 2);
const sampleRate = 44100;
const duration = totalSamples / sampleRate;

const N = 512;
const fps = 25; // 25 updates/sec
const step = Math.floor(sampleRate / fps);
const numFrames = Math.floor((totalSamples - N) / step);

// Hann window
const window = new Float32Array(N);
for (let i = 0; i < N; i++) {
  window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
}

const BARS = 28;
const binRanges = [];
for (let b = 0; b < BARS; b++) {
  const minFreq = 110;
  const maxFreq = 4200;
  const f1 = minFreq * Math.pow(maxFreq / minFreq, b / BARS);
  const f2 = minFreq * Math.pow(maxFreq / minFreq, (b + 1) / BARS);
  const b1 = Math.max(1, Math.min(Math.floor(f1 / (sampleRate / N)), (N / 2) - 1));
  const b2 = Math.max(b1 + 1, Math.min(Math.ceil(f2 / (sampleRate / N)), N / 2));
  binRanges.push([b1, b2]);
}

const re = new Float32Array(N);
const im = new Float32Array(N);
const tempMags = [];
let globalMax = 0;

for (let f = 0; f < numFrames; f++) {
  const start = headerOffset + f * step * 2;
  for (let i = 0; i < N; i++) {
    re[i] = (buf.readInt16LE(start + i * 2) / 32768) * window[i];
    im[i] = 0;
  }
  fft(re, im);
  const barMags = new Float32Array(BARS);
  for (let b = 0; b < BARS; b++) {
    const [b1, b2] = binRanges[b];
    let sumMag = 0;
    for (let k = b1; k < b2; k++) {
      const mag = (Math.sqrt(re[k] * re[k] + im[k] * im[k]) * 2) / N;
      sumMag += mag;
    }
    const avgMag = sumMag / (b2 - b1);
    barMags[b] = avgMag;
    if (avgMag > globalMax) globalMax = avgMag;
  }
  tempMags.push(barMags);
}

// Normalize each bar to 0-100 with dynamic speech curve
const frames = [];
for (let f = 0; f < numFrames; f++) {
  const row = [];
  const barMags = tempMags[f];
  for (let b = 0; b < BARS; b++) {
    const norm = Math.min(1, barMags[b] / (globalMax * 0.72));
    const val = Math.round(Math.pow(norm, 0.65) * 100);
    row.push(val);
  }
  frames.push(row);
}

// 64-point static waveform envelope across the track
const PEAK_POINTS = 64;
const samplesPerPeak = Math.floor(totalSamples / PEAK_POINTS);
const waveform = [];
let maxPeak = 0;
for (let p = 0; p < PEAK_POINTS; p++) {
  let peak = 0;
  const start = headerOffset + p * samplesPerPeak * 2;
  for (let s = 0; s < samplesPerPeak; s++) {
    const abs = Math.abs(buf.readInt16LE(start + s * 2) / 32768);
    if (abs > peak) peak = abs;
  }
  waveform.push(peak);
  if (peak > maxPeak) maxPeak = peak;
}
const normalizedWaveform = waveform.map(v => Math.round((v / maxPeak) * 100));

const output = {
  duration,
  fps,
  barsCount: BARS,
  totalFrames: frames.length,
  waveform: normalizedWaveform,
  frames
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output));
console.log(`Successfully generated audio features: ${frames.length} frames, file size: ${(fs.statSync(outPath).size / 1024).toFixed(1)} KB`);
