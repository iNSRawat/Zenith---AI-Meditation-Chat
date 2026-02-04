
import { GoogleGenAI, Chat, Modality } from "@google/genai";
import { ChatMessage, VoiceName, SessionConfig } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let chatInstance: Chat | null = null;

export const generateDailyFocus = async (): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: "Create a short, inspiring mindfulness quote or daily intention. It should be a single sentence, under 15 words. Keep it profound yet simple.",
            config: {
                temperature: 0.8,
            }
        });
        return response.text || "Breathe deeply and be present.";
    } catch (error) {
        console.error("Error generating daily focus:", error);
        throw new Error("Failed to generate daily focus.");
    }
};

export const generateMeditationScript = async (config: SessionConfig): Promise<string> => {
    const lengthMap = { short: '150', medium: '300', long: '500' };
    const wordCount = lengthMap[config.duration];
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Create a calm, soothing guided meditation script.
            Theme: "${config.prompt}"
            Atmosphere: "${config.atmosphere}"
            Target Length: ~${wordCount} words.
            The script should include gentle pauses (indicated by ...) and breathing instructions. 
            Do not include any stage directions, only the words to be spoken.`,
            config: {
                temperature: 0.7,
            }
        });
        return response.text || "";
    } catch (error) {
        console.error("Error generating meditation script:", error);
        throw new Error("Failed to generate meditation script.");
    }
};

export const generateMeditationImages = async (prompt: string): Promise<string[]> => {
    // We generate 3 images for a slideshow effect
    const imagePrompts = [
        `Serene, wide landscape representing: ${prompt}. Atmospheric lighting, no text, no people, photorealistic digital art.`,
        `Close-up macro detail or abstract textures matching the theme: ${prompt}. Ethereal, soft focus, calming colors.`,
        `A dreamlike, wider vista expanding on: ${prompt}. Sunset or moonlight colors, cinematic, highly detailed.`
    ];

    try {
        const results = await Promise.all(imagePrompts.map(p => 
            ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: p }] },
                config: {
                    imageConfig: { aspectRatio: "16:9" }
                }
            })
        ));

        const images: string[] = [];
        for (const res of results) {
            const part = res.candidates?.[0]?.content?.parts.find(p => p.inlineData);
            if (part?.inlineData?.data) {
                images.push(part.inlineData.data);
            }
        }
        
        if (images.length === 0) throw new Error("No images generated.");
        return images;
    } catch (error) {
        console.error("Error generating meditation images:", error);
        throw new Error("Failed to generate meditation images.");
    }
};

export const generateMeditationAudio = async (script: string, voice: VoiceName): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: script }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) return base64Audio;
        throw new Error("No audio data received.");
    } catch (error) {
        console.error("Error generating meditation audio:", error);
        throw new Error("Failed to generate meditation audio.");
    }
};

const getChatInstance = (): Chat => {
    if (!chatInstance) {
        chatInstance = ai.chats.create({
            model: 'gemini-3-flash-preview',
            config: {
                systemInstruction: "You are Zenith, a deeply empathetic and supportive mindfulness companion. Your purpose is to create a safe, non-judgmental space for users to explore their feelings. When a user shares an emotion, always acknowledge and validate it with kindness first (e.g., 'I hear that you're feeling...', 'It is completely understandable to feel...'). Offer gentle affirmations and soothing words. Avoid clinical or purely factual responses; instead, speak with warmth, patience, and genuine care, like a wise friend. Help users with meditation and stress, but prioritize emotional connection and comfort.",
            },
        });
    }
    return chatInstance;
};

export const streamChatResponse = async (newMessage: string, onChunk: (chunk: string) => void) => {
    const chat = getChatInstance();
    try {
        const responseStream = await chat.sendMessageStream({ message: newMessage });
        for await (const chunk of responseStream) {
             onChunk(chunk.text || "");
        }
    } catch (error) {
        console.error("Error in chat stream:", error);
        onChunk("I apologize, but I'm having trouble connecting right now. Let's take a deep breath together.");
    }
};
