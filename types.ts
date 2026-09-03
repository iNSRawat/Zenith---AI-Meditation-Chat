export type VoiceName = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

export interface GroundedSource {
  title: string;
  url: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  sources?: GroundedSource[];
  timestamp?: number;
}

export interface SessionConfig {
  prompt: string;
  voice: VoiceName;
  atmosphere?: string;
  duration: 'short' | 'medium' | 'long';
  ambientSound?: 'binaural-drone' | 'singing-bowl' | 'gentle-rain' | 'ocean-drift' | 'none';
}

export interface SessionHistoryItem {
  id: string;
  prompt: string;
  atmosphere?: string;
  voice: VoiceName;
  script?: string;
  imageBase64?: string | null;
  imagesBase64?: string[];
  audioBase64: string | null;
  timestamp: number;
  durationSeconds?: number;
}

export interface DailyFocusData {
  focus: string;
  date: string;
}
