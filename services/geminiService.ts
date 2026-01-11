
import { GoogleGenAI, GenerateContentResponse, Chat, Type, Modality } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private currentModel: string | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  private initChat(model: string, systemInstruction?: string) {
    this.chatSession = this.ai.chats.create({
      model: model,
      config: {
        systemInstruction: systemInstruction || 'You are a helpful, professional AI. Use Google Search for current info.',
        // Disable search for lite models to ensure maximum performance and minimum latency
        tools: model.includes('lite') ? [] : [{ googleSearch: {} }],
        temperature: 0.7,
      },
    });
    this.currentModel = model;
  }

  async *streamMessage(message: string, modelName: string = 'gemini-3-flash-preview', systemInstruction?: string) {
    // If model changes or session is null, re-initialize
    if (!this.chatSession || this.currentModel !== modelName) {
      this.initChat(modelName, systemInstruction);
    }

    try {
      const result = await this.chatSession!.sendMessageStream({ message });
      let groundingSources: any[] = [];
      
      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        
        // Extract grounding sources if present (only available in non-lite models)
        const chunks = c.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks) {
          groundingSources = chunks.map((chunk: any) => ({
            title: chunk.web?.title || 'Source',
            url: chunk.web?.uri || '#'
          })).filter((s: any) => s.url !== '#');
        }

        if (c.text) {
          yield { text: c.text, sources: groundingSources };
        }
      }
    } catch (error) {
      console.error('Gemini Stream Error:', error);
      throw error;
    }
  }

  async editImage(prompt: string, base64Image: string, mimeType: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  }

  async generateVideo(prompt: string, base64Image: string, mimeType: string, aspectRatio: '16:9' | '9:16' = '16:9') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt || 'Animate this scene beautifully',
      image: {
        imageBytes: base64Image,
        mimeType: mimeType,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  resetChat() {
    this.chatSession = null;
    this.currentModel = null;
  }
}

export const geminiService = new GeminiService();
