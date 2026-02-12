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
  const [chatroomId, setChatroomId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // If ID is provided directly, use it
    if (kickChannelId) {
      setChannelId(kickChannelId);
      // We can't easily guess chatroomId from channelId without an API call, 
      // but if the user provided it via props/env, we could use it. 
      // For now, let's try to fetch it if we have a username, or fallback.
    }

    // Always try to fetch to get the chatroom ID if we have a username
    if (username) {
      fetch(`/api/kick?username=${username}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            console.log(`[Kick] Found Channel ID: ${data.id}`);
            setChannelId(data.id.toString());
          }
          if (data.chatroom && data.chatroom.id) {
            console.log(`[Kick] Found Chatroom ID: ${data.chatroom.id}`);
            setChatroomId(data.chatroom.id.toString());
          } else {
            console.warn("[Kick] Chatroom ID not found in response", data);
          }
        })
        .catch((err) => console.error("[Kick] Failed to fetch Kick ID", err));
    }
  }, [username, kickChannelId, enabled]);

  useEffect(() => {
    if ((!channelId && !chatroomId) || !enabled) return;

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

    const channels: any[] = [];

    // Subscribe to Channel ID (for stream events?)
    if (channelId) {
      const channelName = `channel.${channelId}`;
      console.log(`[Kick] Subscribing to ${channelName}...`);
      const channel = pusher.subscribe(channelName);
      channels.push({ name: channelName, channel });
    }

    // Subscribe to Chatroom ID (for chat/follow events?)
    if (chatroomId) {
      // Try both v2 and v1 channel names to be safe
      const chatroomNameV2 = `chatrooms.${chatroomId}.v2`; 
      const chatroomNameV1 = `chatrooms.${chatroomId}`;
      
      console.log(`[Kick] Subscribing to ${chatroomNameV2} and ${chatroomNameV1}...`);
      
      const chatroomV2 = pusher.subscribe(chatroomNameV2);
      channels.push({ name: chatroomNameV2, channel: chatroomV2 });

      const chatroomV1 = pusher.subscribe(chatroomNameV1);
      channels.push({ name: chatroomNameV1, channel: chatroomV1 });
    }

    channels.forEach(({ name, channel }) => {
        channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Kick] Successfully subscribed to ${name}`);
        });

        channel.bind("pusher:subscription_error", (err: any) => {
        console.error(`[Kick] Failed to subscribe to ${name}:`, err);
        });

        // Listen for ALL events to debug
        channel.bind_global((eventName: string, data: any) => {
        console.log(`[Kick] Global Event Received on ${name}: ${eventName}`, data);
        });

        // Handle FollowersUpdated
        // Note: Event name might be "App\Events\FollowersUpdated" or "followers.updated" depending on the channel
        channel.bind("App\\Events\\FollowersUpdated", (data: any) => {
        console.log(`[Kick] Follower Event on ${name}:`, data);
        onAlert({
            id: Date.now().toString(),
            type: "follow",
            username: data.username || "New Follower", // Adjust based on actual payload
            message: data.followers_count ? `Total: ${data.followers_count}` : undefined,
        });
        });
        
        // Handle StreamerIsLive
        channel.bind("App\\Events\\StreamerIsLive", (data: any) => {
            console.log(`[Kick] Stream Live on ${name}:`, data);
        });
    });

    return () => {
      channels.forEach(({ name }) => {
          pusher.unsubscribe(name);
      });
      pusher.disconnect();
    };
  }, [channelId, chatroomId, enabled, onAlert]);
}
