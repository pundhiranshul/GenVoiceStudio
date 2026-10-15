// Audio recording and WAV conversion utilities

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
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true);  // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  /* data sub-chunk */
  writeString(36, 'data');
  view.setUint32(40, dataByteLength, true);

  // Write 16-bit PCM samples with clipping
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

/**
 * Decodes an input audio Blob (WebM, OGG, MP4) and encodes it as a standard WAV Blob.
 * If decoding fails, falls back gracefully to the original Blob.
 */
export async function convertBlobToWav(blob: Blob): Promise<Blob> {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return blob;

    const audioCtx = new AudioCtx();
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    const wavBlob = audioBufferToWav(audioBuffer);
    await audioCtx.close();
    return wavBlob;
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
 * Recommended reading scripts for voice recording.
 * Pangrams and natural sentences with rich phonetic variety.
 */
export const RECORDING_SUGGESTED_SCRIPTS: string[] = [
  "The quick brown fox jumps over the lazy dog.",
  "Freedom kindles the flames of hope in every heart.",
  "Sphinx of black quartz, judge my vow.",
  "Life isn't about finding yourself. Life is about creating yourself.",
  "A wizard's job is to vex chumps quickly in fog, revealing secrets kept for centuries.",
  "Pack my box with five dozen liquor jugs."
];
