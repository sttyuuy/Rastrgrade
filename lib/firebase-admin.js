const admin = require('firebase-admin');

let initialized = false;

function initFirebaseAdmin() {
    if (initialized || admin.apps.length) return admin;

    try {
        let serviceAccount;

        if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
            const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8');
            serviceAccount = JSON.parse(json);
            console.log('[Firebase Admin] using base64 service account');
        } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            console.log('[Firebase Admin] using JSON service account');
        } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
            serviceAccount = {
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };
            console.log('[Firebase Admin] using legacy env vars');
        } else {
            throw new Error('No Firebase credentials in environment');
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        initialized = true;
        console.log('[Firebase Admin] initialized, project:', serviceAccount.project_id);
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
