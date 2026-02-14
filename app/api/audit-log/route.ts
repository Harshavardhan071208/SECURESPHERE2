
import { NextRequest, NextResponse } from 'next/server';
import { readJsonFromS3, writeJsonToS3 } from '@/lib/s3-db';

export const dynamic = 'force-dynamic';

const LOG_FILE = 'audit_logs.json';

// Interface (matching previous MockLog structure somewhat)
interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    details: string;
    severity: 'low' | 'medium' | 'high';
}

async function getLogs(): Promise<AuditLog[]> {
    return await readJsonFromS3<AuditLog[]>(LOG_FILE, []);
}

async function saveLog(log: AuditLog): Promise<void> {
    const logs = await getLogs();
    logs.unshift(log); // Add to beginning (newest first)
    await writeJsonToS3(LOG_FILE, logs);
}

export async function GET(req: NextRequest) {
    const logs = await getLogs();
    return NextResponse.json({ success: true, logs });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const newLog: AuditLog = {
            id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            userId: body.userId || 'system',
            userName: body.userName || 'Unknown',
            action: body.action || 'UNKNOWN_ACTION',
            details: body.details || '',
            severity: body.severity || 'low'
        };

        await saveLog(newLog);
        return NextResponse.json({ success: true, log: newLog });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
