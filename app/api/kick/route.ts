import { NextRequest, NextResponse } from "next/server";

const KICK_AUTH_URL = "https://id.kick.com/oauth/token";
const KICK_API_BASE = "https://api.kick.com/public/v1";

// Cache the token in memory (simple caching for serverless/local)
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getAppAccessToken() {
  const clientId = process.env.KICK_CLIENT_ID;
  const clientSecret = process.env.KICK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Kick Client ID or Secret");
  }

  // Return cached token if valid (with 1 min buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  console.log("[Kick API] Fetching new App Access Token...");
  
  const response = await fetch(KICK_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "channel:read", // Scope for reading public channel info
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Kick API] Token fetch failed:", response.status, errorText);
    throw new Error(`Failed to get access token: ${response.status}`);
  }

  const data = await response.json();
  const expiresIn = data.expires_in || 3600; // Default to 1 hour if not provided
  
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return data.access_token;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const username = searchParams.get("username");

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  try {
    // 1. Authenticate
    let token;
    try {
        token = await getAppAccessToken();
    } catch (authError) {
        console.error("[Kick API] Auth Error:", authError);
        return NextResponse.json({ error: "Authentication failed. Check KICK_CLIENT_ID/SECRET." }, { status: 500 });
    }

    // 2. Fetch Channel Data from Official Public API
    // Endpoint: /channels/{slug}
    const apiUrl = `${KICK_API_BASE}/channels/${username}`;
    console.log(`[Kick API] Fetching channel data for: ${username}`);

    const res = await fetch(apiUrl, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
        // If 404, channel not found
        // If 403/401, token issue
        console.error(`[Kick API] Request failed: ${res.status} ${res.statusText}`);
        return NextResponse.json({ error: "Failed to fetch channel data" }, { status: res.status });
    }

    const data = await res.json();
    
    // The public API returns a 'data' wrapper usually, but let's pass it through or normalize it.
    // Based on docs, it returns the channel object directly or wrapped. 
    // We'll return it as is, and the client (useKick.ts) handles the structure.
    // NOTE: The official API structure might differ slightly from the internal API.
    // Internal: { id: 123, followers_count: 10, ... }
    // Public: { data: { id: 123, followers_count: 10, ... } } (Often JSON:API standard)
    // Let's check the structure in the client if needed, but for now return JSON.
    
    return NextResponse.json(data);

  } catch (error) {
    console.error("[Kick API] Unexpected error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
