"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertType } from "@/lib/types";
import { Heart, Star, DollarSign, Users } from "lucide-react";

interface AlertDisplayProps {
  queue: Alert[];
  onAlertComplete: (id: string) => void;
}

const AlertIcon = ({ type }: { type: AlertType }) => {
  switch (type) {
    case "follow":
      return <Heart className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]" strokeWidth={1.5} />;
    case "subscription":
      return <Star className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]" strokeWidth={1.5} />;
    case "donation":
      return <DollarSign className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" strokeWidth={1.5} />;
    case "raid":
      return <Users className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(192,132,252,0.8)]" strokeWidth={1.5} />;
    default:
      return <Heart className="w-20 h-20 text-white" strokeWidth={1.5} />;
  }
};

const AlertText = ({ alert }: { alert: Alert }) => {
  switch (alert.type) {
    case "follow":
      return (
        <div className="text-center">
          <p className="text-3xl font-heading text-emerald-400 text-glow mb-2">
            New Follower
          </p>
          <p className="text-5xl font-heading text-white tracking-wide drop-shadow-md">
            {alert.username}
          </p>
        </div>
      );
    case "subscription":
      return (
        <div className="text-center">
          <p className="text-3xl font-heading text-amber-400 text-glow mb-2">
            New Subscriber
          </p>
          <p className="text-5xl font-heading text-white tracking-wide drop-shadow-md">
            {alert.username}
          </p>
          {alert.message && (
            <p className="text-xl text-emerald-100 mt-4 font-medium italic bg-black/20 p-2 rounded-lg border border-white/5">
              "{alert.message}"
            </p>
          )}
        </div>
      );
    case "donation":
      return (
        <div className="text-center">
          <p className="text-3xl font-heading text-emerald-400 text-glow mb-2">
            Donation
          </p>
          <p className="text-5xl font-heading text-white tracking-wide drop-shadow-md">
            {alert.username}
          </p>
          <p className="text-4xl font-heading text-emerald-300 mt-2 text-glow">
            {alert.currency}
            {alert.amount}
          </p>
          {alert.message && (
            <p className="text-xl text-emerald-100 mt-4 font-medium italic bg-black/20 p-2 rounded-lg border border-white/5">
              "{alert.message}"
            </p>
          )}
        </div>
      );
    case "raid":
      return (
        <div className="text-center">
          <p className="text-3xl font-heading text-purple-400 text-glow mb-2">
            Raid Incoming
          </p>
          <p className="text-5xl font-heading text-white tracking-wide drop-shadow-md">
            {alert.username}
          </p>
          {alert.amount && (
            <p className="text-2xl font-heading text-purple-200 mt-2">
              Raiding with <span className="text-purple-400">{alert.amount}</span> viewers
            </p>
          )}
        </div>
      );
    default:
      return null;
  }
};

export default function AlertDisplay({
  queue,
  onAlertComplete,
}: AlertDisplayProps) {
  const [currentAlert, setCurrentAlert] = useState<Alert | null>(null);

  useEffect(() => {
    if (!currentAlert && queue.length > 0) {
      const nextAlert = queue[0];
      setCurrentAlert(nextAlert);

      const duration = nextAlert.duration || 3000;
      const timer = setTimeout(() => {
        setCurrentAlert(null);
        onAlertComplete(nextAlert.id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [currentAlert, queue, onAlertComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none p-12">
      <AnimatePresence mode="wait">
        {currentAlert && (
          <motion.div
            key={currentAlert.id}
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="glass-panel p-12 flex flex-col items-center gap-8 min-w-[500px] shadow-[0_0_50px_rgba(0,255,128,0.1)] relative overflow-hidden"
          >
            {/* Decorative background glow */}
            <div className="absolute inset-0 bg-gradient-radial from-emerald-900/40 to-transparent opacity-50 pointer-events-none" />
            
            <div className="animate-bounce relative z-10">
              <AlertIcon type={currentAlert.type} />
            </div>
            <div className="relative z-10">
              <AlertText alert={currentAlert} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
