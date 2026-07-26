/**
 * Lambda: generateStory — POST /stories/generate
 *
 * Calls Amazon Bedrock (Nova Micro) to generate a level story.
 * Request body: { levelId, type: 'intro'|'outro', locale: 'en'|'es', context: string }
 * Response: { text, learnedConcepts?, realWorldExample? }
 *
 * Requires IAM permission: bedrock:InvokeModel
 * Model: amazon.nova-micro-v1:0
 */

interface LambdaEvent {
  body?: string;
  httpMethod: string;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface StoryRequest {
  levelId: string;
  type: 'intro' | 'outro';
  locale: 'en' | 'es';
  context: string;
}

interface StoryResponse {
  text: string;
  learnedConcepts?: string[];
  realWorldExample?: string;
}

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders(), body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!event.body) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing request body' }) };
  }

  let request: StoryRequest;
  try {
    request = JSON.parse(event.body) as StoryRequest;
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  if (!request.levelId || !request.type || !request.locale) {
    return { statusCode: 400, headers: corsHeaders(), body: JSON.stringify({ error: 'Missing required fields: levelId, type, locale' }) };
  }

  try {
    const story = await invokeBedrockModel(request);
    return { statusCode: 200, headers: corsHeaders(), body: JSON.stringify(story) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Bedrock invocation failed:', message);
    return { statusCode: 500, headers: corsHeaders(), body: JSON.stringify({ error: 'Story generation failed', detail: message }) };
  }
}

async function invokeBedrockModel(request: StoryRequest): Promise<StoryResponse> {
  // Dynamic import to avoid bundling issues in non-AWS environments
  const { BedrockRuntimeClient, InvokeModelCommand } = await import('@aws-sdk/client-bedrock-runtime');

  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

  const langInstruction = request.locale === 'es'
    ? 'Respond entirely in Spanish.'
    : 'Respond entirely in English.';

  const typeInstruction = request.type === 'intro'
    ? 'Write a dramatic 2-3 sentence intro story for a DevOps dungeon game level. Set the scene, describe the threat, and motivate the player.'
    : 'Write a 2-3 sentence outro story celebrating the player\'s victory. Include what was learned and a brief real-world connection.';

  const prompt = `${langInstruction}
${typeInstruction}
Context: ${request.context}
Level: ${request.levelId}

Respond in valid JSON format:
{
  "text": "the story text here",
  "learnedConcepts": ["concept1", "concept2"],
  "realWorldExample": "one sentence real-world example"
}`;

  const payload = {
    messages: [{ role: 'user' as const, content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 300, temperature: 0.8 },
  };

  const command = new InvokeModelCommand({
    modelId: 'amazon.nova-micro-v1:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(JSON.stringify(payload)),
  });

  const response = await client.send(command);
  const responseBody = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(responseBody) as { output?: { message?: { content?: Array<{ text?: string }> } } };

  const outputText = parsed.output?.message?.content?.[0]?.text ?? '';

  // Try to parse the JSON from the model's response
  const jsonMatch = outputText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { text: outputText };
  }

  try {
    const storyJson = JSON.parse(jsonMatch[0]) as StoryResponse;
    return {
      text: storyJson.text ?? outputText,
      learnedConcepts: storyJson.learnedConcepts,
      realWorldExample: storyJson.realWorldExample,
    };
  } catch {
    return { text: outputText };
  }
}
