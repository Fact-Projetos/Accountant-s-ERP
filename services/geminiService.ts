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
  },
  {
    id: '3',
    title: 'SPED Contábil - ECD',
    summary: 'Prazo de transmissão da ECD se aproxima. Verifique os livros digitais.',
    category: 'Contábil',
    date: new Date().toLocaleDateString('pt-BR')
  },
  {
    id: '4',
    title: 'Simples Nacional - PGDAS',
    summary: 'Declarações do mês anterior devem ser enviadas até o dia 20.',
    category: 'Fiscal',
    date: new Date().toLocaleDateString('pt-BR')
  }
];

// Check API key once at module level to avoid repeated checks
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isGeminiConfigured = !!(geminiApiKey && geminiApiKey !== 'PLACEHOLDER_API_KEY' && geminiApiKey.trim() !== '');

export const fetchAccountingNews = async (): Promise<NewsItem[]> => {
  // Return fallback immediately if no API key — no async work, no console noise
  if (!isGeminiConfigured) {
    return getFallbackNews();
  }

  try {
    // Dynamic import: only loads @google/genai when an API key is actually present
    const { GoogleGenAI, Type } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

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
