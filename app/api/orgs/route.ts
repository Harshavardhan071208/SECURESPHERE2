import { NextRequest, NextResponse } from 'next/server';
import { getAllOrgs, saveOrgToS3 } from '@/lib/org-db';
import { OrganizationInfo } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const orgs = await getAllOrgs();
        return NextResponse.json(orgs);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, name, industry, status, onboardedDate, totalUsers, totalFiles, adminEmail } = body;

        if (!id || !name || !industry) {
            return NextResponse.json({ error: 'Missing organization profile data' }, { status: 400 });
        }

        const newOrg: OrganizationInfo = {
            id,
            name,
            industry,
            status: status || 'pending',
            onboardedDate: onboardedDate || new Date().toISOString().split('T')[0],
            totalUsers: totalUsers || 1,
            totalFiles: totalFiles || 0,
        };

        // If extra fields are provided, we can forcefully assign them if needed in the frontend
        if (adminEmail) {
            (newOrg as any).adminEmail = adminEmail;
        }

        await saveOrgToS3(newOrg);

        return NextResponse.json({ success: true, org: newOrg });
    } catch (error: any) {
        console.error("Failed to save organization:", error);
        return NextResponse.json({ error: error.message || 'Failed to save organization' }, { status: 500 });
    }
}
