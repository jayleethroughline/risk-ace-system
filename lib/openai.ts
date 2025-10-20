// Using Google Gemini API instead of OpenAI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function callLLM(
  prompt: string,
  model: string = 'gemini-pro',
  temperature: number = 0.7
): Promise<string> {
  try {
    const systemPrompt = 'You are a helpful assistant that responds concisely and accurately.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

export async function callLLMWithJSON(
  prompt: string,
  model: string = 'gemini-pro'
): Promise<string> {
  try {
    const systemPrompt = 'You are a helpful assistant that responds only with valid JSON. Do not include any markdown formatting or code blocks, just the raw JSON.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    const response = await fetch(
      `${GEMINI_API_BASE}/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // Clean up markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    return text;
  } catch (error) {
    console.error('Error calling LLM with JSON:', error);
    throw error;
  }
}
