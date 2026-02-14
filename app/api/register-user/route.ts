import { NextRequest, NextResponse } from 'next/server';
import { readJsonFromS3, writeJsonToS3 } from '@/lib/s3-db';

export const dynamic = 'force-dynamic';

const USERS_FILE = 'users.json';

interface RegisteredUser {
    id: string; // User ID
    email: string;
    orgId: string;
    publicKey: string;
    role: string;
    groupId: string;
    timestamp: string;
}

async function getUsers(): Promise<RegisteredUser[]> {
    return await readJsonFromS3<RegisteredUser[]>(USERS_FILE, []);
}

async function saveUser(user: RegisteredUser): Promise<void> {
    const users = await getUsers();
    // Remove existing if duplicate ID/Email to update
    const filtered = users.filter(u => u.id !== user.id && u.email !== user.email);
    filtered.push(user);
    await writeJsonToS3(USERS_FILE, filtered);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');

    const users = await getUsers();

    if (userId) {
        const user = users.find(u => u.id === userId);
        return NextResponse.json({ found: !!user, user });
    }

    if (email) {
        const user = users.find(u => u.email === email);
        return NextResponse.json({ found: !!user, user });
    }

    return NextResponse.json({ success: true, count: users.length, users }); // Admin/Debug view
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        if (!body.id || !body.email || !body.publicKey || !body.orgId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const newUser: RegisteredUser = {
            id: body.id,
            email: body.email,
            orgId: body.orgId,
            publicKey: body.publicKey,
            role: body.role || 'USER',
            groupId: body.groupId || 'unknown',
            timestamp: new Date().toISOString()
        };

        await saveUser(newUser);
        return NextResponse.json({ success: true, message: 'User registered in directory.' });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to save user' }, { status: 500 });
    }
}
