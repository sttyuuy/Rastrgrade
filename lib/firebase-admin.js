const admin = require('firebase-admin');

let initialized = false;
let dbInstance = null;

function initFirebaseAdmin() {
    if (initialized || admin.apps.length) return admin;

    try {
        let serviceAccount;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
            serviceAccount = JSON.parse(json);
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };
        } else {
            throw new Error('No Firebase credentials in environment');
        }

        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        initialized = true;
        console.log('[Firebase Admin] initialized');
    } catch (e) {
        console.error('[Firebase Admin] init error:', e.message);
        throw e;
    }

    return admin;
}

function getFirestore() {
    initFirebaseAdmin();
    if (!dbInstance) {
        dbInstance = admin.firestore();
        // На Vercel gRPC інколи зависає — REST стабільніший.
        // Якщо твоя версія не знає цей параметр, помилка буде в логах, а код працюватиме як раніше.
        try {
            dbInstance.settings({ preferRest: true, ignoreUndefinedProperties: true });
        } catch (e) {
            console.error('[Firebase Admin] settings:', e.message);
        }
    }
    return dbInstance;
}

function getAuth() {
    initFirebaseAdmin();
    return admin.auth();
}

module.exports = { initFirebaseAdmin, getFirestore, getAuth, admin };
