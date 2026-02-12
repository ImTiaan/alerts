import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const KICK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAq/+l1WnlRrGSolDMA+A8
6rAhMbQGmQ2SapVcGM3zq8ANXjnhDWocMqfWcTd95btDydITa10kDvHzw9WQOqp2
MZI7ZyrfzJuz5nhTPCiJwTwnEtWft7nV14BYRDHvlfqPUaZ+1KR4OCaO/wWIk/rQ
L/TjY0M70gse8rlBkbo2a8rKhu69RQTRsoaf4DVhDPEeSeI5jVrRDGAMGL3cGuyY
6CLKGdjVEM78g3JfYOvDU/RvfqD7L89TZ3iN94jrmWdGz34JNlEI5hqK8dd7C5EF
BEbZ5jgB8s8ReQV8H+MkuffjdAj3ajDDX3DOJMIut1lBrUVD1AaSrGCKHooWoL2e
twIDAQAB
-----END PUBLIC KEY-----`;

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();
    const headers = request.headers;

    const signature = headers.get("Kick-Event-Signature");
    const messageId = headers.get("Kick-Event-Message-Id");
    const timestamp = headers.get("Kick-Event-Message-Timestamp");
    const eventType = headers.get("Kick-Event-Type");

    if (!signature || !messageId || !timestamp) {
      return NextResponse.json({ error: "Missing headers" }, { status: 400 });
    }

    // Verify Signature
    const verifier = crypto.createVerify("SHA256");
    verifier.update(`${messageId}.${timestamp}.${bodyText}`);
    const isVerified = verifier.verify(KICK_PUBLIC_KEY, signature, "base64");

    if (!isVerified) {
      console.error("[Kick Webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(bodyText);
    console.log(`[Kick Webhook] Verified Event (${eventType}):`, JSON.stringify(payload, null, 2));

    // Here you would typically forward this event to your client
    // Since this is a serverless function, we can't easily push to the client without a DB or external Pusher.
    // However, this endpoint now fully complies with Kick's security requirements.

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Kick Webhook] Error processing webhook:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
