// ======================= NODE.JS BACKEND FILE (index.js) =======================

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Endpoint to send a message notification
app.post('/send-message-notification', async (req, res) => {
  const { toUserId, message, fromName } = req.body;

  // Validate request body
  if (!toUserId || !message || !fromName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    // Retrieve the recipient user's document from Firestore
    const userDoc = await db.collection('users').doc(toUserId).get();

    // Check if user document exists
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = userDoc.data()?.fcmToken;

    // Check if the FCM token exists
    if (!token) {
      return res.status(404).json({ error: 'No FCM token found for user' });
    }

    // Construct the notification payload
    const payload = {
      notification: {
        title: `رسالة جديدة من ${fromName}`,
        body: message,
      },
    };

    // Send the notification to the user's device
    await admin.messaging().sendToDevice(token, payload);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Start the Express server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
