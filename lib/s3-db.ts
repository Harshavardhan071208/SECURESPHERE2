
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine'; // Ideally use a separate bucket for data, but reusing for simplicity if needed.
const DB_PREFIX = 'database/'; // Store JSON files in "database/" folder

// Helper to convert stream to string
const streamToString = (stream: Readable): Promise<string> =>
    new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

export async function readJsonFromS3<T>(fileName: string, defaultValue: T): Promise<T> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${DB_PREFIX}${fileName}`
        });
        const response = await s3.send(command);
        if (!response.Body) return defaultValue;

        const str = await streamToString(response.Body as Readable);
        return JSON.parse(str);
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return defaultValue;
        }
        console.error(`Error reading ${fileName} from S3:`, error);
        return defaultValue;
    }
}

export async function writeJsonToS3<T>(fileName: string, data: T): Promise<void> {
    try {
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `${DB_PREFIX}${fileName}`,
            Body: JSON.stringify(data, null, 2),
            ContentType: 'application/json'
        });
        await s3.send(command);
    } catch (error) {
        console.error(`Error writing ${fileName} to S3:`, error);
        throw error;
    }
}
