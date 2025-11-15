import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { ChatMessage } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chatInstance: Chat | null = null;

export const generateMeditationScript = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a calm, soothing guided meditation script based on this theme: "${prompt}". The script should be about 200-250 words long, suitable for a text-to-speech voiceover. Structure it with pauses and gentle instructions.`,
            config: {
                temperature: 0.7,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error generating meditation script:", error);
        throw new Error("Failed to generate meditation script.");
    }
};

export const generateMeditationImage = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: `A beautiful, serene, photorealistic digital art piece for a guided meditation. Theme: "${prompt}". The image should be calming and high-resolution, with no text or people. Aspect ratio 16:9.`,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '16:9',
            },
        });
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages[0].image.imageBytes;
        }
        throw new Error("No image was generated.");
    } catch (error) {
        console.error("Error generating meditation image:", error);
        throw new Error("Failed to generate meditation image.");
    }
};

export const generateMeditationAudio = async (script: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Say with a calm, soothing, and gentle voice: ${script}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return base64Audio;
        }
        throw new Error("No audio data received.");
    } catch (error) {
        console.error("Error generating meditation audio:", error);
        throw new Error("Failed to generate meditation audio.");
    }
};

const getChatInstance = (): Chat => {
    if (!chatInstance) {
        chatInstance = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: {
                systemInstruction: "You are a friendly and helpful chatbot for the Zenith meditation app. Answer questions about meditation, mindfulness, and general well-being. Keep your responses concise and positive.",
            },
        });
    }
    return chatInstance;
};

// Fix: The call to `history.findLast` was causing a TypeScript error because `findLast`
// is a recent addition to JavaScript. The code was also unused. The `history` parameter has been removed
// because the stateful `chat` object, created by `ai.chats.create`, maintains its own history.
export const streamChatResponse = async (newMessage: string, onChunk: (chunk: string) => void) => {
    const chat = getChatInstance();
    // The `ai.chats.create` keeps its own history.
    try {
        const responseStream = await chat.sendMessageStream({ message: newMessage });
        for await (const chunk of responseStream) {
             onChunk(chunk.text);
        }
    } catch (error) {
        console.error("Error in chat stream:", error);
        onChunk("Sorry, I encountered an error. Please try again.");
    }
};
