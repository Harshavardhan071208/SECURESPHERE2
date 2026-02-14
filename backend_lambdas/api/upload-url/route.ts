import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
    requestChecksumCalculation: 'WHEN_REQUIRED', // Prevent AWS SDK v3 from adding auto-checksums
});

const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Replace with specific domain in production
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    try {
        const { fileName, contentType, userId } = await req.json();

        // Support both naming conventions (frontend uses fileName/userId)
        const activeFileName = fileName;
        const activeUserId = userId || 'demouser';

        if (!activeFileName || !activeUserId) {
            return NextResponse.json(
                { error: 'Missing fileName or userId' },
                { status: 400, headers: corsHeaders }
            );
        }

        // 1. Generate unique file path in Quarantine Bucket
        const fileId = uuidv4();
        const key = `${activeUserId}/${fileId}-${activeFileName}`;
        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: contentType || 'application/octet-stream',
            Metadata: {
                'original-name': activeFileName,
                'uploader': activeUserId,
                'upload-date': new Date().toISOString()
            }
        });

        // 2. Generate Presigned URL (Valid for 15 minutes)
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 });

        return NextResponse.json({
            success: true,
            uploadUrl: signedUrl, // Matches frontend expectation
            key: key,
            bucket: bucketName,
            fileId: fileId
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error("Presigned URL Error:", error);
        return NextResponse.json(
            { error: error.message || 'Error generating upload URL' },
            { status: 500, headers: corsHeaders }
        );
    }
}
