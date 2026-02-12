"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AlertDisplay from "@/components/AlertDisplay";
import { Alert } from "@/lib/types";
import { useKick } from "@/hooks/useKick";
import { useTwitch } from "@/hooks/useTwitch";

function OverlayContent() {
  const searchParams = useSearchParams();
  const [queue, setQueue] = useState<Alert[]>([]);

  const kickUsername = searchParams.get("kick") || process.env.NEXT_PUBLIC_KICK_USERNAME || "itsteewee";
  const kickChannelId = searchParams.get("kick_channel_id") || process.env.NEXT_PUBLIC_KICK_CHANNEL_ID || "63413246";
  const twitchToken = searchParams.get("twitch_token") || process.env.NEXT_PUBLIC_TWITCH_ACCESS_TOKEN;
  const twitchClientId = searchParams.get("twitch_client_id") || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;
  const twitchBroadcasterId = searchParams.get("twitch_broadcaster_id") || process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_ID;

  // Function to add alert to queue
  const addAlert = useCallback((alert: Alert) => {
    setQueue((prev) => [...prev, alert]);
  }, []);

  const handleAlertComplete = useCallback((id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Integrations
  useKick({
    username: kickUsername,
    kickChannelId: kickChannelId,
    enabled: !!(kickUsername || kickChannelId),
    onAlert: addAlert,
  });

  useTwitch({
    accessToken: twitchToken || "",
    clientId: twitchClientId || "",
    broadcasterId: twitchBroadcasterId || "",
    enabled: !!(twitchToken && twitchClientId && twitchBroadcasterId),
    onAlert: addAlert,
  });

  useEffect(() => {
    // Force body background to be transparent for OBS
    document.body.style.background = "transparent";
    // Also remove the gradient if it was applied via class
    document.body.className = document.body.className.replace("bg-gradient-to-b", "");
    
    return () => {
      document.body.style.background = "";
    };
  }, []);

  // Listen for BroadcastChannel events (for testing/local control)
  useEffect(() => {
    const channel = new BroadcastChannel("stream-alerts");
    channel.onmessage = (event) => {
      if (event.data && event.data.type === "TRIGGER_ALERT") {
        addAlert(event.data.alert);
      }
    };
    return () => channel.close();
  }, [addAlert]);

  // Debug overlay (only visible if explicitly requested via URL param ?debug=true)
  const showDebug = searchParams.get("debug") === "true";

  return (
    <main className="min-h-screen bg-transparent overflow-hidden relative">
      {/* Background is transparent for OBS */}
      <AlertDisplay queue={queue} onAlertComplete={handleAlertComplete} />
      
      {showDebug && (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-4 rounded text-xs z-50 pointer-events-auto">
          <h3 className="font-bold mb-2">Debug Info</h3>
          <p>Kick Username: {kickUsername || "Not set"}</p>
          <p>Kick Channel ID: {kickChannelId || "Not set"}</p>
          <p>Twitch: {twitchToken ? "Configured" : "Not configured"}</p>
          <p>Queue Length: {queue.length}</p>
          <button 
            className="mt-2 px-2 py-1 bg-blue-500 rounded hover:bg-blue-600"
            onClick={() => addAlert({
              id: Date.now().toString(),
              type: "follow",
              username: "Test User",
              message: "This is a test alert"
            })}
          >
            Test Alert
          </button>
        </div>
      )}
    </main>
  );
}

export default function OverlayPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OverlayContent />
    </Suspense>
  );
}
