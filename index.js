import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/send-message-notification', async (req, res) => {
  const { toUserId, message, fromName } = req.body;

  if (!toUserId || !message || !fromName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const userDoc = await db.collection('users').doc(toUserId).get();
    const token = userDoc.data()?.fcmToken;

    if (!token) {
      return res.status(404).json({ error: 'No FCM token found' });
    }

    const payload = {
      notification: {
        title: `رسالة جديدة من ${fromName}`,
        body: message,
      },
    };

    await admin.messaging().sendToDevice(token, payload);
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
