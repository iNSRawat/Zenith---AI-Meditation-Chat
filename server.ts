import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '10mb' }));

let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Clean human-readable error extractor
function extractCleanErrorMessage(err: any): string {
  if (!err) return 'Service temporarily unavailable. Please try again.';
  let msg = err.message || (typeof err === 'string' ? err : '');
  try {
    if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.includes('{"error"'))) {
      const jsonStart = msg.indexOf('{');
      const jsonStr = msg.substring(jsonStart);
      const parsed = JSON.parse(jsonStr);
      if (parsed.error?.message) {
        msg = parsed.error.message;
      }
    }
  } catch {
    // Keep msg as is
  }

  if (msg.includes('high demand') || msg.includes('503') || msg.includes('UNAVAILABLE')) {
    return 'The AI model is currently experiencing high demand. Automatic retry is in progress, please try again shortly.';
  }
  return msg || 'Service temporarily unavailable. Please try again in a moment.';
}

function isTransientError(err: any): boolean {
  if (!err) return false;
  const str = String(err.message || '') + String(err.status || '') + String(err.code || '') + JSON.stringify(err);
  return (
    str.includes('503') ||
    str.includes('429') ||
    str.includes('UNAVAILABLE') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('high demand') ||
    str.includes('deadline') ||
    str.includes('timeout')
  );
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      if (attempt < retries && isTransientError(err)) {
        console.warn(`Retry attempt ${attempt + 1} after error: ${extractCleanErrorMessage(err)}. Waiting ${delayMs * (attempt + 1)}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Daily mindfulness focus / intention
app.get('/api/daily-focus', async (req, res) => {
  const curatedQuotes = [
    'Inhale calm, exhale tension, and be here in this sacred now.',
    'Stillness is not the absence of movement, but the presence of peace.',
    'Let your breath soften every quiet corner of your body.',
    'You are the vast sky; thoughts and worries are simply passing weather.',
    'Root deeply into this present moment with gentle gratitude.'
  ];
  const randomFallback = curatedQuotes[Math.floor(Math.random() * curatedQuotes.length)];

  try {
    const ai = getAi();
    let focus = '';

    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: 'Generate a single, deeply calming, poetic mindfulness quote or daily intention. Under 14 words. Profound, peaceful, and centering. Return only the quote text.',
          config: { temperature: 0.8 },
        });
      }, 1, 800);
      focus = response.text?.trim() || '';
    } catch {
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Generate a single, deeply calming, poetic mindfulness quote or daily intention. Under 14 words. Profound, peaceful, and centering. Return only the quote text.',
        config: { temperature: 0.8 },
      });
      focus = fallbackResponse.text?.trim() || '';
    }

    res.json({ focus: focus || randomFallback });
  } catch (error: any) {
    console.error('Error generating daily focus:', extractCleanErrorMessage(error));
    res.json({ focus: randomFallback });
  }
});

// Generate meditation script
app.post('/api/meditation/generate-script', async (req, res) => {
  try {
    const { prompt, atmosphere, duration } = req.body;
    const lengthMap: Record<string, string> = { short: '140', medium: '280', long: '450' };
    const wordCount = lengthMap[duration] || '250';

    const ai = getAi();
    const promptText = `You are a master mindfulness guide. Write a serene, rhythmic, beautifully worded guided meditation script.
Theme: "${prompt || 'Peaceful Presence and Inner Stillness'}"
Atmosphere: "${atmosphere || 'Calm & Ethereal'}"
Target Length: Approximately ${wordCount} spoken words.
Guide the listener gently through conscious breath awareness (e.g., Inhale slowly... Feel your chest rise... Hold gently... Exhale softly...), release of tension in the body, and tranquil imagery matching the theme.
Formatting: Use gentle pauses marked with ellipsis (...). Do not include any stage directions, asterisks, brackets, or speaker notes. Only return the exact words to be spoken aloud by the voice guide.`;

    let script = '';
    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: { temperature: 0.7 },
        });
      }, 2, 1000);
      script = response.text?.trim() || '';
    } catch (primaryErr) {
      console.warn('Primary model gemini-3.8-flash busy, falling back to gemini-2.5-flash:', extractCleanErrorMessage(primaryErr));
      const fallbackRes = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptText,
          config: { temperature: 0.7 },
        });
      }, 1, 1000);
      script = fallbackRes.text?.trim() || '';
    }

    if (!script) {
      throw new Error('Unable to synthesize script at this moment. Please try again.');
    }

    res.json({ script });
  } catch (error: any) {
    console.error('Error generating script:', error);
    res.status(500).json({ error: extractCleanErrorMessage(error) });
  }
});

// Generate TTS voiceover audio
app.post('/api/meditation/generate-audio', async (req, res) => {
  try {
    const { script, voice } = req.body;
    if (!script) {
      return res.status(400).json({ error: 'Script is required' });
    }

    const validVoices = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Zephyr';

    const ai = getAi();

    try {
      const response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: script }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: chosenVoice },
              },
            },
          },
        });
      }, 2, 1200);

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        return res.json({ audioBase64: base64Audio, fallbackToClientVoice: false });
      }
    } catch (ttsErr: any) {
      console.warn('TTS preview model experienced transient high demand:', extractCleanErrorMessage(ttsErr));
      // Rather than throwing 500 and failing the entire session, gracefully fallback to browser audio guidance
      return res.json({
        audioBase64: null,
        fallbackToClientVoice: true,
        message: 'Voice server is experiencing a momentary spike in demand. Your session will play using the browser companion voice.',
      });
    }

    // Default fallback if no audio was generated
    res.json({
      audioBase64: null,
      fallbackToClientVoice: true,
      message: 'Voice guidance is ready with local audio support.',
    });
  } catch (error: any) {
    console.error('Error generating audio:', error);
    res.status(500).json({ error: extractCleanErrorMessage(error) });
  }
});

// Generate visuals using image model or graceful fallback
app.post('/api/meditation/generate-visual', async (req, res) => {
  try {
    const { prompt, atmosphere } = req.body;
    const ai = getAi();

    const imagePrompt = `Serene minimalist meditative landscape: ${prompt || 'Sacred stillness'}, ${atmosphere || 'calm luminous mist'}. Dreamlike twilight, soft ambient glow, spiritual tranquility, cinematic photorealistic digital art, high aesthetic, no people, no text.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: {
          parts: [{ text: imagePrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: '16:9',
          },
        },
      });

      let base64Image: string | null = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData?.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }

      if (base64Image) {
        return res.json({ imageBase64: base64Image, fallback: false });
      }
    } catch (imgErr) {
      console.warn('Image generation with gemini-3.1-flash-lite-image was not available or requires paid key, using procedural sanctuary visual:', imgErr);
    }

    // Fallback indicator for procedural meditative sanctuary
    res.json({ imageBase64: null, fallback: true });
  } catch (error: any) {
    console.error('Error in visual generation:', error);
    res.json({ imageBase64: null, fallback: true });
  }
});

// Grounded Search Chatbot for Mindfulness & Wellness Science
// Uses gemini-3.5-flash with googleSearch tool as specified in the instructions
app.post('/api/chat/grounded-search', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getAi();
    const systemInstruction = `You are Zenith's Mindfulness & Wellness Science Guide.
Your purpose is to provide warm, empathetic, and scientifically grounded insights on meditation, mindfulness practices, breathwork (like physiological sigh, 4-7-8, box breathing), sleep hygiene, neuroscience of stress reduction, and mental wellbeing.
When answering, utilize Google Search to find current, verified research, clinical trials, or expert consensus where relevant.
Be supportive, clear, practical, and compassionate. If answering about health or medical conditions, provide helpful evidence-based wellness guidance while gently noting it is for mindfulness and informational purposes.`;

    // Construct prompt with brief context if available
    let fullPrompt = message;
    if (history && Array.isArray(history) && history.length > 0) {
      const contextSummary = history.slice(-4).map((h: any) => `${h.role === 'user' ? 'User' : 'Zenith'}: ${h.content}`).join('\n');
      fullPrompt = `Previous conversation context:\n${contextSummary}\n\nCurrent User Question: ${message}`;
    }

    let response: any;
    try {
      response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: fullPrompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            temperature: 0.6,
          },
        });
      }, 2, 1000);
    } catch (primaryErr) {
      console.warn('Grounded search primary model hit transient error, trying gemini-2.5-flash fallback:', extractCleanErrorMessage(primaryErr));
      response = await withRetry(async () => {
        return await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: fullPrompt,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            temperature: 0.6,
          },
        });
      }, 1, 1000);
    }

    const text = response?.text || 'I am here with you. Take a slow, peaceful breath.';
    const rawChunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract clean web sources from grounding metadata
    const sources: Array<{ title: string; url: string }> = [];
    for (const chunk of rawChunks) {
      if ((chunk as any).web?.uri) {
        sources.push({
          title: (chunk as any).web.title || 'Source',
          url: (chunk as any).web.uri,
        });
      }
    }

    // Deduplicate sources by URL
    const uniqueSources = sources.filter((item, index, self) =>
      index === self.findIndex((t) => t.url === item.url)
    );

    res.json({
      text,
      sources: uniqueSources,
    });
  } catch (error: any) {
    console.error('Error in grounded search chat:', error);
    res.status(500).json({
      error: extractCleanErrorMessage(error),
      fallbackText: "The mindfulness knowledge base is experiencing high demand right now. Please take a mindful breath and try your question again.",
    });
  }
});

const server = http.createServer(app);

// WebSocket for Gemini Live API real-time voice conversation
// Uses gemini-3.1-flash-live-preview
const wss = new WebSocketServer({ server, path: '/live-ws' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('Client connected to Live Voice WebSocket');
  let session: any = null;

  try {
    const ai = getAi();
    session = await withRetry(async () => {
      return await ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: `You are Zenith Live, a live, empathetic voice meditation coach and mindfulness guide.
You are talking in real-time with the user over microphone audio.
Keep your voice warm, grounded, unhurried, and peaceful.
Guide the user through calming breaths, ease their stress or anxiety, answer mindful questions, or lead a customized breathing exercise.
Keep responses concise, natural, conversational, and serene—avoid lengthy monologues so the user can easily speak back and forth with you.`,
        },
        callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }

            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }

            if (message.serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ turnComplete: true }));
            }
          },
          onclose: () => {
            console.log('Live API session closed by server');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ sessionEnded: true }));
            }
          },
          onerror: (err: any) => {
            console.error('Live API session error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ error: extractCleanErrorMessage(err) }));
            }
          },
        },
      });
    }, 1, 1000);

    clientWs.send(JSON.stringify({ status: 'connected', message: 'Connected to Zenith Live Guide' }));

    clientWs.on('message', (raw) => {
      try {
        const payload = JSON.parse(raw.toString());
        if (payload.audio && session) {
          session.sendRealtimeInput({
            audio: { data: payload.audio, mimeType: 'audio/pcm;rate=16000' },
          });
        } else if (payload.text && session) {
          session.sendRealtimeInput({
            text: payload.text,
          });
        }
      } catch (err) {
        console.error('Error handling incoming client audio packet:', err);
      }
    });

    clientWs.on('close', () => {
      console.log('Client closed WebSocket connection');
      if (session) {
        try {
          session.close();
        } catch (e) {
          // ignore
        }
      }
    });
  } catch (err: any) {
    console.error('Failed to initialize Live API session:', err);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(JSON.stringify({ error: extractCleanErrorMessage(err) }));
      clientWs.close();
    }
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Zenith Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
