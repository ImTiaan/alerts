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
    <main className="min-h-screen p-8 text-white">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-heading mb-8 text-glow text-center md:text-left">Alert Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-panel p-6">
            <h2 className="text-2xl font-heading mb-6 text-emerald-400">Test Controls</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-emerald-100/70">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-emerald-100/70">Message</label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-emerald-100/70">Amount / Viewers</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => triggerAlert("follow")}
                className="glass-button bg-emerald-900/20 hover:bg-emerald-800/40 text-emerald-100 py-3 rounded-lg font-medium border-emerald-500/20"
              >
                Test Follow
              </button>
              <button
                onClick={() => triggerAlert("subscription")}
                className="glass-button bg-emerald-900/20 hover:bg-emerald-800/40 text-emerald-100 py-3 rounded-lg font-medium border-emerald-500/20"
              >
                Test Sub
              </button>
              <button
                onClick={() => triggerAlert("donation")}
                className="glass-button bg-emerald-900/20 hover:bg-emerald-800/40 text-emerald-100 py-3 rounded-lg font-medium border-emerald-500/20"
              >
                Test Donation
              </button>
              <button
                onClick={() => triggerAlert("raid")}
                className="glass-button bg-emerald-900/20 hover:bg-emerald-800/40 text-emerald-100 py-3 rounded-lg font-medium border-emerald-500/20"
              >
                Test Raid
              </button>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h2 className="text-2xl font-heading mb-6 text-emerald-400">Overlay Configuration</h2>
            <p className="text-sm text-emerald-100/60 mb-6">
              Enter your details to generate a unique Overlay URL for OBS.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1 text-emerald-100/70">Kick Username</label>
                <input
                  type="text"
                  placeholder="e.g. Trainwreckstv"
                  value={kickUser}
                  onChange={(e) => setKickUser(e.target.value)}
                  className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-900/50"
                />
              </div>

              <div className="border-t border-emerald-900/30 pt-4">
                <h3 className="text-sm font-semibold mb-3 text-emerald-300">Twitch (Optional)</h3>
                <div className="space-y-3">
                   <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Access Token (from scopes)"
                      value={twitchToken}
                      onChange={(e) => setTwitchToken(e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-900/50 text-sm"
                    />
                    <button 
                      onClick={() => {navigator.clipboard.writeText(twitchToken); alert("Copied token!");}}
                      className="glass-button px-3 py-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-100 rounded text-sm font-medium border-emerald-500/20"
                      title="Copy Token"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={handleTwitchLogin}
                      className="glass-button whitespace-nowrap px-3 py-2 bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-100 rounded text-sm font-medium border-emerald-500/40"
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
                    className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-900/50 text-sm"
                  />
                   <div className="flex gap-2">
                     <input
                      type="text"
                      placeholder="Broadcaster ID"
                      value={twitchBroadcasterId}
                      onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                      className="w-full px-3 py-2 border border-emerald-900/50 rounded bg-black/20 text-emerald-50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all placeholder:text-emerald-900/50 text-sm"
                    />
                    <button 
                      onClick={() => {navigator.clipboard.writeText(twitchBroadcasterId); alert("Copied ID!");}}
                      className="glass-button px-3 py-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-100 rounded text-sm font-medium border-emerald-500/20"
                      title="Copy ID"
                    >
                      Copy
                    </button>
                   </div>
                </div>
              </div>

              <button
                onClick={generateUrl}
                className="w-full mt-4 glass-button bg-emerald-600/30 hover:bg-emerald-500/40 text-white py-3 rounded-lg font-heading text-lg tracking-wide border-emerald-500/30 transition-all hover:scale-[1.02]"
              >
                GENERATE URL
              </button>

              {generatedUrl && (
                <div className="mt-4 p-4 rounded-lg bg-black/30 border border-emerald-900/50 break-all">
                  <p className="text-xs text-emerald-400/70 mb-2 uppercase tracking-wider">Copy this into OBS Browser Source:</p>
                  <code className="text-sm text-emerald-300 block font-mono bg-black/20 p-2 rounded border border-emerald-900/30">
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
