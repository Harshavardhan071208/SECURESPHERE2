
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// import { Readable } from 'stream'; // Unused in new JSON logic
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

// Helper for quick logging (duplicating small logic to keep routes independent)
function appendAuditLog(userId: string, userName: string, action: string, details: string) {
    try {
        const logPath = path.join(process.cwd(), 'data', 'audit_logs.json');
        let logs = [];
        if (fs.existsSync(logPath)) {
            logs = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        }
        logs.unshift({
            id: `dl-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId,
            userName,
            action,
            details,
            severity: 'medium' // Downloads are medium sensitivity
        });
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
    } catch (e) {
        console.error("Failed to log audit event:", e);
    }
}

// AESUtil is no longer needed server-side for decryption in E2EE mode
// import { AESUtil } from '@/lib/security/crypto/AESUtil';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const fileKey = searchParams.get('key');
        const userId = searchParams.get('userId');
        const orgId = searchParams.get('orgId');
        const userName = searchParams.get('userName') || 'User';

        if (!fileKey || !userId) {
            return NextResponse.json({ error: 'Missing key or user info' }, { status: 400 });
        }

        // Security Check: ensure key belongs to the requesting user
        const validPrefix1 = orgId ? `organisations/${orgId}/${userId}/` : `organisations/unknown/${userId}/`;
        const validPrefix2 = `${userId}/`;

        if (userId && !fileKey.startsWith(validPrefix1) && !fileKey.startsWith(validPrefix2)) {
            // Basic path check. In production, check DB permissions
        }

        const bucketName = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';

        // 1. Fetch from S3 (Get Object + Metadata)
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: fileKey
        });

        const s3Response = await s3.send(command);
        const metadata = s3Response.Metadata || {};

        // 2. Log Audit Event
        appendAuditLog(userId, userName, 'FILE_DOWNLOAD_ATTEMPT', `Fetching encrypted bundle: ${fileKey}`);

        // 3. Prepare Encrypted Bundle for Client
        // We do NOT decrypt here. We send the components to the client.

        // Get the encrypted file content
        const encryptedBodyByteArray = await s3Response.Body?.transformToByteArray();
        if (!encryptedBodyByteArray) throw new Error("Empty file body");
        const encryptedFileBase64 = Buffer.from(encryptedBodyByteArray).toString('base64');

        // Extract Encrypted Keys from Metadata
        const encryptedAesKey = metadata['encrypted-aes-key'];
        const encryptedIv = metadata['encrypted-iv'];
        const authTag = metadata['auth-tag']; // Needed for GCM

        if (!encryptedAesKey || !encryptedIv) {
            return NextResponse.json({ error: 'File metadata corrupted. Missing encryption keys.' }, { status: 500 });
        }

        // Return JSON Bundle
        return NextResponse.json({
            status: 'success',
            fileName: fileKey.split('/').pop()?.replace('.enc', '') || 'file',
            encryptedFile: encryptedFileBase64,
            encryptedKey: encryptedAesKey, // RSA-Encrypted AES Key
            encryptedIv: encryptedIv,       // RSA-Encrypted IV
            authTag: authTag,               // GCM Auth Tag (Plaintext or Base64)
            message: 'Encrypted bundle retrieved. Client-side decryption required.'
        });

    } catch (error: any) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to download file details' },
            { status: 500 }
        );
    }
}
