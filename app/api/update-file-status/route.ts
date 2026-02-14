
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, CopyObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fileId, status, userId, orgId } = body;
        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';

        if (!fileId || !status || !userId || !orgId) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const key = fileId; // fileId is the S3 Key here

        // 1. Fetch existing metadata first (HeadObject) to preserve other fields
        const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: key
        });
        const head = await s3.send(headCommand);
        const existingMetadata = head.Metadata || {};

        // 2. Update Metadata via CopyObject (Copy to itself)
        const copyCommand = new CopyObjectCommand({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`, // Copy from self
            Key: key,
            Metadata: {
                ...existingMetadata,
                'status': status, // Update the status field
                'updated-at': new Date().toISOString()
            },
            MetadataDirective: 'REPLACE' // CRITICAL: Tells S3 to use new metadata
        });

        await s3.send(copyCommand);

        return NextResponse.json({ success: true, message: `File status updated to ${status}` });

    } catch (error: any) {
        console.error("Update status error:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to update file status' },
            { status: 500 }
        );
    }
}
