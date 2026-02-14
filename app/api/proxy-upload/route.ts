import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const apiGatewayUrl = process.env.NEXT_PUBLIC_API_GATEWAY_URL;

        if (!apiGatewayUrl) {
            return NextResponse.json({ error: 'API Gateway URL not configured' }, { status: 500 });
        }

        console.log(`Proxying request to: ${apiGatewayUrl}`);

        // Server-side fetch to the external API Gateway (Bypasses Browser CORS)
        const response = await fetch(apiGatewayUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Add any API keys if needed here
            },
            body: JSON.stringify(body)
        });

        // Get the data from the external API
        const data = await response.json();

        // Forward the status and data back to the frontend
        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: error.message || 'Failed to proxy request' },
            { status: 500 }
        );
    }
}
