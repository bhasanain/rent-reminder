// Runs once a day (via GitHub Actions). Looks up renters in Firebase whose
// rent is due today, and sends a push notification to the saved device(s).

const admin = require('firebase-admin');
const webpush = require('web-push');

const {
  FIREBASE_SERVICE_ACCOUNT_JSON,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  TIMEZONE,
} = process.env;

function requireEnv(name, value) {
  if (!value) {
    console.error(`Missing required secret: ${name}`);
    process.exit(1);
  }
}
[
  ['FIREBASE_SERVICE_ACCOUNT_JSON', FIREBASE_SERVICE_ACCOUNT_JSON],
  ['VAPID_PUBLIC_KEY', VAPID_PUBLIC_KEY],
  ['VAPID_PRIVATE_KEY', VAPID_PRIVATE_KEY],
  ['VAPID_SUBJECT', VAPID_SUBJECT],
].forEach(([name, value]) => requireEnv(name, value));

const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const tz = TIMEZONE || 'America/New_York';

function todayInfo(timezone) {
  const now = new Date();
  const day = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, day: 'numeric' }).format(now),
    10
  );
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: 'numeric',
  }).formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10);
  const daysInMonth = new Date(year, month, 0).getDate();
  return { day, daysInMonth };
}

async function main() {
  const { day, daysInMonth } = todayInfo(tz);

  const rentersSnap = await db.collection('renters').get();
  const renters = rentersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const dueToday = renters.filter(r => {
    if (r.dueDay === day) return true;
    if (r.dueDay > daysInMonth && day === daysInMonth) return true;
    return false;
  });

  if (!dueToday.length) {
    console.log(`No rent due today (day ${day} in ${tz}). ${renters.length} renter(s) on file.`);
    return;
  }

  const subsSnap = await db.collection('pushSubscriptions').get();
  const subscriptions = subsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (!subscriptions.length) {
    console.log('Rent is due today, but no device is set up to receive reminders yet.');
    return;
  }

  for (const renter of dueToday) {
    const payload = JSON.stringify({
      title: 'دفتر الإيجار',
      body: `حان اليوم موعد استحقاق إيجار ${renter.name}.`,
    });

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        console.log(`Sent reminder for ${renter.name} to a device.`);
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          console.log('Removing an expired device subscription.');
          await db.collection('pushSubscriptions').doc(sub.id).delete();
        } else {
          console.error(`Failed to send to a device: ${err.message}`);
        }
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
