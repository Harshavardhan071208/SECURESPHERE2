
import { GoogleGenAI, Type } from "@google/genai";
import { ActivityLog } from "../types";

// Always use the named parameter and direct process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });

export const analyzeSecurityLogs = async (logs: ActivityLog[]): Promise<string> => {
  try {
    const logSummary = logs.map(l => `[${l.timestamp}] ${l.userName} performed ${l.action}: ${l.details}`).join('\n');
    
    // Use ai.models.generateContent to query GenAI with both the model name and prompt
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are a cybersecurity expert. Analyze the following organization activity logs and provide a concise security assessment. Highlight suspicious patterns, summarize activity levels, and suggest if any actions are needed. Keep it under 150 words.\n\nLOGS:\n${logSummary}`,
      config: {
        temperature: 0.7,
        topP: 0.8,
      }
    });

    // Access the .text property directly (not a method)
    return response.text || "Security analysis unavailable at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating security insights. Please try again later.";
  }
};

export const getSmartSearchSuggestions = async (query: string): Promise<string[]> => {
    try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Given the user search query: "${query}", suggest 3-5 specific cybersecurity or file-related search terms relevant to an enterprise audit system.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                suggestions: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["suggestions"]
            }
          }
        });
        // Access the .text property directly
        const data = JSON.parse(response.text || '{"suggestions": []}');
        return data.suggestions;
    } catch (error) {
        return [];
    }
}
