
import { NextRequest, NextResponse } from 'next/server';
import { readJsonFromS3, writeJsonToS3 } from '@/lib/s3-db';

export const dynamic = 'force-dynamic';

const NOTIFICATIONS_FILE = 'notifications.json';

export interface Notification {
    id: string;
    toUserId: string;
    fromUserId: string;
    fromOrgId: string;
    type: 'FILE_SHARED' | 'FILE_RECEIVED' | 'FILE_ACKNOWLEDGED';
    fileId: string;
    fileName: string;
    message: string;
    timestamp: string;
    read: boolean;
}

async function getNotifications(): Promise<Notification[]> {
    return await readJsonFromS3<Notification[]>(NOTIFICATIONS_FILE, []);
}

async function saveNotifications(notifications: Notification[]): Promise<void> {
    await writeJsonToS3(NOTIFICATIONS_FILE, notifications);
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const all = await getNotifications();
    const userNotifications = all.filter(n => n.toUserId === userId);

    return NextResponse.json({ success: true, notifications: userNotifications });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const newNotification: Notification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            toUserId: body.toUserId,
            fromUserId: body.fromUserId,
            fromOrgId: body.fromOrgId || 'Unknown',
            type: body.type,
            fileId: body.fileId,
            fileName: body.fileName,
            message: body.message,
            timestamp: new Date().toISOString(),
            read: false
        };

        const all = await getNotifications();
        all.unshift(newNotification);
        await saveNotifications(all);

        return NextResponse.json({ success: true, notification: newNotification });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to save notification' }, { status: 500 });
    }
}

// PATCH to mark as read
export async function PATCH(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

        const all = await getNotifications();
        const index = all.findIndex(n => n.id === id);
        if (index > -1) {
            all[index].read = true;
            await saveNotifications(all);
            return NextResponse.json({ success: true });
        }
        return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
