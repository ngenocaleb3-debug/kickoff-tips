const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { initializeApp } = require("firebase-admin/app");

initializeApp();

// Fires automatically whenever a new document is added to the "tips"
// collection (i.e. whenever the admin publishes a tip), and pushes a
// notification to every device subscribed to the "all_users" topic —
// including devices where the app is fully closed.
exports.notifyOnNewTip = onDocumentCreated("tips/{tipId}", async (event) => {
  const tip = event.data.data();

  await getMessaging().send({
    topic: "all_users",
    notification: {
      title: "New prediction posted ⚽",
      body: `${tip.home} vs ${tip.away} — ${tip.pick}`,
    },
    data: {
      tipId: event.params.tipId,
    },
  });
});
