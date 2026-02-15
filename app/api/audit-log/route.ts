
import { NextRequest, NextResponse } from 'next/server';

import { fetchAuditLogs, AuditLogItem } from '@/lib/audit-reader';

export const dynamic = 'force-dynamic';

function determineSeverity(action: string): 'low' | 'medium' | 'high' {
    if (action.includes('REJECTION') || action.includes('VIOLATION')) return 'high';
    if (action.includes('SHARE') || action.includes('ACCESS')) return 'medium';
    return 'low';
}

function mapToFrontendLog(item: AuditLogItem) {
    return {
        id: item.eventId,
        timestamp: item.timestamp,
        userId: item.userId,
        userName: item.userId, // DynamoDB doesn't store name, using ID as fallback
        action: item.action,
        details: `File: ${item.fileName || 'N/A'} | Hash: ${item.currentHash ? item.currentHash.substring(0, 10) + '...' : 'N/A'}`,
        severity: determineSeverity(item.action)
    };
}

export async function GET(req: NextRequest) {

    // Default orgId for fetching if not provided (or extract from session/query)
    // For now, fetching for a default org or all accessible ones?
    // Frontend (AuditorDashboard) doesn't seem to pass orgId in query param currently?
    // Let's check query params.
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId') || 'ORG-001'; // Default fallback for demo

    const dbLogs = await fetchAuditLogs(orgId);
    const logs = dbLogs.map(mapToFrontendLog);

    return NextResponse.json({ success: true, logs });
}


export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { logAuditEvent } = await import('@/lib/audit-logger');

        const userId = body.userId || 'system';
        const orgId = body.orgId || 'ORG-001';
        const action = body.action || 'UNKNOWN_ACTION';
        const fileName = body.fileName || 'N/A';

        // Invoke Lambda asynchronously
        await logAuditEvent({
            orgId,
            userId,
            action,
            fileName
        });

        // Return a mock object satisfying frontend expectations (since Lambda is async)
        const newLog = {
            id: 'pending-lambda',
            timestamp: new Date().toISOString(),
            userId,
            userName: body.userName || 'Unknown',
            action,
            details: body.details || '',
            severity: determineSeverity(action)
        };

        return NextResponse.json({ success: true, log: newLog });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
