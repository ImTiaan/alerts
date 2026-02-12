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

  const kickUsername = searchParams.get("kick") || process.env.NEXT_PUBLIC_KICK_USERNAME;
  const kickChannelId = searchParams.get("kick_channel_id") || process.env.NEXT_PUBLIC_KICK_CHANNEL_ID;
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

  return (
    <main className="min-h-screen bg-transparent overflow-hidden">
      {/* Background is transparent for OBS */}
      <AlertDisplay queue={queue} onAlertComplete={handleAlertComplete} />
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
