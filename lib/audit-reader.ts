
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";


const clientConfig: any = {
    region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const client = new DynamoDBClient(clientConfig);

const ddbDocClient = DynamoDBDocumentClient.from(client);

export interface AuditLogItem {
    orgId: string;
    timestamp: string;
    eventId: string;
    userId: string;
    action: string;
    fileName: string;
    previousHash: string;
    currentHash: string;
}

export async function fetchAuditLogs(orgId: string): Promise<AuditLogItem[]> {
    try {
        const params = {
            TableName: "AuditBlockchainLedger",
            KeyConditionExpression: "orgId = :orgId",
            ExpressionAttributeValues: {
                ":orgId": orgId,
            },
            ScanIndexForward: false, // Newest first
        };

        const data = await ddbDocClient.send(new QueryCommand(params));
        return (data.Items as AuditLogItem[]) || [];
    } catch (err) {
        console.error("Error fetching audit logs", err);
        return [];
    }
}
