
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAITurn = async (boardState: string, playerColor: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analiza este tablero de Zen Chess (Kung Fu Chess): ${boardState}. Juegas con ${playerColor}. Sugiere los 3 mejores movimientos inmediatos considerando que no hay turnos, solo cooldowns. Devuelve JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            moves: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  from: { type: Type.STRING, description: "Square e.g. e2" },
                  to: { type: Type.STRING, description: "Square e.g. e4" },
                  reason: { type: Type.STRING }
                }
              }
            },
            strategy: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
