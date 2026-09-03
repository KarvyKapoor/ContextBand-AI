"use client";

import { useEffect, useState } from "react";

interface Notification {
  intervention?: string;
  tone?: string;
  message?: string;
  decision_id?: string;
}

const API_URL = "http://localhost:8080";

export default function AutoNotification() {
  const [notification, setNotification] =
    useState<Notification | null>(null);

  const checkNotification = async () => {
    try {
      const response = await fetch(
        `${API_URL}/notifications/latest`
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      // Do not repeatedly replace the currently displayed notification
      if (
        data &&
        data.message &&
        (!notification ||
          data.decision_id !== notification.decision_id)
      ) {
        setNotification(data);
      }

    } catch (error) {
      console.log("Notification check failed");
    }
  };

  useEffect(() => {
    checkNotification();

    const interval = setInterval(
      checkNotification,
      15000
    );

    return () => clearInterval(interval);

  }, [notification]);

  if (!notification) {
    return null;
  }

  return (
    <div
      style={{
        position: "fixed",
        right: "20px",
        bottom: "20px",
        width: "330px",
        padding: "20px",
        borderRadius: "16px",
        background: "#ffffff",
        color: "#111111",
        boxShadow: "0 10px 35px rgba(0,0,0,0.2)",
        zIndex: 9999
      }}
    >
      <h3>
        {notification.intervention ||
          "ContextBand Reminder"}
      </h3>

      <p>{notification.message}</p>

      <small>
        Tone: {notification.tone}
      </small>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginTop: "15px"
        }}
      >
        <button
          onClick={() => setNotification(null)}
        >
          Complete
        </button>

        <button
          onClick={() => setNotification(null)}
        >
          Snooze
        </button>

        <button
          onClick={() => setNotification(null)}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}