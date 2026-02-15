
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";


const clientConfig: any = {
    region: process.env.AWS_REGION || "us-east-1",
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
}

const lambdaClient = new LambdaClient(clientConfig);

export interface AuditEvent {
    orgId: string;
    userId: string;
    action: string;
    fileName?: string;
}

export async function logAuditEvent(event: AuditEvent) {
    try {
        const command = new InvokeCommand({
            FunctionName: "AuditLoggerLambda",
            InvocationType: "Event", // Asynchronous invocation
            Payload: JSON.stringify(event),
        });

        console.log(`[Audit] Invoking Lambda for action: ${event.action} by ${event.userId}`);
        await lambdaClient.send(command);
    } catch (error) {
        console.error("[Audit] Failed to invoke AuditLoggerLambda:", error);
        // Don't throw, so we don't block the main flow if logging fails
    }
}
