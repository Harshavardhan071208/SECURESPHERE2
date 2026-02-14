
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
});

export async function POST(req: NextRequest) {
    try {
        const { filename, contentType, username } = await req.json();

        if (!filename || !username) {
            return NextResponse.json({ error: 'Missing filename or username' }, { status: 400 });
        }

        // 1. Generate unique file path in Quarantine Bucket
        // Structure: quarantine/username/uuid-filename
        // The Lambda trigger will look for *new objects* in this bucket.
        const fileId = uuidv4();
        const key = `${username}/${fileId}-${filename}`;
        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine-placeholder';

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType || 'application/octet-stream',
            Metadata: {
                'original-name': filename,
                'uploader': username,
                'upload-date': new Date().toISOString()
            }
        });

        // 2. Generate Presigned URL (Valid for 15 minutes)
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

        return NextResponse.json({
            success: true,
            url: signedUrl,
            key: key,
            bucket: bucketName,
            fileId: fileId
        });

    } catch (error: any) {
        console.error("Presigned URL Error:", error);
        return NextResponse.json(
            { error: error.message || 'Error generating upload URL' },
            { status: 500 }
        );
    }
}
