// Audio recording, noise reduction, silence trimming, and WAV conversion utilities

/**
 * Converts an AudioBuffer to a standard 16-bit PCM WAV Blob.
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  // Interleave channels if stereo, or extract mono
  let interleaved: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    let idx = 0;
    for (let i = 0; i < left.length; i++) {
      interleaved[idx++] = left[i];
      interleaved[idx++] = right[i];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataByteLength = interleaved.length * bytesPerSample;
  const bufferSize = 44 + dataByteLength;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF chunk descriptor */
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeString(8, 'WAVE');

  /* fmt sub-chunk */
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  /* data sub-chunk */
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Decodes an input audio Blob (WebM, OGG, MP4) into an AudioBuffer.
 */
export async function decodeBlobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) throw new Error("Web Audio API not supported");
  const audioCtx = new AudioCtx();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close().catch(() => {});
  }
}

/**
 * Automatically detects where vocal speech starts and ends.
 * Uses adaptive energy distribution profiling (noise floor vs. vocal dynamic range)
 * so it reliably trims leading/trailing silence across any microphone, room noise, or volume.
 */
export function detectSpeechBoundaries(
  buffer: AudioBuffer,
  cushionSec = 0.15
): { start: number; end: number } {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDuration = buffer.duration;

  if (totalDuration < 0.6) {
    return { start: 0, end: totalDuration };
  }

  // 25ms analysis window for high temporal resolution
  const windowSize = Math.floor(sampleRate * 0.025);
  const numWindows = Math.floor(channelData.length / windowSize);

  if (numWindows < 10) {
    return { start: 0, end: totalDuration };
  }

  // Compute RMS for every 25ms window
  const windowRms = new Float32Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    const startIdx = w * windowSize;
    const endIdx = Math.min(channelData.length, startIdx + windowSize);
    let sumSq = 0;
    for (let j = startIdx; j < endIdx; j++) {
      sumSq += channelData[j] * channelData[j];
    }
    windowRms[w] = Math.sqrt(sumSq / (endIdx - startIdx));
  }

  // Sort RMS values to extract energy percentiles
  const sorted = Array.from(windowRms).sort((a, b) => a - b);
  const noiseFloor = sorted[Math.floor(sorted.length * 0.15)] || 0.001;
  const speechEnergy = sorted[Math.floor(sorted.length * 0.85)] || 0.03;

  const dynamicRange = speechEnergy - noiseFloor;
  // If the audio is completely uniform or silent, cannot trim safely
  if (dynamicRange < 0.003 && speechEnergy < 0.008) {
    return { start: 0, end: totalDuration };
  }

  // Adaptive threshold: 18% into the dynamic range above noise floor
  const speechThreshold = Math.max(
    noiseFloor * 1.5,
    noiseFloor + dynamicRange * 0.18,
    0.005
  );

  // Find start: look for at least 2 consecutive windows exceeding speechThreshold
  let firstSpeechWin = -1;
  for (let w = 0; w < numWindows - 2; w++) {
    if (windowRms[w] >= speechThreshold && windowRms[w + 1] >= speechThreshold) {
      firstSpeechWin = w;
      break;
    }
  }

  // Find end: scan backwards from the end for 2 consecutive windows exceeding speechThreshold
  let lastSpeechWin = -1;
  for (let w = numWindows - 1; w >= 2; w--) {
    if (windowRms[w] >= speechThreshold && windowRms[w - 1] >= speechThreshold) {
      lastSpeechWin = w;
      break;
    }
  }

  if (firstSpeechWin === -1 || lastSpeechWin === -1 || lastSpeechWin <= firstSpeechWin) {
    return { start: 0, end: totalDuration };
  }

  // Convert windows to seconds and apply safety cushion padding
  const rawStartSec = (firstSpeechWin * windowSize) / sampleRate;
  const rawEndSec = ((lastSpeechWin + 1) * windowSize) / sampleRate;

  const startSec = Math.max(0, rawStartSec - cushionSec);
  const endSec = Math.min(totalDuration, rawEndSec + cushionSec);

  const start = Number(startSec.toFixed(2));
  const end = Number(endSec.toFixed(2));

  // If detected range is too short (< 0.4s), return full audio
  if (end - start < 0.4) {
    return { start: 0, end: totalDuration };
  }

  return { start, end };
}

/**
 * Trims an AudioBuffer to [startSec, endSec] with 12ms micro-fades to avoid clicks.
 */
export function sliceAudioBuffer(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number
): AudioBuffer {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.ceil(endSec * sampleRate));
  const frameCount = Math.max(1, endSample - startSample);

  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioCtx();
  const sliced = tempCtx.createBuffer(buffer.numberOfChannels, frameCount, sampleRate);
  tempCtx.close().catch(() => {});

  const fadeLength = Math.min(Math.floor(sampleRate * 0.012), Math.floor(frameCount / 4)); // 12ms fade

  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const src = buffer.getChannelData(c);
    const dest = sliced.getChannelData(c);

    for (let i = 0; i < frameCount; i++) {
      let sample = src[startSample + i] || 0;

      // Micro fade in at start
      if (i < fadeLength) {
        sample *= i / fadeLength;
      }
      // Micro fade out at end
      else if (i > frameCount - fadeLength) {
        sample *= (frameCount - i) / fadeLength;
      }

      dest[i] = sample;
    }
  }

  return sliced;
}

/**
 * Fast in-place Radix-2 Cooley-Tukey FFT.
 */
function fft(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
  for (let l = 2; l <= n; l <<= 1) {
    const half = l >> 1;
    const angle = -2 * Math.PI / l;
    const wstepR = Math.cos(angle);
    const wstepI = Math.sin(angle);
    for (let i = 0; i < n; i += l) {
      let curR = 1, curI = 0;
      for (let m = 0; m < half; m++) {
        const uR = real[i + m];
        const uI = imag[i + m];
        const vR = real[i + m + half] * curR - imag[i + m + half] * curI;
        const vI = real[i + m + half] * curI + imag[i + m + half] * curR;
        real[i + m] = uR + vR;
        imag[i + m] = uI + vI;
        real[i + m + half] = uR - vR;
        imag[i + m + half] = uI - vI;
        const nextR = curR * wstepR - curI * wstepI;
        const nextI = curR * wstepI + curI * wstepR;
        curR = nextR; curI = nextI;
      }
    }
  }
}

/**
 * Inverse FFT.
 */
function ifft(real: Float32Array, imag: Float32Array) {
  const n = real.length;
  for (let i = 0; i < n; i++) imag[i] = -imag[i];
  fft(real, imag);
  for (let i = 0; i < n; i++) {
    real[i] /= n;
    imag[i] = -imag[i] / n;
  }
}

/**
 * Multi-band Spectral Subtraction Noise Profiler & Suppressor.
 * Eliminates continuous background fan drone, AC hum, and microphone hiss
 * across all frequency bins, with spectral smoothing to prevent musical artifacts.
 */
function spectralDenoise(data: Float32Array): Float32Array {
  const N = 1024;
  const H = N / 4; // 75% overlap
  const frameCount = data.length;
  if (frameCount < N * 2) return data;

  const numFrames = Math.floor((frameCount - N) / H);
  const halfN = N / 2;
  const hann = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / N));
  }

  const frameMags: Float32Array[] = [];
  const framesReal: Float32Array[] = [];
  const framesImag: Float32Array[] = [];

  for (let f = 0; f < numFrames; f++) {
    const offset = f * H;
    const real = new Float32Array(N);
    const imag = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      real[i] = data[offset + i] * hann[i];
    }
    fft(real, imag);
    framesReal.push(real);
    framesImag.push(imag);

    const mags = new Float32Array(halfN + 1);
    for (let k = 0; k <= halfN; k++) {
      mags[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
    }
    frameMags.push(mags);
  }

  // Estimate noise floor profile per bin using lowest 15% quantile
  const noiseFloor = new Float32Array(halfN + 1);
  for (let k = 0; k <= halfN; k++) {
    const vals: number[] = [];
    for (let f = 0; f < numFrames; f++) {
      vals.push(frameMags[f][k]);
    }
    vals.sort((a, b) => a - b);
    noiseFloor[k] = vals[Math.floor(vals.length * 0.15)] || 1e-5;
  }

  const alpha = 1.85; // Over-subtraction factor
  const beta = 0.035; // Spectral floor (-29dB)
  const out = new Float32Array(frameCount);
  let prevGain = new Float32Array(halfN + 1).fill(1.0);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * H;
    const real = framesReal[f];
    const imag = framesImag[f];
    const mags = frameMags[f];
    const rawGain = new Float32Array(halfN + 1);

    for (let k = 0; k <= halfN; k++) {
      const snr = mags[k] / (noiseFloor[k] + 1e-7);
      rawGain[k] = Math.max(beta, 1.0 - (alpha / (snr + 1e-4)));
    }

    // Frequency 3-tap smoothing & time exponential smoothing to remove musical noise
    const smoothGain = new Float32Array(halfN + 1);
    for (let k = 0; k <= halfN; k++) {
      const prev = k > 0 ? rawGain[k - 1] : rawGain[k];
      const next = k < halfN ? rawGain[k + 1] : rawGain[k];
      let g = 0.2 * prev + 0.6 * rawGain[k] + 0.2 * next;
      g = 0.7 * g + 0.3 * prevGain[k];
      smoothGain[k] = g;
      prevGain[k] = g;
    }

    for (let k = 0; k <= halfN; k++) {
      const g = smoothGain[k];
      real[k] *= g;
      imag[k] *= g;
      if (k > 0 && k < halfN) {
        real[N - k] = real[k];
        imag[N - k] = -imag[k];
      }
    }

    ifft(real, imag);
    for (let i = 0; i < N; i++) {
      out[offset + i] += (real[i] * hann[i]) / 1.5;
    }
  }

  // Seamlessly preserve audio head/tail
  for (let i = 0; i < H; i++) {
    if (out[i] === 0) out[i] = data[i] * 0.1;
  }
  return out;
}

/**
 * Applies studio-grade noise cleaning to an AudioBuffer:
 * 1. Multi-band Spectral Subtraction: Removes continuous background fan noise, AC hum, electrical hiss.
 * 2. 95Hz High-Pass Filter: Cuts out desk thumps, AC rumble, handling noise.
 * 3. 9.5kHz Low-Pass Filter: Cuts out supersonic hiss & coil whine.
 * 4. High-Shelf Filter: Tames harsh ambient room reflections.
 * 5. Vocal Dynamics Compressor: Smooths vocal dynamics.
 * 6. Adaptive Downward Expander: Silences ambient room noise during speech pauses (-30dB).
 * 7. Peak Normalization: Optimizes amplitude to -0.5 dBFS.
 */
export async function cleanAudioBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const channels = buffer.numberOfChannels;

  // Step 1: Pre-process with Spectral Subtraction to eliminate stationary hiss/fan noise
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  const tempCtx = new AudioCtx();
  const spectrallyCleaned = tempCtx.createBuffer(channels, frameCount, sampleRate);
  tempCtx.close().catch(() => {});

  for (let c = 0; c < channels; c++) {
    const rawData = buffer.getChannelData(c);
    const cleanedData = spectralDenoise(rawData);
    spectrallyCleaned.getChannelData(c).set(cleanedData);
  }

  // Step 2: Biquad acoustic filtering & dynamics compressor via OfflineAudioContext
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    channels,
    frameCount,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = spectrallyCleaned;

  // 80Hz High-pass filter (AC rumble, mic handling, desk thump)
  const highpass = offlineCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 80;
  highpass.Q.value = 0.707;

  // 11.5kHz Low-pass filter (high coil whine, supersonic hiss)
  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 11500;
  lowpass.Q.value = 0.707;

  // Vocal presence boost filter (adds clarity and studio crispness to vocal speech)
  const presence = offlineCtx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 3500;
  presence.gain.value = 1.8;
  presence.Q.value = 1.1;

  // Vocal dynamics compressor to smooth vocal delivery
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 6;
  compressor.ratio.value = 3.0;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(presence);
  presence.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);
  const filtered = await offlineCtx.startRendering();

  // Step 3: Adaptive Downward Expander (Smooth Noise Gate on speech pauses)
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms analysis window
  const numWindows = Math.floor(frameCount / windowSize);

  for (let c = 0; c < channels; c++) {
    const data = filtered.getChannelData(c);

    // Calculate RMS across all windows
    const rmsValues: number[] = [];
    for (let w = 0; w < numWindows; w++) {
      const start = w * windowSize;
      const end = Math.min(frameCount, start + windowSize);
      let sumSq = 0;
      for (let j = start; j < end; j++) {
        sumSq += data[j] * data[j];
      }
      rmsValues.push(Math.sqrt(sumSq / (end - start)));
    }

    const sortedRms = [...rmsValues].sort((a, b) => a - b);
    const floorRms = sortedRms[Math.floor(sortedRms.length * 0.15)] || 0.002;
    const speechRms = sortedRms[Math.floor(sortedRms.length * 0.85)] || 0.04;
    const dynamicRange = Math.max(0.005, speechRms - floorRms);

    // Adaptive speech pause gate threshold: snaps between room noise floor and vocal level
    const gateThreshold = Math.max(0.004, floorRms + dynamicRange * 0.15);

    const windowGains = new Float32Array(numWindows);
    for (let w = 0; w < numWindows; w++) {
      const rms = rmsValues[w];
      if (rms < gateThreshold) {
        // Attenuate down to 0.02 (-34dB in pauses)
        const ratio = rms / gateThreshold;
        windowGains[w] = Math.max(0.02, ratio * ratio);
      } else {
        windowGains[w] = 1.0;
      }
    }

    let currentGain = windowGains[0] || 1.0;
    const smoothing = 0.003; // Smooth ramp factor

    for (let i = 0; i < frameCount; i++) {
      const currentWin = Math.min(numWindows - 1, Math.floor(i / windowSize));
      const targetGain = windowGains[currentWin];
      currentGain += (targetGain - currentGain) * smoothing;
      data[i] *= currentGain;
    }

    // Step 4: Peak Normalization to -0.5 dBFS (0.95)
    let maxPeak = 0;
    for (let i = 0; i < frameCount; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    if (maxPeak > 0.03 && maxPeak < 0.98) {
      const normFactor = 0.95 / maxPeak;
      for (let i = 0; i < frameCount; i++) {
        data[i] = Math.max(-1, Math.min(1, data[i] * normFactor));
      }
    }
  }

  return filtered;
}

/**
 * Decodes an input audio Blob and encodes it as a standard WAV Blob.
 */
export async function convertBlobToWav(blob: Blob, clean = true): Promise<Blob> {
  try {
    const audioBuffer = await decodeBlobToAudioBuffer(blob);
    const finalBuffer = clean ? await cleanAudioBuffer(audioBuffer) : audioBuffer;
    return audioBufferToWav(finalBuffer);
  } catch (err) {
    console.warn('Audio decoding fallback to raw blob:', err);
    return blob;
  }
}

/**
 * Converts a Blob to a base64 Data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

/**
 * Recommended reading scripts for voice recording (plain prompts, no category titles).
 */
export const RECORDING_SUGGESTED_SCRIPTS: string[] = [
  "The quick brown fox jumps over the lazy dog.",
  "Freedom kindles the flames of hope in every heart.",
  "Sphinx of black quartz, judge my vow.",
  "Life isn't about finding yourself. Life is about creating yourself.",
  "A wizard's job is to vex chumps quickly in fog, revealing secrets kept for centuries.",
  "Pack my box with five dozen liquor jugs."
];
