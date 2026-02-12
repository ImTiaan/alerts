"use client";

import { useState, useEffect } from "react";
import { Alert, AlertType } from "@/lib/types";

export default function Dashboard() {
  const [username, setUsername] = useState("Streamer123");
  const [amount, setAmount] = useState(5);
  const [message, setMessage] = useState("Great stream!");
  
  // URL Generation state
  const [kickUser, setKickUser] = useState("");
  const [twitchToken, setTwitchToken] = useState("");
  const [twitchClientId, setTwitchClientId] = useState("");
  const [twitchBroadcasterId, setTwitchBroadcasterId] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");

  // Load saved credentials on mount or use Environment Variables
  useEffect(() => {
    let currentToken = "";

    // 1. Check for Twitch OAuth hash first (Highest Priority)
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      
      if (accessToken) {
        currentToken = accessToken;
        setTwitchToken(accessToken);
        
        // Clean up URL
        window.history.replaceState(null, "", window.location.pathname);
        
        // Fetch User ID using the new token
        const saved = localStorage.getItem("alert_settings");
        const parsed = saved ? JSON.parse(saved) : {};
        const storedClientId = parsed.twitchClientId || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID;

        // Save token immediately
        localStorage.setItem("alert_settings", JSON.stringify({ ...parsed, twitchToken: accessToken }));

        if (storedClientId) {
          fetch("https://api.twitch.tv/helix/users", {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "Client-Id": storedClientId
            }
          })
          .then(res => res.json())
          .then(data => {
            if (data.data && data.data[0]) {
              const userId = data.data[0].id;
              setTwitchBroadcasterId(userId);
              
              // Update storage with ID
              const updatedSaved = localStorage.getItem("alert_settings");
              const updatedParsed = updatedSaved ? JSON.parse(updatedSaved) : {};
              localStorage.setItem("alert_settings", JSON.stringify({
                ...updatedParsed,
                twitchToken: accessToken,
                twitchBroadcasterId: userId
              }));
            }
          })
          .catch(err => console.error("Failed to fetch user ID", err));
        }
      }
    }

    // 2. Load from Local Storage or Env Vars (if no hash token found)
    const saved = localStorage.getItem("alert_settings");
    if (saved) {
      const parsed = JSON.parse(saved);
      setKickUser(parsed.kickUser || process.env.NEXT_PUBLIC_KICK_USERNAME || "");
      
      // Only overwrite if we didn't just get a fresh one from the URL
      if (!currentToken) {
        setTwitchToken(parsed.twitchToken || process.env.NEXT_PUBLIC_TWITCH_ACCESS_TOKEN || "");
      }
      
      setTwitchClientId(parsed.twitchClientId || process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || "");
      // Only overwrite ID if we didn't just fetch it (though fetching is async, this sets the initial state)
      if (!currentToken) {
        setTwitchBroadcasterId(parsed.twitchBroadcasterId || process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_ID || "");
      }
    } else {
      // Fallback to Env Vars
      setKickUser(process.env.NEXT_PUBLIC_KICK_USERNAME || "");
      if (!currentToken) {
        setTwitchToken(process.env.NEXT_PUBLIC_TWITCH_ACCESS_TOKEN || "");
        setTwitchBroadcasterId(process.env.NEXT_PUBLIC_TWITCH_BROADCASTER_ID || "");
      }
      setTwitchClientId(process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID || "");
    }
  }, []); // Remove dependencies to run once on mount

  const handleTwitchLogin = () => {
    if (!twitchClientId) {
      alert("Please enter a Client ID first");
      return;
    }
    
    // Save Client ID before redirecting so we can use it on return
    const saved = localStorage.getItem("alert_settings");
    const parsed = saved ? JSON.parse(saved) : {};
    localStorage.setItem("alert_settings", JSON.stringify({ ...parsed, twitchClientId }));

    const redirectUri = `${window.location.origin}/dashboard`;
    const scope = "moderator:read:followers channel:read:subscriptions";
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${twitchClientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${encodeURIComponent(scope)}`;
    window.location.href = authUrl;
  };


  const generateUrl = () => {
    if (typeof window === "undefined") return;
    
    // Save to local storage for next time
    localStorage.setItem("alert_settings", JSON.stringify({
      kickUser,
      twitchToken,
      twitchClientId,
      twitchBroadcasterId
    }));

    const url = new URL("/overlay", window.location.origin);
    if (kickUser) url.searchParams.set("kick", kickUser);
    if (twitchToken) url.searchParams.set("twitch_token", twitchToken);
    if (twitchClientId) url.searchParams.set("twitch_client_id", twitchClientId);
    if (twitchBroadcasterId) url.searchParams.set("twitch_broadcaster_id", twitchBroadcasterId);
    setGeneratedUrl(url.toString());
  };

  const triggerAlert = (type: AlertType) => {
    const alert: Alert = {
      id: Date.now().toString(),
      type,
      username,
      message: type === "subscription" || type === "donation" ? message : undefined,
      amount: type === "donation" || type === "raid" ? amount : undefined,
      currency: type === "donation" ? "$" : undefined,
      duration: 5000,
    };

    // Send via BroadcastChannel
    const channel = new BroadcastChannel("stream-alerts");
    channel.postMessage({ type: "TRIGGER_ALERT", alert });
    channel.close();

    console.log("Triggered alert:", alert);
  };

  return (
    <main className="min-h-screen p-8 bg-gray-100 dark:bg-zinc-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Alert Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Test Controls</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount / Viewers</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => triggerAlert("follow")}
                className="bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Test Follow
              </button>
              <button
                onClick={() => triggerAlert("subscription")}
                className="bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Test Sub
              </button>
              <button
                onClick={() => triggerAlert("donation")}
                className="bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Test Donation
              </button>
              <button
                onClick={() => triggerAlert("raid")}
                className="bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Test Raid
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Overlay Configuration</h2>
            <p className="text-sm text-gray-500 mb-4">
              Enter your details to generate a unique Overlay URL for OBS.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Kick Username</label>
                <input
                  type="text"
                  placeholder="e.g. Trainwreckstv"
                  value={kickUser}
                  onChange={(e) => setKickUser(e.target.value)}
                  className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600"
                />
              </div>

              <div className="border-t pt-4 dark:border-zinc-700">
                <h3 className="text-sm font-semibold mb-2">Twitch (Optional)</h3>
                <div className="space-y-2">
                   <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Access Token (from scopes)"
                      value={twitchToken}
                      onChange={(e) => setTwitchToken(e.target.value)}
                      className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                    />
                    <button 
                      onClick={() => {navigator.clipboard.writeText(twitchToken); alert("Copied token!");}}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
                      title="Copy Token"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={handleTwitchLogin}
                      className="whitespace-nowrap px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
                      title="Connect with Twitch to get token"
                    >
                      Connect
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Client ID"
                    value={twitchClientId}
                    onChange={(e) => setTwitchClientId(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                  />
                   <div className="flex gap-2">
                     <input
                      type="text"
                      placeholder="Broadcaster ID"
                      value={twitchBroadcasterId}
                      onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                      className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                    />
                    <button 
                      onClick={() => {navigator.clipboard.writeText(twitchBroadcasterId); alert("Copied ID!");}}
                      className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
                      title="Copy ID"
                    >
                      Copy
                    </button>
                   </div>
                </div>
              </div>

              <button
                onClick={generateUrl}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
              >
                Generate URL
              </button>

              {generatedUrl && (
                <div className="mt-4 p-3 bg-zinc-100 dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700 break-all">
                  <p className="text-xs text-gray-500 mb-1">Copy this into OBS Browser Source:</p>
                  <code className="text-sm text-blue-600 dark:text-blue-400 block">
                    {generatedUrl}
                  </code>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
