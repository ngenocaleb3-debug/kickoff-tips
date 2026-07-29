import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

async function setupPush() {
  try {
    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive === "granted") {
      // Gets device token / registers for notifications
      await FirebaseMessaging.getToken(); 
      await FirebaseMessaging.subscribeToTopic({ topic: "all_users" });
    }
  } catch (e) {
    console.warn("Push setup skipped:", e.message);
  }
}
setupPush();

createRoot(document.getElementById("root")).render(<App />);
