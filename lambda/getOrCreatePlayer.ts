import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LambdaEvent {
  body?: string;
  httpMethod: string;
  pathParameters?: Record<string, string>;
}

interface LambdaResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface PlayerProfile {
  username: string;
  personalBest: number;
  updatedAt: string; // ISO 8601 UTC
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  };
}

// ─── DynamoDB Client ─────────────────────────────────────────────────────────

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? 'cloud-quest-scores';
const REGION = process.env.AWS_REGION ?? 'us-east-1';

const client = new DynamoDBClient({ region: REGION });

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function handler(event: LambdaEvent): Promise<LambdaResponse> {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders(), body: '' };
  }

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const { username } = JSON.parse(event.body);

    if (typeof username !== 'string' || username.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'username must be a non-empty string' }),
      };
    }

    // Try to get existing player profile (using runId = "PROFILE" as SK)
    const getCommand = new GetItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ username, runId: 'PROFILE' }),
    });

    const result = await client.send(getCommand);

    if (result.Item) {
      // Player exists — return existing profile
      const record = unmarshall(result.Item);
      const profile: PlayerProfile = {
        username: record.username as string,
        personalBest: (record.personalBest as number) ?? 0,
        updatedAt: record.updatedAt as string,
      };

      return {
        statusCode: 200,
        headers: corsHeaders(),
        body: JSON.stringify(profile),
      };
    }

    // Player doesn't exist — create new profile
    const now = new Date().toISOString();
    const newProfile: PlayerProfile = {
      username,
      personalBest: 0,
      updatedAt: now,
    };

    const putCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        username,
        runId: 'PROFILE',
        personalBest: 0,
        gameId: 'CLOUD_QUEST',
        score: 0,
        timestamp: now,
        updatedAt: now,
      }),
    });

    await client.send(putCommand);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(newProfile),
    };
  } catch (error: unknown) {
    console.error('Error in getOrCreatePlayer:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message }),
    };
  }
}
