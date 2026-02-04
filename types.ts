
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type VoiceName = 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';

export interface SessionConfig {
  prompt: string;
  voice: VoiceName;
  atmosphere: string;
  duration: 'short' | 'medium' | 'long';
}

export interface SessionHistoryItem {
  id: string;
  prompt: string;
  imagesBase64: string[];
  audioBase64: string;
  timestamp: number;
  voice: VoiceName;
}
