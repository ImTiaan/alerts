import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { Alert } from "@/lib/types";

const KICK_PUSHER_KEY = "32cbd69e4b950bf97679";
const KICK_PUSHER_CLUSTER = "us2";

interface UseKickProps {
  username?: string | null;
  kickChannelId?: string | null;
  enabled: boolean;
  onAlert: (alert: Alert) => void;
}

export function useKick({ username, kickChannelId, enabled, onAlert }: UseKickProps) {
  const [channelId, setChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // If ID is provided directly, use it
    if (kickChannelId) {
      setChannelId(kickChannelId);
      return;
    }

    // Otherwise fetch from API (fallback)
    if (username) {
      fetch(`/api/kick?username=${username}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            console.log(`[Kick] Found ID: ${data.id} for user ${username}`);
            setChannelId(data.id.toString());
          } else {
            console.error("[Kick] ID not found in response", data);
          }
        })
        .catch((err) => console.error("[Kick] Failed to fetch Kick ID", err));
    }
  }, [username, kickChannelId, enabled]);

  useEffect(() => {
    if (!channelId || !enabled) return;

    // Enable Pusher logging
    Pusher.logToConsole = true;

    const pusher = new Pusher(KICK_PUSHER_KEY, {
      cluster: KICK_PUSHER_CLUSTER,
      enabledTransports: ["ws", "wss"],
    });

    pusher.connection.bind("connected", () => {
      console.log("[Kick] Connected to Pusher");
    });

    pusher.connection.bind("error", (err: any) => {
      console.error("[Kick] Pusher Connection Error:", err);
    });

    const channelName = `channel.${channelId}`;
    const channel = pusher.subscribe(channelName);

    console.log(`[Kick] Subscribing to ${channelName}...`);

    channel.bind("pusher:subscription_succeeded", () => {
      console.log(`[Kick] Successfully subscribed to ${channelName}`);
    });

    channel.bind("pusher:subscription_error", (err: any) => {
      console.error(`[Kick] Failed to subscribe to ${channelName}:`, err);
    });

    // Listen for ALL events to debug
    channel.bind_global((eventName: string, data: any) => {
      console.log(`[Kick] Global Event Received: ${eventName}`, data);
    });

    channel.bind("App\\Events\\FollowersUpdated", (data: any) => {
      console.log("[Kick] Follower Event:", data);
      onAlert({
        id: Date.now().toString(),
        type: "follow",
        username: "New Follower",
        message: data.followers_count ? `Total: ${data.followers_count}` : undefined,
      });
    });

    channel.bind("App\\Events\\StreamerIsLive", (data: any) => {
         console.log("[Kick] Stream Live:", data);
    });

    return () => {
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [channelId, enabled, onAlert]);
}
