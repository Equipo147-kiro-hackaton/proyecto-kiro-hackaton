import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { randomUUID } from 'crypto';

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

    const payload = JSON.parse(event.body);
    const { username, score, highestLevel, timestamp } = payload;

    // Validate fields
    if (typeof username !== 'string' || username.trim().length === 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'username must be a non-empty string' }),
      };
    }

    if (typeof score !== 'number' || score < 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'score must be a number >= 0' }),
      };
    }

    if (typeof highestLevel !== 'number' || highestLevel < 1) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'highestLevel must be a number > 0' }),
      };
    }

    if (typeof timestamp !== 'string' || isNaN(Date.parse(timestamp))) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ error: 'timestamp must be a valid ISO 8601 string' }),
      };
    }

    // Generate unique run ID
    const runId = randomUUID();

    // PutItem — store the score run
    const putCommand = new PutItemCommand({
      TableName: TABLE_NAME,
      Item: marshall({
        username,
        runId,
        score,
        highestLevel,
        gameId: 'CLOUD_QUEST',
        timestamp,
      }),
    });

    await client.send(putCommand);

    // Update personalBest — conditional write: only if new score exceeds stored value
    const updateCommand = new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: marshall({ username, runId: 'PROFILE' }),
      UpdateExpression: 'SET personalBest = :newScore, updatedAt = :now, gameId = :gameId, score = :newScore',
      ConditionExpression: 'attribute_not_exists(personalBest) OR personalBest < :newScore',
      ExpressionAttributeValues: marshall({
        ':newScore': score,
        ':now': new Date().toISOString(),
        ':gameId': 'CLOUD_QUEST',
      }),
    });

    try {
      await client.send(updateCommand);
    } catch (conditionalError: unknown) {
      // ConditionalCheckFailedException means current personalBest >= new score — that's OK
      const err = conditionalError as { name?: string };
      if (err.name !== 'ConditionalCheckFailedException') {
        throw conditionalError;
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ message: 'Score submitted successfully', runId }),
    };
  } catch (error: unknown) {
    console.error('Error submitting score:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ error: message }),
    };
  }
}
