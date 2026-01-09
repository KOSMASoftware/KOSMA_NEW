
import { GoogleGenAI, Type } from "@google/genai";
import { GreetingTheme } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateCreativeGreeting = async (theme: GreetingTheme): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Erstelle eine kreative und einzigartige Version von "Hallo Welt" im Stil von: ${theme}. Antworte nur mit dem Grußtext, maximal 15 Wörter.`,
      config: {
        temperature: 0.8,
        topP: 0.9,
      }
    });

    return response.text || "Hallo Welt!";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Hallo Welt (Backup-Modus)";
  }
};

export const getGreetingStats = async (): Promise<{name: string, value: number}[]> => {
    // Mocking some data for the charts to make the UI look rich
    return [
        { name: 'Deutsch', value: 400 },
        { name: 'Englisch', value: 300 },
        { name: 'Spanisch', value: 200 },
        { name: 'Japanisch', value: 150 },
        { name: 'Französisch', value: 100 },
    ];
}
