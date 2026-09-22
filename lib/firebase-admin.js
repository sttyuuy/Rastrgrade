const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
    if (initialized || admin.apps.length) {
        return admin;
    }

    try {
        // Стандартний формат: у Vercel env переноси рядків зберігаються як \n
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : null;

        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing Firebase Admin environment variables');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });

        initialized = true;
        console.log('[Firebase Admin] initialized successfully');
    } catch (e) {
        console.error('[Firebase Admin] init error:', e.message);
        throw e;
    }

    return admin;
}

function getFirestore() {
    initFirebaseAdmin();
    return admin.firestore();
}

function getAuth() {
    initFirebaseAdmin();
    return admin.auth();
}

module.exports = {
    initFirebaseAdmin,
    getFirestore,
    getAuth,
    admin
};
