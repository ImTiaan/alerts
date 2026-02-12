import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";
import { Alert } from "@/lib/types";

// Kick's public Pusher key and cluster
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
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const followerCountRef = useRef<number | null>(null);

  // Sync ref with state
  useEffect(() => {
    followerCountRef.current = followerCount;
  }, [followerCount]);

  // Fetch Channel Data & Poll for Followers
  useEffect(() => {
    if (!enabled) return;
    
    // Determine the username to fetch
    const targetUsername = username || "itsteewee";

    const fetchData = () => {
      // Use our internal API to fetch Kick data to avoid CORS
      fetch(`/api/kick?username=${targetUsername}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.id) {
            // Only set if not already set or changed
            if (!channelId || channelId !== data.id.toString()) {
               console.log(`[Kick] Found Channel ID: ${data.id}`);
               setChannelId(data.id.toString());
            }
          }
          if (data.chatroom && data.chatroom.id) {
            if (!chatroomId || chatroomId !== data.chatroom.id.toString()) {
                console.log(`[Kick] Found Chatroom ID: ${data.chatroom.id}`);
                setChatroomId(data.chatroom.id.toString());
            }
          }
          
          // Update follower count and check for new followers
          if (data.followers_count !== undefined) {
            const count = parseInt(data.followers_count);
            
            // Initial load
            if (followerCountRef.current === null) {
                setFollowerCount(count);
                console.log(`[Kick] Initial follower count: ${count}`);
            } 
            // Update detected
            else if (count > followerCountRef.current) {
              const diff = count - followerCountRef.current;
              console.log(`[Kick] Detected ${diff} new followers via polling (Old: ${followerCountRef.current}, New: ${count})`);
              
              // Trigger alerts for each new follower (limit to 5 to avoid spamming on big jumps)
              for (let i = 0; i < Math.min(diff, 5); i++) {
                onAlert({
                  id: Date.now().toString() + i,
                  type: "follow",
                  username: "New Follower", // Polling doesn't give us the name
                  message: `Total: ${count}`
                });
              }
              setFollowerCount(count);
            }
          }
        })
        .catch((err) => console.error("[Kick] Failed to fetch Kick data", err));
    };

    // Initial fetch
    fetchData();

    // Poll every 15 seconds as a fallback
    const pollInterval = setInterval(fetchData, 15000);

    return () => clearInterval(pollInterval);
  }, [username, kickChannelId, enabled, onAlert, channelId, chatroomId]); // Dependencies for re-running

  // Websocket Connection
  useEffect(() => {
    if ((!channelId && !chatroomId) || !enabled) return;

    Pusher.logToConsole = true;

    const pusher = new Pusher(KICK_PUSHER_KEY, {
      cluster: KICK_PUSHER_CLUSTER,
      enabledTransports: ["ws", "wss"],
    });

    pusher.connection.bind("state_change", (states: any) => {
      console.log("[Kick] Pusher connection state:", states.current);
    });

    pusher.connection.bind("connected", () => {
      console.log("[Kick] Pusher connected successfully");
    });

    pusher.connection.bind("error", (err: any) => {
      console.error("[Kick] Pusher connection error:", err);
    });

    const channels: any[] = [];

    // Subscribe to Channel events (often used for follows)
    if (channelId) {
      const channelName = `channel.${channelId}`;
      const channel = pusher.subscribe(channelName);
      channels.push({ name: channelName, channel });
      console.log(`[Kick] Subscribing to ${channelName}`);
    }

    // Subscribe to Chatroom events (chat, and sometimes other events)
    if (chatroomId) {
      const chatroomNameV2 = `chatrooms.${chatroomId}.v2`;
      const chatroomNameV1 = `chatrooms.${chatroomId}`;
      
      const chatroomV2 = pusher.subscribe(chatroomNameV2);
      const chatroomV1 = pusher.subscribe(chatroomNameV1);
      
      channels.push({ name: chatroomNameV2, channel: chatroomV2 });
      channels.push({ name: chatroomNameV1, channel: chatroomV1 });
      console.log(`[Kick] Subscribing to ${chatroomNameV2} and ${chatroomNameV1}`);
    }

    channels.forEach(({ name, channel }) => {
      channel.bind("pusher:subscription_succeeded", () => {
        console.log(`[Kick] Successfully subscribed to ${name}`);
      });

      channel.bind("pusher:subscription_error", (status: any) => {
        console.error(`[Kick] Failed to subscribe to ${name}:`, status);
      });

      // Log ALL events to help debug
      channel.bind_global((eventName: string, data: any) => {
        console.log(`[Kick] Global Event on ${name}: ${eventName}`, data);
      });

      // Known event names for follows
      const followEvents = [
        "App\\Events\\FollowersUpdated", 
        "channel.followed", 
        "followers.updated",
        "ChannelFollowersUpdated"
      ];
      
      const subEvents = [
        "channel.subscription.new",
        "channel.subscription.renewal"
      ];
      
      const giftEvents = [
        "channel.subscription.gifts"
      ];

      // Follow Events
      followEvents.forEach(evt => {
        channel.bind(evt, (data: any) => {
          console.log(`[Kick] Follower Event detected (${evt}):`, data);
          
          // Handle various payload structures
          // 1. Official Webhook/Event structure: data.follower.username
           // 2. Unofficial/Old structure: data.username
           const username = data.follower?.username || data.username || "New Follower";
           const image = data.follower?.profile_picture;
           
           console.log(`[Kick] Parsed Username: ${username}`);
           
           onAlert({
            id: Date.now().toString(),
            type: "follow",
            username: username,
            message: data.followers_count ? `Total: ${data.followers_count}` : undefined,
            image: image
          });
          
          // Update local count to prevent double alerting from polling
          if (data.followers_count) {
             setFollowerCount(parseInt(data.followers_count));
          }
        });
      });
      
      // Subscription Events
      subEvents.forEach(evt => {
        channel.bind(evt, (data: any) => {
            console.log(`[Kick] Subscription Event detected (${evt}):`, data);
            const username = data.subscriber?.username || "New Subscriber";
            const duration = data.duration || 1;
            const image = data.subscriber?.profile_picture;
            
            onAlert({
                id: Date.now().toString(),
                type: "subscription",
                username: username,
                message: evt.includes("renewal") ? `Resubscribed for ${duration} months` : "Subscribed",
                duration: 5000, // Longer alert for subs
                image: image
            });
        });
      });
      
      // Gift Events
      giftEvents.forEach(evt => {
          channel.bind(evt, (data: any) => {
              console.log(`[Kick] Gift Event detected (${evt}):`, data);
              const gifter = data.gifter?.username || "Anonymous";
              const gifterImage = data.gifter?.profile_picture;
              const count = data.giftees?.length || 1;
              
              onAlert({
                  id: Date.now().toString(),
                  type: "donation", // Using donation style for gifts
                  username: gifter,
                  message: `Gifted ${count} subscription${count > 1 ? 's' : ''}!`,
                  amount: count,
                  currency: "Subs",
                  duration: 5000,
                  image: gifterImage
              });
          });
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
