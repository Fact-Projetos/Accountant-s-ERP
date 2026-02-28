import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem } from "../types";

const getFallbackNews = (): NewsItem[] => [
  {
    id: '1',
    title: 'Atualização Tabela IRRF',
    summary: 'Receita Federal confirma novas faixas de isenção para o ano calendário corrente.',
    category: 'Fiscal',
    date: new Date().toLocaleDateString('pt-BR')
  },
  {
    id: '2',
    title: 'Prazo do E-Social Doméstico',
    summary: 'Guias devem ser emitidas até o dia 07 para evitar multas automáticas.',
    category: 'Trabalhista',
    date: new Date().toLocaleDateString('pt-BR')
  }
];

export const fetchAccountingNews = async (): Promise<NewsItem[]> => {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY' || apiKey.trim() === '') {
      console.warn('Gemini API key not configured. Using fallback news.');
      return getFallbackNews();
    }

    // Lazy instantiation to avoid crash if key is invalid/missing at import time
    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'Gere 4 notícias fictícias sobre contabilidade no Brasil para hoje. Tópicos: Receita Federal, Simples Nacional, SPED. Responda em JSON.',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              category: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ["title", "summary", "category", "date"]
          }
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) return getFallbackNews();

    const parsedData = JSON.parse(jsonText);
    return parsedData.map((item: any, index: number) => ({
      ...item,
      id: `news-${index}-${Date.now()}`
    }));

  } catch (error) {
    console.error("Failed to fetch news from Gemini:", error);
    return getFallbackNews();
  }
};
