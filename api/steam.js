const admin = require('firebase-admin');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login';

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 10;

const rateLimitStore = new Map();

let firebaseInitialized = false;

/*
|--------------------------------------------------------------------------
| Firebase
|--------------------------------------------------------------------------
*/

function initializeFirebase() {
    if (firebaseInitialized) {
        return true;
    }

    if (admin.apps.length > 0) {
        firebaseInitialized = true;
        return true;
    }

    try {
        const projectId =
            process.env.FIREBASE_PROJECT_ID;

        const clientEmail =
            process.env.FIREBASE_CLIENT_EMAIL;

        let privateKey =
            process.env.FIREBASE_PRIVATE_KEY;

        if (
            !projectId ||
            !clientEmail ||
            !privateKey
        ) {
            console.error(
                'Firebase environment variables are missing'
            );

            return false;
        }

        /*
         * Vercel environment variables usually
         * contain escaped newlines.
         */
        privateKey =
            privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential:
                admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey
                })
        });

        firebaseInitialized = true;

        return true;

    } catch (error) {
        console.error(
            'Firebase initialization failed:',
            error
        );

        return false;
    }
}

/*
|--------------------------------------------------------------------------
| Security headers
|--------------------------------------------------------------------------
*/

function setSecurityHeaders(res) {
    res.setHeader(
        'Access-Control-Allow-Origin',
        ALLOWED_ORIGIN
    );

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, OPTIONS'
    );

    res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type'
    );

    res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
    );

    res.setHeader(
        'X-Frame-Options',
        'DENY'
    );

    res.setHeader(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
    );

    res.setHeader(
        'Cache-Control',
        'no-store'
    );
}

/*
|--------------------------------------------------------------------------
| Rate limit
|--------------------------------------------------------------------------
*/

function getClientIp(req) {
    const forwarded =
        req.headers['x-forwarded-for'];

    if (forwarded) {
        return String(forwarded)
            .split(',')[0]
            .trim();
    }

    return (
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

function checkRateLimit(key) {
    const now = Date.now();

    const current =
        rateLimitStore.get(key);

    if (!current) {
        rateLimitStore.set(key, {
            start: now,
            count: 1
        });

        return true;
    }

    if (
        now - current.start >=
        RATE_LIMIT_WINDOW
    ) {
        rateLimitStore.set(key, {
            start: now,
            count: 1
        });

        return true;
    }

    if (
        current.count >=
        RATE_LIMIT_MAX
    ) {
        return false;
    }

    current.count++;

    return true;
}

/*
|--------------------------------------------------------------------------
| SteamID validation
|--------------------------------------------------------------------------
*/

function isValidSteamId(steamId) {
    return (
        typeof steamId === 'string' &&
        /^[0-9]{17}$/.test(steamId)
    );
}

/*
|--------------------------------------------------------------------------
| Steam OpenID validation
|--------------------------------------------------------------------------
*/

function isValidSteamClaimedId(claimedId) {
    if (
        typeof claimedId !== 'string'
    ) {
        return false;
    }

    return /^https?:\/\/steamcommunity\.com\/openid\/id\/[0-9]{17}$/
        .test(claimedId);
}

/*
|--------------------------------------------------------------------------
| Main endpoint
|--------------------------------------------------------------------------
*/

module.exports = async (req, res) => {
    setSecurityHeaders(res);

    /*
     * CORS preflight
     */

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    /*
     * Only GET
     */

    if (req.method !== 'GET') {
        res.setHeader(
            'Allow',
            'GET, OPTIONS'
        );

        return res.status(405).json({
            error: 'Method not allowed'
        });
    }

    /*
     * Firebase must exist
     */

    if (!initializeFirebase()) {
        return res.status(500).json({
            error:
                'Authentication service unavailable.'
        });
    }

    /*
     * Rate limit
     */

    const clientIp =
        getClientIp(req);

    if (
        !checkRateLimit(
            `ip:${clientIp}`
        )
    ) {
        res.setHeader(
            'Retry-After',
            '60'
        );

        return res.status(429).json({
            error:
                'Too many authentication attempts.',
            rateLimited: true
        });
    }

    try {
        const query = req.query || {};

        /*
         * ------------------------------------------------------------
         * STEP 1 — Start Steam login
         * ------------------------------------------------------------
         */

        if (!query['openid.mode']) {
            const host =
                req.headers.host;

            if (!host) {
                return res.status(500).json({
                    error:
                        'Authentication configuration error.'
                });
            }

            /*
             * Never trust arbitrary Host headers.
             */

            const allowedHosts = [
                'rastrgrade.vercel.app'
            ];

            if (
                !allowedHosts.includes(host)
            ) {
                return res.status(400).json({
                    error:
                        'Invalid authentication host.'
                });
            }

            const returnTo =
                `https://${host}${req.url.split('?')[0]}`;

            const realm =
                `https://${host}`;

            const params =
                new URLSearchParams();

            params.set(
                'openid.ns',
                'http://specs.openid.net/auth/2.0'
            );

            params.set(
                'openid.mode',
                'checkid_setup'
            );

            params.set(
                'openid.return_to',
                returnTo
            );

            params.set(
                'openid.realm',
                realm
            );

            params.set(
                'openid.identity',
                'http://specs.openid.net/auth/2.0/identifier_select'
            );

            params.set(
                'openid.claimed_id',
                'http://specs.openid.net/auth/2.0/identifier_select'
            );

            return res.redirect(
                `${STEAM_OPENID_URL}?${params.toString()}`
            );
        }

        /*
         * ------------------------------------------------------------
         * STEP 2 — Verify Steam OpenID
         * ------------------------------------------------------------
         */

        if (
            query['openid.mode'] !==
            'id_res'
        ) {
            return res.status(400).json({
                error:
                    'Invalid Steam OpenID response.'
            });
        }

        const claimedId =
            query['openid.claimed_id'];

        if (
            !isValidSteamClaimedId(
                claimedId
            )
        ) {
            return res.status(400).json({
                error:
                    'Invalid Steam identity.'
            });
        }

        /*
         * Verify with Steam.
         */

        const verifyParams =
            new URLSearchParams();

        for (
            const [key, value]
            of Object.entries(query)
        ) {
            if (
                typeof value === 'string'
            ) {
                verifyParams.set(
                    key,
                    value
                );
            }
        }

        verifyParams.set(
            'openid.mode',
            'check_authentication'
        );

        const controller =
            new AbortController();

        const timeout =
            setTimeout(() => {
                controller.abort();
            }, 10000);

        let verifyResponse;

        try {
            verifyResponse =
                await fetch(
                    STEAM_OPENID_URL,
                    {
                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/x-www-form-urlencoded',

                            'Accept':
                                'text/plain'
                        },

                        body:
                            verifyParams.toString(),

                        signal:
                            controller.signal
                    }
                );
        } finally {
            clearTimeout(timeout);
        }

        if (
            !verifyResponse.ok
        ) {
            return res.status(502).json({
                error:
                    'Steam authentication service unavailable.'
            });
        }

        const verifyText =
            await verifyResponse.text();

        if (
            !/is_valid\s*:\s*true/i
                .test(verifyText)
        ) {
            return res.status(401).json({
                error:
                    'Steam authentication failed.'
            });
        }

        /*
         * ------------------------------------------------------------
         * STEP 3 — Extract SteamID
         * ------------------------------------------------------------
         */

        const match =
            claimedId.match(
                /^https?:\/\/steamcommunity\.com\/openid\/id\/([0-9]{17})$/
            );

        if (!match) {
            return res.status(400).json({
                error:
                    'Invalid SteamID.'
            });
        }

        const steamId =
            match[1];

        if (
            !isValidSteamId(
                steamId
            )
        ) {
            return res.status(400).json({
                error:
                    'Invalid SteamID.'
            });
        }

        /*
         * ------------------------------------------------------------
         * STEP 4 — Steam profile
         * ------------------------------------------------------------
         */

        const apiKey =
            process.env.STEAM_API_KEY;

        let profile = {
            steamid: steamId,
            personaname: 'Player',
            avatarfull: ''
        };

        if (apiKey) {
            try {
                const steamApiUrl =
                    'https://api.steampowered.com/' +
                    'ISteamUser/GetPlayerSummaries/v0002/' +
                    `?key=${encodeURIComponent(apiKey)}` +
                    `&steamids=${encodeURIComponent(steamId)}`;

                const profileController =
                    new AbortController();

                const profileTimeout =
                    setTimeout(() => {
                        profileController.abort();
                    }, 10000);

                let steamResponse;

                try {
                    steamResponse =
                        await fetch(
                            steamApiUrl,
                            {
                                headers: {
                                    'Accept':
                                        'application/json'
                                },

                                signal:
                                    profileController.signal
                            }
                        );
                } finally {
                    clearTimeout(
                        profileTimeout
                    );
                }

                if (
                    steamResponse.ok
                ) {
                    const steamData =
                        await steamResponse.json();

                    const player =
                        steamData?.response?.players?.[0];

                    if (
                        player &&
                        player.steamid === steamId
                    ) {
                        profile = {
                            steamid:
                                steamId,

                            personaname:
                                typeof player.personaname === 'string'
                                    ? player.personaname
                                    : 'Player',

                            avatarfull:
                                typeof player.avatarfull === 'string'
                                    ? player.avatarfull
                                    : ''
                        };
                    }
                }

            } catch (error) {
                console.error(
                    'Steam profile lookup failed:',
                    error
                );
            }
        }

        /*
         * ------------------------------------------------------------
         * STEP 5 — Firestore
         * ------------------------------------------------------------
         */

        const db =
            admin.firestore();

        const userRef =
            db
                .collection('users')
                .doc(steamId);

        const userSnap =
            await userRef.get();

        const now =
            Date.now();

        if (!userSnap.exists) {
            await userRef.set({
                steamId: steamId,

                displayName:
                    profile.personaname,

                photoURL:
                    profile.avatarfull,

                balance: 5,

                inventory: [],

                profit: 0,

                totalWon: 0,

                totalLost: 0,

                upgrades: 0,

                purchases: 0,

                bestDrop: null,

                bestUpgrade: null,

                housePlayerLost: 0,

                houseCasinoWon: 0,

                xp: 0,

                level: 1,

                soundOn: true,

                shopFilter: 'all',

                shopSort:
                    'price-asc',

                spinSpeed:
                    'slow',

                updatedAt: now
            });

        } else {
            /*
             * IMPORTANT:
             *
             * We deliberately DO NOT touch balance,
             * inventory, XP, level, winnings, etc.
             *
             * Login must never reset the economy.
             */

            await userRef.update({
                displayName:
                    profile.personaname,

                photoURL:
                    profile.avatarfull,

                updatedAt: now
            });
        }

        /*
         * ------------------------------------------------------------
         * STEP 6 — Firebase Custom Token
         * ------------------------------------------------------------
         */

        const customToken =
            await admin
                .auth()
                .createCustomToken(
                    steamId,
                    {
                        displayName:
                            profile.personaname,

                        photoURL:
                            profile.avatarfull
                    }
                );

        /*
         * IMPORTANT:
         *
         * The current architecture still sends
         * the Firebase token through the URL.
         *
         * It works, but a one-time exchange code
         * or HttpOnly cookie is safer for production.
         */

        const frontendUrl =
            new URL(
                'https://rastrgrade.vercel.app/'
            );

        frontendUrl.searchParams.set(
            'steam_token',
            customToken
        );

        return res.redirect(
            frontendUrl.toString()
        );

    } catch (error) {

        console.error(
            'Steam authentication error:',
            error
        );

        /*
         * Never expose error.message,
         * stack traces or Firebase internals.
         */

        return res.status(500).json({
            error:
                'Authentication failed. Please try again.'
        });
    }
};
