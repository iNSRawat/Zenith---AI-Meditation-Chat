
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SessionHistoryItem {
  id: string;
  prompt: string;
  imageBase64: string;
  audioBase64: string;
  timestamp: number;
}
