import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { MOCK_ORGS } from '@/constants';
import { OrganizationInfo } from '@/types';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';
const ORGS_KEY = 'database/orgs.json';

// Helper to convert stream to string
const streamToString = (stream: Readable): Promise<string> =>
    new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

export async function getAllOrgs(): Promise<OrganizationInfo[]> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: ORGS_KEY
        });
        const response = await s3.send(command);
        if (!response.Body) return MOCK_ORGS;

        const str = await streamToString(response.Body as Readable);
        const s3Orgs: OrganizationInfo[] = JSON.parse(str);
        
        // Merge with MOCK_ORGS
        // We override MOCK_ORGS with S3 orgs if they share the same ID.
        const mockMap = new Map(MOCK_ORGS.map(o => [o.id, o]));
        for (const s3Org of s3Orgs) {
            mockMap.set(s3Org.id, s3Org);
        }
        
        return Array.from(mockMap.values());
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return MOCK_ORGS;
        }
        console.warn("Failed to fetch orgs from S3:", error);
        return MOCK_ORGS;
    }
}

export async function saveOrgToS3(org: OrganizationInfo): Promise<void> {
    try {
        let s3Orgs: OrganizationInfo[] = [];
        try {
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: ORGS_KEY });
            const response = await s3.send(command);
            if (response.Body) {
                const str = await streamToString(response.Body as Readable);
                s3Orgs = JSON.parse(str);
            }
        } catch (e: any) {
            if (e.name !== 'NoSuchKey') throw e;
        }

        const existingIndex = s3Orgs.findIndex(o => o.id === org.id);
        if (existingIndex >= 0) {
            s3Orgs[existingIndex] = org; // Update
        } else {
            s3Orgs.push(org); // Add
        }

        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: ORGS_KEY,
            Body: JSON.stringify(s3Orgs, null, 2),
            ContentType: 'application/json'
        });
        await s3.send(putCommand);
        console.log(`[OrgDB] Saved org ${org.id} to S3`);

    } catch (error) {
        console.error("Failed to save org to S3:", error);
        throw error;
    }
}
