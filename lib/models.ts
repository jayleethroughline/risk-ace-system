// Using Google Gemini API with official SDK
import { GoogleGenAI } from '@google/genai';

// The client automatically picks up GEMINI_API_KEY from environment variables
const ai = new GoogleGenAI({});

export interface LLMResponse {
  text: string;
  latency_ms: number;
}

export async function callLLM(
  prompt: string,
  model: string = 'gemini-2.5-flash',
  temperature: number = 0.7
): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    const systemPrompt =
      'You are a helpful assistant that responds concisely and accurately.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature,
        maxOutputTokens: 8192,
      },
    });

    const endTime = Date.now();
    const latency_ms = endTime - startTime;

    return {
      text: response.text || '',
      latency_ms,
    };
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

export async function callLLMWithJSON(
  prompt: string,
  model: string = 'gemini-2.5-flash'
): Promise<LLMResponse> {
  const startTime = Date.now();

  try {
    const systemPrompt =
      'You are a helpful assistant that responds only with valid JSON. Do not include any markdown formatting or code blocks, just the raw JSON.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await ai.models.generateContent({
      model,
      contents: fullPrompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    });

    let text = response.text || '{}';

    // Clean up markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    // Try to extract JSON object or array from the text
    // Look for the first { or [ and last } or ]
    const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      text = jsonMatch[1].trim();
    }

    // Validate it's parseable JSON before returning
    try {
      JSON.parse(text);
    } catch (parseError) {
      console.error('❌ Failed to parse LLM JSON response');
      console.error('Raw response:', response.text);
      console.error('Cleaned text:', text);
      console.error('Parse error:', parseError);
      // Return empty object as fallback
      text = '{}';
    }

    const endTime = Date.now();
    const latency_ms = endTime - startTime;

    return {
      text,
      latency_ms,
    };
  } catch (error) {
    console.error('Error calling LLM with JSON:', error);
    throw error;
  }
}
