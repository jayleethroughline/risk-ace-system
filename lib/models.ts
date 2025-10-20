// Using Google Gemini API with official SDK
import { GoogleGenAI } from '@google/genai';

// The client automatically picks up GEMINI_API_KEY from environment variables
const ai = new GoogleGenAI({});

export async function callLLM(
  prompt: string,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.7
): Promise<string> {
  try {
    const systemPrompt =
      'You are a helpful assistant that responds concisely and accurately.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature,
        maxOutputTokens: 2048,
      },
    });

    return response.text || '';
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

export async function callLLMWithJSON(
  prompt: string,
  model: string = 'gemini-2.5-flash'
): Promise<string> {
  try {
    const systemPrompt =
      'You are a helpful assistant that responds only with valid JSON. Do not include any markdown formatting or code blocks, just the raw JSON.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    let text = response.text || '{}';

    // Clean up markdown code blocks if present (fallback)
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return text;
  } catch (error) {
    console.error('Error calling LLM with JSON:', error);
    throw error;
  }
}
