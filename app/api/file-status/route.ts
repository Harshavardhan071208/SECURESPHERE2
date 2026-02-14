
import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB Client
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const dynamo = DynamoDBDocumentClient.from(client);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const fileId = searchParams.get('fileId');

        if (!fileId) {
            return NextResponse.json({ error: 'Missing fileId' }, { status: 400 });
        }

        const command = new GetCommand({
            TableName: 'SecureSphereFileStatus',
            Key: {
                fileId: fileId,
            },
        });

        const result = await dynamo.send(command);

        if (!result.Item) {
            return NextResponse.json({ status: 'NOT_FOUND' });
        }

        return NextResponse.json(result.Item);
    } catch (error: any) {
        console.error('DynamoDB Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch status', details: error.message },
            { status: 500 }
        );
    }
}
