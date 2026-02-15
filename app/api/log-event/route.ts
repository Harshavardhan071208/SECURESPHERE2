
import { NextRequest, NextResponse } from "next/server";
import { logAuditEvent, AuditEvent } from "@/lib/audit-logger";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orgId, userId, action, fileName } = body;

        if (!orgId || !userId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const event: AuditEvent = {
            orgId,
            userId,
            action,
            fileName,
        };

        await logAuditEvent(event);

        return NextResponse.json({ success: true, message: "Audit event logged" });
    } catch (error) {
        console.error("[POST /api/log-event] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
