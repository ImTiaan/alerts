import { useEffect, useRef } from "react";
import { Alert } from "@/lib/types";

interface UseTwitchProps {
  accessToken: string; // User Access Token with 'moderator:read:followers' etc.
  clientId: string; // Client ID
  broadcasterId: string; // User ID of the channel
  enabled: boolean;
  onAlert: (alert: Alert) => void;
}

export function useTwitch({
  accessToken,
  clientId,
  broadcasterId,
  enabled,
  onAlert,
}: UseTwitchProps) {
  const ws = useRef<WebSocket | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !accessToken || !broadcasterId) return;

    const connect = () => {
      const socket = new WebSocket("wss://eventsub.wss.twitch.tv/ws");
      ws.current = socket;

      socket.onopen = () => {
        console.log("[Twitch] Connected to EventSub");
      };

      socket.onmessage = async (event) => {
        const data = JSON.parse(event.data);

        if (data.metadata.message_type === "session_welcome") {
          sessionId.current = data.payload.session.id;
          console.log("[Twitch] Session Welcome, ID:", sessionId.current);
          
          // Now we need to subscribe to events using the session_id
          // This requires an API call to https://api.twitch.tv/helix/eventsub/subscriptions
          // We can do this from the client if we have the token.
          await subscribeToEvents(sessionId.current!, accessToken, clientId, broadcasterId);
        } else if (data.metadata.message_type === "notification") {
          handleNotification(data.payload, onAlert);
        }
      };
      
      socket.onclose = () => {
          console.log("[Twitch] Disconnected");
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [accessToken, clientId, broadcasterId, enabled, onAlert]);
}

async function subscribeToEvents(
  sessionId: string,
  token: string,
  clientId: string,
  broadcasterId: string
) {
  const subscriptions = [
    { type: "channel.follow", version: "2", condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId } },
    { type: "channel.subscribe", version: "1", condition: { broadcaster_user_id: broadcasterId } },
    { type: "channel.raid", version: "1", condition: { to_broadcaster_user_id: broadcasterId } },
  ];

  for (const sub of subscriptions) {
    try {
      await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
        method: "POST",
        headers: {
          "Client-ID": clientId,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: sub.type,
          version: sub.version,
          condition: sub.condition,
          transport: {
            method: "websocket",
            session_id: sessionId,
          },
        }),
      });
      console.log(`[Twitch] Subscribed to ${sub.type}`);
    } catch (err) {
      console.error(`[Twitch] Failed to subscribe to ${sub.type}`, err);
    }
  }
}

function handleNotification(payload: any, onAlert: (alert: Alert) => void) {
  const event = payload.event;
  const subscription = payload.subscription;

  if (subscription.type === "channel.follow") {
    onAlert({
      id: payload.event.user_id + Date.now(),
      type: "follow",
      username: event.user_name,
    });
  } else if (subscription.type === "channel.subscribe") {
    onAlert({
      id: payload.event.user_id + Date.now(),
      type: "subscription",
      username: event.user_name,
      message: "Subscribed!",
    });
  } else if (subscription.type === "channel.raid") {
    onAlert({
      id: payload.event.from_broadcaster_user_id + Date.now(),
      type: "raid",
      username: event.from_broadcaster_user_name,
      amount: event.viewers,
    });
  }
}
