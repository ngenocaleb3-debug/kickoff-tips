import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PushNotifications } from "@capacitor-firebase/messaging";

async function setupPush() {
  try {
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === "granted") {
      await PushNotifications.register();
      await PushNotifications.subscribeToTopic({ topic: "all_users" });
    }
  } catch (e) {
    console.warn("Push setup skipped:", e.message);
  }
}
setupPush();

createRoot(document.getElementById("root")).render(<App />);
