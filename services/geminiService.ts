import { SessionConfig, VoiceName, GroundedSource } from '../types';

export function cleanClientErrorMessage(raw: any): string {
  if (!raw) return 'A momentary delay occurred. Please try again.';
  if (typeof raw === 'string') {
    try {
      if (raw.trim().startsWith('{') || raw.includes('{"error"')) {
        const jsonStart = raw.indexOf('{');
        const parsed = JSON.parse(raw.substring(jsonStart));
        if (parsed.error?.message) return parsed.error.message;
      }
    } catch {
      // ignore
    }
    if (raw.includes('503') || raw.includes('high demand') || raw.includes('UNAVAILABLE')) {
      return 'The AI service is experiencing a brief surge in demand. Automatic retries are active—please try again in a few moments.';
    }
    return raw;
  }
  if (raw.error?.message) return raw.error.message;
  if (typeof raw.error === 'string') return cleanClientErrorMessage(raw.error);
  return raw.message || 'An unexpected issue occurred. Please try again.';
}

export const fetchDailyFocus = async (): Promise<string> => {
  try {
    const res = await fetch('/api/daily-focus');
    if (!res.ok) throw new Error('Failed to fetch daily focus');
    const data = await res.json();
    return data.focus || 'Inhale calm, exhale tension, and be here in this sacred now.';
  } catch (err) {
    console.error('Error fetching daily focus:', err);
    return 'Inhale calm, exhale tension, and be here in this sacred now.';
  }
};

export const generateMeditationScript = async (config: SessionConfig): Promise<string> => {
  const res = await fetch('/api/meditation/generate-script', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Script generation failed' }));
    throw new Error(cleanClientErrorMessage(err.error || 'Failed to generate meditation script'));
  }
  const data = await res.json();
  return data.script;
};

export interface AudioGenerationResult {
  audioBase64: string | null;
  fallbackToClientVoice?: boolean;
  message?: string;
}

export const generateMeditationAudio = async (
  script: string,
  voice: VoiceName
): Promise<AudioGenerationResult> => {
  const res = await fetch('/api/meditation/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, voice }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Audio generation failed' }));
    throw new Error(cleanClientErrorMessage(err.error || 'Failed to generate meditation audio'));
  }
  const data = await res.json();
  return {
    audioBase64: data.audioBase64 || null,
    fallbackToClientVoice: Boolean(data.fallbackToClientVoice),
    message: data.message,
  };
};

export const generateMeditationVisual = async (prompt: string, atmosphere: string): Promise<{ imageBase64: string | null; fallback: boolean }> => {
  try {
    const res = await fetch('/api/meditation/generate-visual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, atmosphere }),
    });
    if (!res.ok) {
      return { imageBase64: null, fallback: true };
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn('Visual generation fallback triggered:', err);
    return { imageBase64: null, fallback: true };
  }
};

export const askGroundedMindfulness = async (
  message: string,
  history: Array<{ role: string; content: string }> = []
): Promise<{ text: string; sources: GroundedSource[] }> => {
  const res = await fetch('/api/chat/grounded-search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Inquiry failed' }));
    throw new Error(cleanClientErrorMessage(err.error || 'Failed to get grounded response'));
  }
  const data = await res.json();
  return {
    text: data.text,
    sources: data.sources || [],
  };
};

export const generateDailyFocus = fetchDailyFocus;

export const generateMeditationImages = async (prompt: string): Promise<string[]> => {
  const res = await generateMeditationVisual(prompt, 'Calm & Ethereal');
  return res.imageBase64 ? [res.imageBase64] : [];
};

export const streamChatResponse = async (
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const result = await askGroundedMindfulness(prompt);
  onChunk(result.text);
};
