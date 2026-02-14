
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { scanBuffer, encryptFileWithAES } from '@/lib/security';

// Initialize S3 Client
// Ensure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION are set in .env.local
const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const username = formData.get('username') as string;
        const orgBucket = formData.get('orgBucket') as string;

        if (!file || !username || !orgBucket) {
            return NextResponse.json(
                { error: 'Missing file, username, or organization bucket info' },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 1. Virus Scan
        console.log(`[Upload] Scanning file: ${file.name}`);
        const scanResult = await scanBuffer(buffer);

        if (scanResult.isInfected) {
            console.warn(`[Upload] Virus detected in ${file.name}: ${scanResult.viruses.join(', ')}`);
            return NextResponse.json(
                { error: 'Security Violation: Virus detected in file.', viruses: scanResult.viruses },
                { status: 406 } // Not Acceptable
            );
        }

        // 2. Encryption (AES-256-GCM)
        console.log(`[Upload] Encrypting file: ${file.name}`);
        const { encryptedBuffer, iv, authTag, key } = encryptFileWithAES(buffer);

        // Note: In a real hybrid system, we would encrypt 'key' with the user's Public Key here.
        // For now, we store the 'key' in metadata (in hex) directly. 
        // WARNING: In production, encrypt 'key' before storing!
        // const encryptedKey = encryptKeyWithPublicKey(key, user.publicKey);

        // 3. Upload to S3
        const keyPath = `${username}/${file.name}.enc`; // Store with .enc extension
        console.log(`[Upload] Uploading to S3: ${orgBucket}/${keyPath}`);

        const command = new PutObjectCommand({
            Bucket: orgBucket,
            Key: keyPath,
            Body: encryptedBuffer,
            ContentType: 'application/octet-stream',
            Metadata: {
                'original-name': file.name,
                'iv': iv,
                'auth-tag': authTag,
                'encrypted-key': key, // TODO: Replace with RSA-encrypted key in production
                'scan-status': 'clean',
                'encryption-algo': 'AES-256-GCM'
            }
        });

        try {
            await s3.send(command);
        } catch (s3Error: any) {
            console.error("S3 Upload Error:", s3Error);
            return NextResponse.json(
                { error: 'Failed to upload to storage. Check configuration.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'File scanned, encrypted, and stored successfully.',
            path: keyPath,
            bucket: orgBucket
        });

    } catch (error: any) {
        console.error("Upload handler error:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
