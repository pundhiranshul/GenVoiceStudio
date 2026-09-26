export async function stitchChunks(chunks: Blob[], trimMs: number | number[], trimModes: ('crossfade' | 'trim')[] = []): Promise<Blob> {
  if (!chunks || chunks.length === 0) throw new Error("No chunks provided");
  if (chunks.length === 1) return chunks[0];

  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  // Decode all blobs into AudioBuffers
  const buffers = await Promise.all(
    chunks.map(async (blob) => {
      const arrayBuffer = await blob.arrayBuffer();
      return audioCtx.decodeAudioData(arrayBuffer);
    })
  );

  const sampleRate = buffers[0].sampleRate;
  const channels = buffers[0].numberOfChannels;
  
  // Calculate total length
  let totalLength = 0;
  const getTrimFrames = (index: number) => {
    if (index === 0) return 0;
    const ms = Array.isArray(trimMs) ? (trimMs[index - 1] || 0) : trimMs;
    const requestedFrames = Math.floor(sampleRate * (ms / 1000));
    return Math.min(requestedFrames, buffers[index].length, buffers[index - 1].length);
  };
  
  for (let i = 0; i < buffers.length; i++) {
    let len = buffers[i].length;
    // For all chunks except the first, we subtract the trim amount (crossfade overlap)
    if (i > 0) {
      len -= getTrimFrames(i);
    }
    totalLength += len;
  }

  // Ensure totalLength is > 0
  if (totalLength <= 0) totalLength = 1;

  const outBuffer = audioCtx.createBuffer(channels, totalLength, sampleRate);
  
  for (let c = 0; c < channels; c++) {
    const outChannel = outBuffer.getChannelData(c);
    let offset = 0;
    
    for (let i = 0; i < buffers.length; i++) {
      const buf = buffers[i];
      const inChannel = buf.getChannelData(c);
      
      if (i === 0) {
        outChannel.set(inChannel, 0);
        offset += buf.length;
      } else {
        const frames = getTrimFrames(i);
        offset -= frames;
        
        // Simple crossfade for the overlap region
        if (frames > 0) {
          const mode = trimModes[i - 1] || 'crossfade';
          for (let f = 0; f < frames; f++) {
            const outIdx = offset + f;
            if (outIdx >= 0 && outIdx < outChannel.length) {
              if (mode === 'crossfade') {
                const fraction = f / frames;
                // Fade out previous chunk, fade in new chunk
                outChannel[outIdx] = outChannel[outIdx] * (1 - fraction) + inChannel[f] * fraction;
              } else {
                // Hard trim: overwrite the previous chunk's end with the new chunk's start
                outChannel[outIdx] = inChannel[f];
              }
            }
          }
        }
        
        // Copy the rest of the new chunk
        const remainingFrames = buf.length - frames;
        if (remainingFrames > 0) {
          const restOfIn = inChannel.subarray(frames);
          outChannel.set(restOfIn, offset + frames);
        }
        
        offset += buf.length;
      }
    }
  }

  return audioBufferToWavBlob(outBuffer);
}

// Utility to convert AudioBuffer to WAV Blob
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0; // scale to 16-bit int
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return new Blob([bufferArray], { type: "audio/wav" });
}
