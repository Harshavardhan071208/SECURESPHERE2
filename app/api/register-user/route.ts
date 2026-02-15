
import { NextRequest, NextResponse } from 'next/server';
import { saveUserToS3 } from '@/lib/user-db';
import { UserProfile } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        // Frontend sends: { id, email, orgId, publicKey, role, groupId }
        // We need to map this to UserProfile
        const { id, email, orgId, publicKey, role, groupId } = body;

        console.log(`[Register] Registering user ${id} (${email}) for Org ${orgId}`);

        if (!id || !email || !role || !publicKey) {
            return NextResponse.json({ error: 'Missing user profile data' }, { status: 400 });
        }

        // Determine Organization Name (Frontend didn't send it, but we can infer or leave generic)
        // Ideally frontend should send it.
        // For now, let's look it up from MOCK_ORGS if possible, or just use ID.
        // Importing MOCK_ORGS might be circular? No constants is fine.
        // But for speed, just use orgId as name fallback.
        const organization = orgId || 'Unknown Org';

        const newUser: UserProfile = {
            id,
            name: email.split('@')[0], // Derive name from email
            email,
            role,
            organization,
            orgId,
            publicKey
        };

        // Save to S3 via Helper
        await saveUserToS3(newUser);

        return NextResponse.json({ success: true, user: newUser });
    } catch (error: any) {
        console.error("Failed to register public key:", error);
        return NextResponse.json({ error: error.message || 'Failed to save user profile' }, { status: 500 });
    }
}
