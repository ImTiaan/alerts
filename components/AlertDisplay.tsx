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
      return <Heart className="w-12 h-12 text-red-500" fill="currentColor" />;
    case "subscription":
      return <Star className="w-12 h-12 text-yellow-400" fill="currentColor" />;
    case "donation":
      return <DollarSign className="w-12 h-12 text-green-500" />;
    case "raid":
      return <Users className="w-12 h-12 text-purple-500" />;
    default:
      return <Heart className="w-12 h-12" />;
  }
};

const AlertText = ({ alert }: { alert: Alert }) => {
  switch (alert.type) {
    case "follow":
      return (
        <div className="text-center">
          <p className="text-2xl font-bold text-white shadow-black drop-shadow-lg">
            New Follower!
          </p>
          <p className="text-4xl font-black text-white mt-2 shadow-black drop-shadow-lg uppercase">
            {alert.username}
          </p>
        </div>
      );
    case "subscription":
      return (
        <div className="text-center">
          <p className="text-2xl font-bold text-white shadow-black drop-shadow-lg">
            New Subscriber!
          </p>
          <p className="text-4xl font-black text-white mt-2 shadow-black drop-shadow-lg uppercase">
            {alert.username}
          </p>
          {alert.message && (
            <p className="text-lg text-gray-200 mt-2">{alert.message}</p>
          )}
        </div>
      );
    case "donation":
      return (
        <div className="text-center">
          <p className="text-2xl font-bold text-white shadow-black drop-shadow-lg">
            Donation!
          </p>
          <p className="text-4xl font-black text-white mt-2 shadow-black drop-shadow-lg uppercase">
            {alert.username}
          </p>
          <p className="text-3xl font-bold text-green-400 mt-1 shadow-black drop-shadow-lg">
            {alert.currency}
            {alert.amount}
          </p>
          {alert.message && (
            <p className="text-lg text-gray-200 mt-2">{alert.message}</p>
          )}
        </div>
      );
    case "raid":
      return (
        <div className="text-center">
          <p className="text-2xl font-bold text-white shadow-black drop-shadow-lg">
            Raid Incoming!
          </p>
          <p className="text-4xl font-black text-white mt-2 shadow-black drop-shadow-lg uppercase">
            {alert.username}
          </p>
          {alert.amount && (
            <p className="text-xl text-purple-300 mt-1 shadow-black drop-shadow-lg">
              Raiding with {alert.amount} viewers
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

      const duration = nextAlert.duration || 5000;
      const timer = setTimeout(() => {
        setCurrentAlert(null);
        onAlertComplete(nextAlert.id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [currentAlert, queue, onAlertComplete]);

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {currentAlert && (
          <motion.div
            key={currentAlert.id}
            initial={{ scale: 0, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="bg-black/80 p-8 rounded-2xl border-4 border-white shadow-2xl flex flex-col items-center gap-6 min-w-[400px] backdrop-blur-sm"
          >
            <div className="animate-bounce">
              <AlertIcon type={currentAlert.type} />
            </div>
            <AlertText alert={currentAlert} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
