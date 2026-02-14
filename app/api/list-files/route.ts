
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const orgId = searchParams.get('orgId');
        const userId = searchParams.get('userId');
        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';

        if (!userId || !orgId) {
            return NextResponse.json({ error: 'Missing userId or orgId parameter' }, { status: 400 });
        }

        // Construct prefix based on Org Isolation Architecture
        const prefix = `organisations/${orgId}/${userId}/`;

        const command = new ListObjectsV2Command({
            Bucket: bucketName,
            Prefix: prefix
        });

        const response = await s3.send(command);

        // Fetch Metadata for each file to determine sender/status
        const files = await Promise.all((response.Contents || []).map(async (obj) => {
            try {
                if (!obj.Key) return null; // Should not happen given Content type

                const headCommand = new HeadObjectCommand({
                    Bucket: bucketName,
                    Key: obj.Key
                });
                const head = await s3.send(headCommand);
                const metadata = head.Metadata || {};

                // Helper for case-insensitive lookup
                const getMeta = (key: string) => Object.keys(metadata).find(k => k.toLowerCase() === key.toLowerCase()) ? metadata[Object.keys(metadata).find(k => k.toLowerCase() === key.toLowerCase()) as string] : undefined;

                const senderId = getMeta('sender-id') || userId; // Fallback to self if missing

                return {
                    id: obj.Key || `f-${Date.now()}`,
                    name: getMeta('original-name') || obj.Key?.split('/').pop()?.replace('.enc', '') || 'unknown',
                    size: obj.Size,
                    timestamp: obj.LastModified?.toISOString(),
                    encryptedKeyPath: obj.Key,
                    bucket: bucketName,
                    uploaderId: senderId, // Crucial for "Shared with Me"
                    uploaderName: senderId, // Still using ID as name for now
                    senderOrgId: getMeta('sender-org-id'),
                    receiverId: getMeta('receiver-id'),
                    status: getMeta('status') || 'active', // For acknowledgement status
                    permissions: [userId]
                };
            } catch (headErr) {
                console.warn(`Failed to fetch metadata for ${obj.Key}`, headErr);
                return {
                    id: obj.Key || `f-${Date.now()}`,
                    name: obj.Key?.split('/').pop()?.replace('.enc', '') || 'unknown',
                    size: obj.Size,
                    timestamp: obj.LastModified?.toISOString(),
                    encryptedKeyPath: obj.Key,
                    bucket: bucketName,
                    uploaderId: userId, // Fallback to self
                    status: 'active'
                };
            }
        }));

        const validFiles = files.filter(f => f !== null);

        return NextResponse.json({ success: true, files: validFiles });

    } catch (error: any) {
        console.error("List files error:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to list files' },
            { status: 500 }
        );
    }
}
