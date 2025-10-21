// Using Google Gemini API with official SDK
import { GoogleGenAI } from '@google/genai';
import { LLM_CONFIG } from './config';
import { logger } from './logger';

// The client automatically picks up GEMINI_API_KEY from environment variables
const ai = new GoogleGenAI({});

export interface LLMResponse {
  text: string;
  latency_ms: number;
}

export async function callLLM(
  prompt: string,
  model: string = LLM_CONFIG.model,
  temperature: number = LLM_CONFIG.temperature
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
        maxOutputTokens: LLM_CONFIG.maxOutputTokens,
      },
    });

    const endTime = Date.now();
    const latency_ms = endTime - startTime;

    return {
      text: response.text || '',
      latency_ms,
    };
  } catch (error) {
    logger.error('Error calling LLM', error);
    throw error;
  }
}

export async function callLLMWithJSON(
  prompt: string,
  model: string = LLM_CONFIG.model
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
        temperature: LLM_CONFIG.temperature,
        maxOutputTokens: LLM_CONFIG.maxOutputTokens,
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
      logger.error('Failed to parse LLM JSON response');
      logger.error('Raw response: ' + response.text);
      logger.error('Cleaned text: ' + text, parseError);
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
    logger.error('Error calling LLM with JSON', error);
    throw error;
  }
}
