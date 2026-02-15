
const { DynamoDBClient, ListTablesCommand } = require("@aws-sdk/client-dynamodb");
const { LambdaClient, ListFunctionsCommand, InvokeCommand } = require("@aws-sdk/client-lambda");

// Check environment variables
console.log("Checking Environment Variables...");
const region = process.env.AWS_REGION || "us-east-1";
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
    console.error("❌ ERROR: Missing AWS Credentials in environment variables.");
    console.error("Please add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your .env.local file.");
    // Continue to see if default provider works (e.g. ~/.aws/credentials)
} else {
    console.log("✅ AWS Credentials found in environment.");
}

console.log(`Region: ${region}`);

async function diagnostic() {
    try {
        console.log("\n--- DynamoDB Diagnostic ---");
        const ddbClient = new DynamoDBClient({ region });
        const tables = await ddbClient.send(new ListTablesCommand({}));
        console.log("Tables found:", tables.TableNames);

        if (tables.TableNames.includes("AuditBlockchainLedger")) {
            console.log("✅ Table 'AuditBlockchainLedger' found.");
        } else {
            console.error("❌ Table 'AuditBlockchainLedger' NOT found in " + region);
        }

        console.log("\n--- Lambda Diagnostic ---");
        const lambdaClient = new LambdaClient({ region });
        const functions = await lambdaClient.send(new ListFunctionsCommand({}));
        const targetFunc = functions.Functions.find(f => f.FunctionName === "AuditLoggerLambda");

        if (targetFunc) {
            console.log("✅ Function 'AuditLoggerLambda' found.");

            // Try invoking it
            console.log("Attempting test invocation...");
            const payload = JSON.stringify({
                orgId: "TEST-ORG",
                userId: "DIAGNOSTIC-USER",
                action: "TEST_DIAGNOSTIC",
                fileName: "test.txt"
            });

            const invokeResult = await lambdaClient.send(new InvokeCommand({
                FunctionName: "AuditLoggerLambda",
                InvocationType: "RequestResponse", // Synchronous to see error
                Payload: Buffer.from(payload)
            }));

            if (invokeResult.FunctionError) {
                console.error("❌ Lambda execution failed:", invokeResult.FunctionError);
                console.error("Payload:", invokeResult.Payload ? Buffer.from(invokeResult.Payload).toString() : "No payload");
            } else {
                console.log("✅ Lambda invoked successfully. Status:", invokeResult.StatusCode);
                console.log("Response:", invokeResult.Payload ? Buffer.from(invokeResult.Payload).toString() : "No payload");
            }

        } else {
            console.error("❌ Function 'AuditLoggerLambda' NOT found in " + region);
        }

    } catch (error) {
        console.error("\n❌ DIAGNOSTIC FAILED:", error.message);
        if (error.name === "UnrecognizedClientException" || error.name === "InvalidSignatureException") {
            console.error(">> This is likely due to invalid or missing AWS Credentials.");
        }
    }
}

diagnostic();
