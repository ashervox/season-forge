# Voice Processing Setup

By default, the bridge handles **text input/output**. This guide covers adding voice (Speech-to-Text and Text-to-Speech).

## Current Architecture (Text-Based)

```
Echo → Captures voice → Sends text to bridge → Claude response → Echo reads response via TTS
```

## Implementation Options

### Option 1: Echo's Built-In Voice (Easiest)

The Echo already has:
- Microphone to capture your voice
- Internal STT (converts speech to text)
- Internal TTS (converts text to speech)

**Your bridge only needs to:**
1. Receive text from Echo's STT
2. Process with Claude
3. Return text to Echo's TTS

No additional dependencies needed! Your current `server.js` already supports this.

**Testing:**
1. Make sure bridge is running
2. Configure Echo with proxy (ECHO_NETWORK_SETUP.md)
3. Say: "Switch to Claude"
4. Ask: "What's the weather?"
5. Echo should respond with Claude's answer

### Option 2: Whisper API for Offline STT

Add OpenAI's Whisper for more accurate speech recognition:

```bash
npm install openai
```

**Add to server.js:**

```javascript
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In audio handler:
async function transcribeAudio(audioBuffer) {
  const transcription = await openai.audio.transcriptions.create({
    file: audioBuffer,
    model: 'whisper-1',
  });
  return transcription.text;
}
```

**Update .env:**
```
OPENAI_API_KEY=sk-...
```

### Option 3: Google Cloud Speech-to-Text

For Google's speech recognition:

```bash
npm install @google-cloud/speech
```

**Add to server.js:**

```javascript
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();

async function transcribeAudio(audioBuffer) {
  const request = {
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'en-US',
    },
  };

  const [response] = await speechClient.recognize(request);
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  return transcription;
}
```

### Option 4: AWS Transcribe

For AWS integration:

```bash
npm install aws-sdk
```

**Add to server.js:**

```javascript
const AWS = require('aws-sdk');
const transcribeService = new AWS.TranscribeService();

async function transcribeAudio(audioBuffer) {
  // Upload to S3, then transcribe
  // (more complex setup)
}
```

### Option 5: Local Vosk (Open Source, No API)

Offline STT using Vosk:

```bash
npm install vosk-nodejs
```

No API key needed, runs locally, free!

**Add to server.js:**

```javascript
const vosk = require('vosk-nodejs');

async function transcribeAudio(audioBuffer) {
  // Initialize Vosk recognizer
  const recognizer = new vosk.Recognizer('en-us');
  const result = recognizer.acceptWaveform(audioBuffer);
  return result.result[0].result.join(' ');
}
```

## Text-to-Speech Options

### Option 1: Echo's Built-In (Default)

Echo already converts text to speech via Alexa's TTS engine.

**How it works:**
1. Send text response to Echo
2. Echo's native TTS reads it aloud

No code changes needed!

### Option 2: Google Cloud TTS

High-quality, natural-sounding voices:

```bash
npm install @google-cloud/text-to-speech
```

**Add to server.js:**

```javascript
const textToSpeech = require('@google-cloud/text-to-speech');
const ttsClient = new textToSpeech.TextToSpeechClient();

async function synthesizeSpeech(text) {
  const request = {
    input: { text },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Neural2-C',
    },
    audioConfig: {
      audioEncoding: 'MP3',
    },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  return response.audioContent;  // MP3 bytes
}
```

### Option 3: AWS Polly

Realistic voices with various accents:

```bash
npm install aws-sdk
```

**Add to server.js:**

```javascript
const AWS = require('aws-sdk');
const polly = new AWS.Polly({ region: 'us-east-1' });

async function synthesizeSpeech(text) {
  const params = {
    Text: text,
    OutputFormat: 'mp3',
    VoiceId: 'Joanna',  // or other voice IDs
  };

  const data = await polly.synthesizeSpeech(params).promise();
  return data.AudioStream;
}
```

### Option 4: ElevenLabs (Premium Voices)

High-quality AI voices:

```bash
npm install @elevenlabs/sdk
```

**Add to server.js:**

```javascript
const { ElevenLabsClient, VoiceSettings } = require('@elevenlabs/sdk');

const client = new ElevenLabsClient({ apiKey: process.env.ELEVENLABS_API_KEY });

async function synthesizeSpeech(text) {
  const audio = await client.generate({
    voice: 'Bella',
    text,
  });

  return audio;  // Audio bytes
}
```

### Option 5: Local Festival/eSpeak (Free)

Free, offline TTS:

```bash
npm install child_process
```

**Add to server.js:**

```javascript
const { execFile } = require('child_process');

async function synthesizeSpeech(text) {
  return new Promise((resolve, reject) => {
    execFile('espeak', [text, '-w', 'output.wav'], (err) => {
      if (err) reject(err);
      // Return WAV file
      resolve(fs.readFileSync('output.wav'));
    });
  });
}
```

## Recommended Combination

**For Ease (No APIs):**
- STT: Echo's built-in
- TTS: Echo's built-in
- Cost: Free
- Setup: Already works!

**For Quality:**
- STT: Whisper API ($0.02 per minute audio)
- TTS: Google Cloud TTS or ElevenLabs
- Cost: ~$5-20/month for moderate use
- Setup: Add API keys to .env

**For Privacy (Local):**
- STT: Vosk (local, open-source)
- TTS: Festival or eSpeak (local, open-source)
- Cost: Free (just computation)
- Setup: More complex

## Implementation Example

Here's a simplified example adding Whisper STT:

```javascript
// Add to server.js
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// New endpoint for audio
app.post('/request-audio', async (req, res) => {
  try {
    // Assuming audio sent as base64 or buffer
    const audioBuffer = Buffer.from(req.body.audio, 'base64');

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioBuffer,
      model: 'whisper-1',
    });

    const userText = transcription.text;
    
    // Then process normally with Claude
    // ... rest of /request logic ...
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Integration with Echo

The flow would be:

1. Echo captures audio
2. Echo sends to bridge (as audio or already transcribed text)
3. Bridge transcribes (if needed) with Whisper/other
4. Bridge sends to Claude
5. Bridge synthesizes response (if needed)
6. Bridge returns audio/text to Echo
7. Echo plays response

## Troubleshooting

**Audio Quality Issues:**
- Check sample rate (should be 16kHz for Whisper)
- Ensure audio is mono
- Trim silence before sending

**High Latency:**
- Cloud APIs add ~500ms-1s
- Local options (Vosk, eSpeak) are faster
- Cache common responses

**Cost Concerns:**
- Whisper: $0.02/min audio
- TTS varies: $0.001-0.05 per 1K chars
- Budget ~$5-10/month for moderate use

## Next Steps

1. ✅ Test text-based bridge first
2. Choose STT option (start with Echo's built-in)
3. Choose TTS option (start with Echo's built-in)
4. Add audio processing if needed
5. Monitor latency and quality
6. Optimize for your use case

Your bridge already works! The Echo device handles voice—you just need to ensure text flows through properly.
