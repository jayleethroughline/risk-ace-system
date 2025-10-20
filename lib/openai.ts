import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function callLLM(
  prompt: string,
  model: string = 'gpt-4o-mini',
  temperature: number = 0.7
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that responds concisely and accurately.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling LLM:', error);
    throw error;
  }
}

export async function callLLMWithJSON(
  prompt: string,
  model: string = 'gpt-4o-mini'
): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that responds only with valid JSON.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    return completion.choices[0]?.message?.content || '{}';
  } catch (error) {
    console.error('Error calling LLM with JSON:', error);
    throw error;
  }
}
