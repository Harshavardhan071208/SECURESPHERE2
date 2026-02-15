
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { MOCK_USERS } from '@/constants';
import { UserProfile } from '@/types';

const s3 = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.QUARANTINE_BUCKET_NAME || 'securesphere-quarantine';
const USERS_KEY = 'database/users.json';

// Helper to convert stream to string
const streamToString = (stream: Readable): Promise<string> =>
    new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on("error", (err) => reject(err));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

export async function getAllUsers(): Promise<UserProfile[]> {
    try {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: USERS_KEY
        });
        const response = await s3.send(command);
        if (!response.Body) return MOCK_USERS;

        const str = await streamToString(response.Body as Readable);
        const s3Users = JSON.parse(str);
        // Merge with MOCK_USERS to ensure default accounts always exist
        // Prefer S3 users if ID collision (allows updating mocks in DB)
        const combined = [...MOCK_USERS.filter(m => !s3Users.some((u: UserProfile) => u.id === m.id)), ...s3Users];
        return combined;
    } catch (error: any) {
        if (error.name === 'NoSuchKey') {
            return MOCK_USERS;
        }
        console.warn("Failed to fetch users from S3:", error);
        return MOCK_USERS;
    }
}

export async function getUserById(userId: string): Promise<UserProfile | undefined> {
    const users = await getAllUsers();
    return users.find(u => u.id === userId);
}

export async function saveUserToS3(user: UserProfile): Promise<void> {
    try {
        const users = await getAllUsers();
        // Remove existing if present (update)
        const otherUsers = users.filter(u => u.id !== user.id && !MOCK_USERS.some(m => m.id === u.id));
        // We don't save MOCK_USERS back to S3 to keep file clean, only new registrations
        // But we DO need to save this new user.

        // Actually, simplest strategy: Read S3 file, add/update user, write back.
        // Don't mix MOCK_USERS into the *saved* file, only into the *read* result.

        // 1. Get ONLY S3 users
        let s3Users: UserProfile[] = [];
        try {
            const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: USERS_KEY });
            const response = await s3.send(command);
            if (response.Body) {
                const str = await streamToString(response.Body as Readable);
                s3Users = JSON.parse(str);
            }
        } catch (e: any) {
            if (e.name !== 'NoSuchKey') throw e;
        }

        // 2. Add/Update
        const existingIndex = s3Users.findIndex(u => u.id === user.id);
        if (existingIndex >= 0) {
            s3Users[existingIndex] = user;
        } else {
            s3Users.push(user);
        }

        // 3. Write
        const putCommand = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: USERS_KEY,
            Body: JSON.stringify(s3Users, null, 2),
            ContentType: 'application/json'
        });
        await s3.send(putCommand);
        console.log(`[UserDB] Saved user ${user.id} to S3`);

    } catch (error) {
        console.error("Failed to save user to S3:", error);
        throw error;
    }
}
