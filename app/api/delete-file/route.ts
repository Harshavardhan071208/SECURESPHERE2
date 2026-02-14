
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fileKey = searchParams.get('key');
        // We require the userId for security, though strict proper auth would check session
        // Here we just check logical consistency or skip extra checks for MVP demo
        const userId = searchParams.get('userId');
        const orgId = searchParams.get('orgId');

        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';

        if (!fileKey) {
            return NextResponse.json({ error: 'Missing file key' }, { status: 400 });
        }

        // Security Check: ensure key belongs to the requesting user
        // Pattern 1: organisations/ORG_ID/USER_ID/...
        // Pattern 2: USER_ID/... (Legacy/Demo)
        const validPrefix1 = orgId ? `organisations/${orgId}/${userId}/` : `organisations/unknown/${userId}/`;
        const validPrefix2 = `${userId}/`; // Keeping for legacy, but orgId path is preferred

        if (userId && !fileKey.startsWith(validPrefix1) && !fileKey.startsWith(validPrefix2)) {
            // If orgId is missing from request, we might be lenient if fileKey matches userId/
            // But if orgId is present, we enforce it.
            return NextResponse.json({ error: 'Unauthorized deletion attempt' }, { status: 403 });
        }

        console.log(`[Delete] Deleting file: ${bucketName}/${fileKey}`);

        const command = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: fileKey,
        });

        await s3.send(command);

        return NextResponse.json({
            success: true,
            message: 'File deleted successfully',
            deletedKey: fileKey
        });

    } catch (error: any) {
        console.error("Delete file error:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to delete file' },
            { status: 500 }
        );
    }
}
