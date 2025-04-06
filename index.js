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

// ✅ Root GET route for browser test
app.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('users').limit(1).get();
    const user = snapshot.docs.length ? snapshot.docs[0].data() : null;
    res.send(`✅ Connected to Firebase. Sample user: ${user ? JSON.stringify(user) : 'No users found.'}`);
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    res.status(500).send('❌ Failed to connect to Firebase');
  }
});

// ✅ List all users with fcmToken
app.get('/users', async (req, res) => {
  try {
    const snapshot = await db.collection('users').where('fcmToken', '!=', '').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ Send test notification to a selected user by name
app.get('/test-notification/:name', async (req, res) => {
  const { name } = req.params;
  try {
    const snapshot = await db.collection('users').where('name', '==', name).limit(1).get();
    if (snapshot.empty) {
      return res.status(404).send(`❌ No user found with name: ${name}`);
    }

    const userDoc = snapshot.docs[0];
    const data = userDoc.data();
    const token = data.fcmToken;

    if (!token) {
      return res.status(404).send('❌ User has no FCM token');
    }

    const payload = {
      notification: {
        title: '🔔 Test Notification',
        body: `Hello ${data.name || 'User'}, this is a test!`,
      },
    };

    await admin.messaging().sendToDevice(token, payload);
    res.send(`✅ Test notification sent to user ${data.name || userDoc.id}`);
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).send('❌ Failed to send test notification');
  }
});

// POST endpoint to send chat message notifications
app.post('/send-message-notification', async (req, res) => {
  const { toUserId, message, fromName } = req.body;

  if (!toUserId || !message || !fromName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    const userDoc = await db.collection('users').doc(toUserId).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = userDoc.data()?.fcmToken;
    if (!token) {
      return res.status(404).json({ error: 'No FCM token found for user' });
    }

    const payload = {
      notification: {
        title: `رسالة جديدة من ${fromName}`,
        body: message,
      },
    };

    await admin.messaging().sendToDevice(token, payload);
    res.json({ success: true, message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
