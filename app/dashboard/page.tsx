"use client";

import { useState } from "react";
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

  const generateUrl = () => {
    if (typeof window === "undefined") return;
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
                  <input
                    type="text"
                    placeholder="Access Token (from scopes)"
                    value={twitchToken}
                    onChange={(e) => setTwitchToken(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Client ID"
                    value={twitchClientId}
                    onChange={(e) => setTwitchClientId(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                  />
                   <input
                    type="text"
                    placeholder="Broadcaster ID"
                    value={twitchBroadcasterId}
                    onChange={(e) => setTwitchBroadcasterId(e.target.value)}
                    className="w-full px-3 py-2 border rounded dark:bg-zinc-700 dark:border-zinc-600 text-sm"
                  />
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
