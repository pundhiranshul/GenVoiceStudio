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
 * Skips initial dead air before speaking and trailing silence before clicking stop.
 */
export function detectSpeechBoundaries(
  buffer: AudioBuffer,
  thresholdDb = -38,
  cushionSec = 0.12
): { start: number; end: number } {
  const sampleRate = buffer.sampleRate;
  const channelData = buffer.getChannelData(0);
  const totalDuration = buffer.duration;
  const windowSize = Math.floor(sampleRate * 0.03); // 30ms window
  const thresholdLinear = Math.pow(10, thresholdDb / 20);

  let firstSpeechSample = -1;
  let lastSpeechSample = -1;

  for (let i = 0; i < channelData.length; i += windowSize) {
    const endWindow = Math.min(channelData.length, i + windowSize);
    let sumSq = 0;
    for (let j = i; j < endWindow; j++) {
      sumSq += channelData[j] * channelData[j];
    }
    const rms = Math.sqrt(sumSq / (endWindow - i));

    if (rms >= thresholdLinear) {
      if (firstSpeechSample === -1) {
        firstSpeechSample = i;
      }
      lastSpeechSample = endWindow;
    }
  }

  if (firstSpeechSample === -1 || lastSpeechSample === -1) {
    return { start: 0, end: totalDuration };
  }

  const cushionSamples = Math.floor(cushionSec * sampleRate);
  const startSample = Math.max(0, firstSpeechSample - cushionSamples);
  const endSample = Math.min(channelData.length, lastSpeechSample + cushionSamples);

  const start = Number((startSample / sampleRate).toFixed(2));
  const end = Number((endSample / sampleRate).toFixed(2));

  // If detected range is too short (< 0.5s), return full audio
  if (end - start < 0.5) {
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
 * Applies studio-grade noise cleaning to an AudioBuffer:
 * 1. 110Hz High-Pass Filter: Cuts out desk thumps, AC rumble, handling noise.
 * 2. 8kHz Low-Pass Filter: Cuts out high-frequency electrical hiss/fan coil whine.
 * 3. High-Shelf Filter: Tames harsh ambient room reflections.
 * 4. Vocal Dynamics Compressor: Smooths vocal dynamics.
 * 5. Adaptive Noise Gate with Per-Sample Gain Smoothing: Silences ambient room noise during speech pauses.
 * 6. Peak Normalization: Optimizes amplitude to -0.5 dBFS.
 */
export async function cleanAudioBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const channels = buffer.numberOfChannels;

  // Step 1: Run through hardware-accelerated OfflineAudioContext for filtering
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    channels,
    frameCount,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // 110Hz High-pass Butterworth filter (AC rumble, mic handling, desk thump)
  const highpass = offlineCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 110;
  highpass.Q.value = 0.8;

  // 8kHz Low-pass filter (fan whine, high hiss)
  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 8000;
  lowpass.Q.value = 0.707;

  // High-shelf filter to tame room hiss
  const highshelf = offlineCtx.createBiquadFilter();
  highshelf.type = 'highshelf';
  highshelf.frequency.value = 4500;
  highshelf.gain.value = -3.0;

  // Vocal dynamics compressor
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -20;
  compressor.knee.value = 6;
  compressor.ratio.value = 3.0;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.20;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(highshelf);
  highshelf.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);
  const filtered = await offlineCtx.startRendering();

  // Step 2: Adaptive Noise Gate with Per-Sample Smooth Gain Envelope
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms analysis window
  const numWindows = Math.floor(frameCount / windowSize);

  for (let c = 0; c < channels; c++) {
    const data = filtered.getChannelData(c);

    // Calculate RMS across all windows to estimate dynamic noise floor vs vocal peaks
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

    // Sort to determine 25th percentile (noise floor) and 85th percentile (speech level)
    const sortedRms = [...rmsValues].sort((a, b) => a - b);
    const floorRms = sortedRms[Math.floor(sortedRms.length * 0.25)] || 0.005;
    const speechRms = sortedRms[Math.floor(sortedRms.length * 0.85)] || 0.05;

    // Gate threshold is set above noise floor with a vocal safety margin
    const gateThreshold = Math.max(0.015, Math.min(speechRms * 0.35, floorRms * 2.8));

    // Calculate target gain per window
    const windowGains = new Float32Array(numWindows);
    for (let w = 0; w < numWindows; w++) {
      const rms = rmsValues[w];
      if (rms < gateThreshold) {
        // Attenuate down to 0.06 (-24dB reduction in pauses)
        const ratio = rms / gateThreshold;
        windowGains[w] = Math.max(0.06, ratio * ratio);
      } else {
        windowGains[w] = 1.0;
      }
    }

    // Apply smooth per-sample envelope to prevent any audio clicks or pumping
    let currentGain = windowGains[0] || 1.0;
    const smoothing = 0.002; // Smooth ramp factor

    for (let i = 0; i < frameCount; i++) {
      const currentWin = Math.min(numWindows - 1, Math.floor(i / windowSize));
      const targetGain = windowGains[currentWin];
      currentGain += (targetGain - currentGain) * smoothing;
      data[i] *= currentGain;
    }

    // Find global peak for normalization
    let maxPeak = 0;
    for (let i = 0; i < frameCount; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    // Peak normalize to 0.95 (-0.45 dBFS)
    if (maxPeak > 0.05 && maxPeak < 0.98) {
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
