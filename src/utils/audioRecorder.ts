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
 * 1. 80Hz High-Pass Filter: Cuts out desk thumps, AC rumble, handling noise.
 * 2. 10kHz Low-Pass Filter: Cuts out electrical hiss/coil whine.
 * 3. Dynamics Compressor: Smooths vocal dynamics.
 * 4. Noise Gate: Smoothly attenuates room ambience in speech pauses (< -42dB).
 * 5. Peak Normalization: Optimizes amplitude to -1.0 dBFS for punchy, clean clarity.
 */
export async function cleanAudioBuffer(buffer: AudioBuffer): Promise<AudioBuffer> {
  const sampleRate = buffer.sampleRate;
  const frameCount = buffer.length;
  const channels = buffer.numberOfChannels;

  // Step 1 & 2 & 3: Run through hardware-accelerated OfflineAudioContext
  const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
    channels,
    frameCount,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = buffer;

  // 80Hz High-pass Butterworth filter
  const highpass = offlineCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 80;
  highpass.Q.value = 0.707;

  // 10kHz Low-pass filter
  const lowpass = offlineCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 10000;
  lowpass.Q.value = 0.707;

  // Vocal dynamics compressor
  const compressor = offlineCtx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 8;
  compressor.ratio.value = 2.5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(compressor);
  compressor.connect(offlineCtx.destination);

  source.start(0);
  const filtered = await offlineCtx.startRendering();

  // Step 4 & 5: Noise Gate and Peak Normalization
  const gateThreshold = Math.pow(10, -42 / 20); // -42dB noise floor
  const windowSize = Math.floor(sampleRate * 0.02); // 20ms analysis window

  // Calculate global peak for normalization
  let maxPeak = 0;

  for (let c = 0; c < channels; c++) {
    const data = filtered.getChannelData(c);

    // Apply soft noise gate in windows
    for (let i = 0; i < data.length; i += windowSize) {
      const endWin = Math.min(data.length, i + windowSize);
      let sumSq = 0;
      for (let j = i; j < endWin; j++) {
        sumSq += data[j] * data[j];
      }
      const rms = Math.sqrt(sumSq / (endWin - i));

      // If RMS is below noise floor, smoothly attenuate (downward expand)
      if (rms < gateThreshold) {
        const gain = Math.max(0.05, rms / gateThreshold);
        for (let j = i; j < endWin; j++) {
          data[j] *= gain;
        }
      }
    }

    // Find peak
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }
  }

  // Peak normalize to 0.90 (-0.9 dBFS) if maxPeak > 0
  if (maxPeak > 0.05 && maxPeak < 0.95) {
    const normFactor = 0.90 / maxPeak;
    for (let c = 0; c < channels; c++) {
      const data = filtered.getChannelData(c);
      for (let i = 0; i < data.length; i++) {
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
