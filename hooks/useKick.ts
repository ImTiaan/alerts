import { useEffect, useState } from "react";
import Pusher from "pusher-js";
import { Alert } from "@/lib/types";

const KICK_PUSHER_KEY = "32cbd69e4b950bf97679";
const KICK_PUSHER_CLUSTER = "us2";

interface UseKickProps {
  username?: string | null;
  enabled: boolean;
  onAlert: (alert: Alert) => void;
}

export function useKick({ username, enabled, onAlert }: UseKickProps) {
  const [channelId, setChannelId] = useState<string | null>(null);

  useEffect(() => {
    if (!username || !enabled) return;

    // Fetch channel ID
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
  }, [username, enabled]);

  useEffect(() => {
    if (!channelId || !enabled) return;

    const pusher = new Pusher(KICK_PUSHER_KEY, {
      cluster: KICK_PUSHER_CLUSTER,
      enabledTransports: ["ws", "wss"],
    });

    const channelName = `channel.${channelId}`;
    const channel = pusher.subscribe(channelName);

    console.log(`[Kick] Subscribed to ${channelName}`);

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
