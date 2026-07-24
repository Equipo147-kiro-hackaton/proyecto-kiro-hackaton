import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

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

interface LeaderboardEntry {
  username: string;
  score: number;
  runDate: string; // YYYY-MM-DD
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
    // Query ScoreIndex GSI: gameId = "CLOUD_QUEST", sorted by score descending, limit 10
    const queryCommand = new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'ScoreIndex',
      KeyConditionExpression: 'gameId = :gameId',
      ExpressionAttributeValues: {
        ':gameId': { S: 'CLOUD_QUEST' },
      },
      ScanIndexForward: false, // descending order (highest scores first)
      Limit: 10,
    });

    const result = await client.send(queryCommand);

    // Map items to LeaderboardEntry format
    const entries: LeaderboardEntry[] = (result.Items ?? []).map((item) => {
      const record = unmarshall(item);
      return {
        username: record.username as string,
        score: record.score as number,
        runDate: typeof record.timestamp === 'string'
          ? record.timestamp.substring(0, 10)
          : new Date().toISOString().substring(0, 10),
      };
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(entries),
    };
  } catch (error: unknown) {
    console.error('Error retrieving leaderboard:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message }),
    };
  }
}
