const admin = require('firebase-admin');
const crypto = require('crypto');

const ALLOWED_ORIGIN = 'https://rastrgrade.vercel.app';

// Rust Steam App ID
const RUST_APP_ID = '252490';

// Steam currency:
// 1 = USD
const STEAM_CURRENCY = '1';

// In-memory cache
const memoryCache = new Map();

const MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FIRESTORE_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Rate limit
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30;

const rateLimitStore = new Map();

let firebaseInitialized = false;

/*
|--------------------------------------------------------------------------
| Firebase initialization
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
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        if (!projectId || !clientEmail || !privateKey) {
            console.error(
                'Firebase environment variables are missing.'
            );

            return false;
        }

        /*
         * Vercel / environment variables usually contain:
         *
         * -----BEGIN PRIVATE KEY-----\n...
         *
         * Convert escaped \n into real newlines.
         */
        privateKey = privateKey.replace(/\\n/g, '\n');

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });

        firebaseInitialized = true;

        return true;
    } catch (error) {
        console.error(
            'Firebase initialization error:',
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
        'Access-Control-Max-Age',
        '86400'
    );

    res.setHeader(
        'Vary',
        'Origin'
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
}

/*
|--------------------------------------------------------------------------
| Client IP
|--------------------------------------------------------------------------
*/

function getClientIp(req) {
    const forwardedFor =
        req.headers['x-forwarded-for'];

    if (forwardedFor) {
        return String(forwardedFor)
            .split(',')[0]
            .trim();
    }

    return (
        req.headers['x-real-ip'] ||
        req.socket?.remoteAddress ||
        'unknown'
    );
}

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
*/

function checkRateLimit(key) {
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record) {
        rateLimitStore.set(key, {
            start: now,
            count: 1
        });

        return true;
    }

    if (
        now - record.start >=
        RATE_LIMIT_WINDOW
    ) {
        rateLimitStore.set(key, {
            start: now,
            count: 1
        });

        return true;
    }

    if (
        record.count >=
        RATE_LIMIT_MAX_REQUESTS
    ) {
        return false;
    }

    record.count++;

    return true;
}

/*
|--------------------------------------------------------------------------
| Cleanup rate-limit memory
|--------------------------------------------------------------------------
*/

function cleanupRateLimitStore() {
    const now = Date.now();

    for (
        const [key, value]
        of rateLimitStore.entries()
    ) {
        if (
            now - value.start >=
            RATE_LIMIT_WINDOW
        ) {
            rateLimitStore.delete(key);
        }
    }
}

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

function isValidAppId(appid) {
    return appid === RUST_APP_ID;
}

function isValidMarketHashName(name) {
    if (
        typeof name !== 'string'
    ) {
        return false;
    }

    // Prevent enormous requests
    if (
        name.length < 1 ||
        name.length > 200
    ) {
        return false;
    }

    // Remove accidental surrounding whitespace
    if (
        name.trim() !== name
    ) {
        return false;
    }

    return true;
}

/*
|--------------------------------------------------------------------------
| Safe Firestore document ID
|--------------------------------------------------------------------------
|
| Do NOT create Firestore IDs by replacing characters with "_".
|
| Example:
|
| AK-47
| AK_47
|
| could produce the same document ID.
|
| SHA-256 gives us a fixed, collision-resistant key.
|
*/

function createCacheKey(appid, marketHashName) {
    return crypto
        .createHash('sha256')
        .update(
            `${appid}:${marketHashName}`,
            'utf8'
        )
        .digest('hex');
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
     * Only GET is allowed
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
     * Cleanup rate-limit store
     */
    if (rateLimitStore.size > 1000) {
        cleanupRateLimitStore();
    }

    /*
     * Rate limit by IP
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
                'Too many requests. Please try again later.',
            rateLimited: true
        });
    }

    /*
     * Read query
     */

    const {
        appid,
        market_hash_name
    } = req.query;

    /*
     * Required parameters
     */

    if (!appid) {
        return res.status(400).json({
            error: 'Missing appid'
        });
    }

    if (!market_hash_name) {
        return res.status(400).json({
            error:
                'Missing market_hash_name'
        });
    }

    /*
     * Only Rust
     */

    if (
        typeof appid !== 'string' ||
        !isValidAppId(appid)
    ) {
        return res.status(400).json({
            error: 'Invalid appid'
        });
    }

    /*
     * Validate market name
     */

    if (
        !isValidMarketHashName(
            market_hash_name
        )
    ) {
        return res.status(400).json({
            error:
                'Invalid market_hash_name'
        });
    }

    /*
     * Additional rate limit based on item.
     *
     * Prevents someone from hammering
     * the same expensive Steam lookup.
     */

    const itemRateKey =
        `item:${appid}:${market_hash_name}`;

    if (
        !checkRateLimit(itemRateKey)
    ) {
        res.setHeader(
            'Retry-After',
            '60'
        );

        return res.status(429).json({
            error:
                'Too many requests for this item.',
            rateLimited: true
        });
    }

    /*
     * Create safe cache key
     */

    const cacheKey =
        createCacheKey(
            appid,
            market_hash_name
        );

    /*
     |--------------------------------------------------------------------------
     | 1. Memory cache
     |--------------------------------------------------------------------------
     */

    const memoryEntry =
        memoryCache.get(cacheKey);

    if (
        memoryEntry &&
        Date.now() -
            memoryEntry.time <
            MEMORY_CACHE_TTL
    ) {
        res.setHeader(
            'Cache-Control',
            'public, s-maxage=600, stale-while-revalidate=60'
        );

        return res.status(200).json(
            memoryEntry.data
        );
    }

    /*
     |--------------------------------------------------------------------------
     | 2. Firestore cache
     |--------------------------------------------------------------------------
     */

    let db = null;

    if (initializeFirebase()) {
        try {
            db = admin.firestore();

            const cacheRef =
                db
                    .collection('prices')
                    .doc(cacheKey);

            const cacheSnap =
                await cacheRef.get();

            if (cacheSnap.exists) {
                const cached =
                    cacheSnap.data();

                if (
                    cached &&
                    typeof cached.time === 'number' &&
                    typeof cached.price === 'string' &&
                    Date.now() -
                        cached.time <
                        FIRESTORE_CACHE_TTL
                ) {
                    const result = {
                        success: true,
                        lowest_price:
                            cached.price,
                        cached: true
                    };

                    memoryCache.set(
                        cacheKey,
                        {
                            time: Date.now(),
                            data: result
                        }
                    );

                    res.setHeader(
                        'Cache-Control',
                        'public, s-maxage=600, stale-while-revalidate=60'
                    );

                    return res.status(200).json(
                        result
                    );
                }
            }
        } catch (error) {
            /*
             * Cache failure should NOT
             * completely break the price API.
             */
            console.error(
                'Firestore read error:',
                error
            );
        }
    }

    /*
     |--------------------------------------------------------------------------
     | 3. Steam API
     |--------------------------------------------------------------------------
     */

    const steamUrl =
        'https://steamcommunity.com/market/priceoverview/' +
        `?appid=${encodeURIComponent(appid)}` +
        `&market_hash_name=${encodeURIComponent(
            market_hash_name
        )}` +
        `&currency=${STEAM_CURRENCY}`;

    try {
        const controller =
            new AbortController();

        const timeout =
            setTimeout(() => {
                controller.abort();
            }, 10000);

        let response;

        try {
            response =
                await fetch(
                    steamUrl,
                    {
                        method: 'GET',

                        headers: {
                            'User-Agent':
                                'Rastgrade/1.0 Price Service',

                            'Accept':
                                'application/json',

                            'Accept-Language':
                                'en-US,en;q=0.9'
                        },

                        signal:
                            controller.signal
                    }
                );
        } finally {
            clearTimeout(timeout);
        }

        /*
         * Steam rate limit
         */

        if (
            response.status === 429
        ) {
            res.setHeader(
                'Retry-After',
                '60'
            );

            return res.status(429).json({
                error:
                    'Steam rate limit reached. Please try again later.',
                rateLimited: true
            });
        }

        /*
         * Steam errors
         */

        if (!response.ok) {
            console.error(
                'Steam returned status:',
                response.status
            );

            return res.status(502).json({
                error:
                    'Steam price service unavailable.'
            });
        }

        /*
         * Verify response type
         */

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        if (
            !contentType.includes(
                'application/json'
            )
        ) {
            console.error(
                'Steam returned non-JSON response:',
                contentType
            );

            return res.status(502).json({
                error:
                    'Invalid response from Steam.'
            });
        }

        /*
         * Parse JSON
         */

        const data =
            await response.json();

        /*
         * Validate Steam response
         */

        if (
            !data ||
            typeof data !== 'object'
        ) {
            return res.status(502).json({
                error:
                    'Invalid Steam response.'
            });
        }

        /*
         * Steam can return:
         *
         * {
         *   success: false
         * }
         *
         * for items without a market price.
         */

        if (
            data.success !== true
        ) {
            const result = {
                success: false,
                cached: false
            };

            /*
             * Short memory cache for
             * negative results.
             *
             * Prevents repeatedly asking Steam
             * about a non-existent item.
             */
            memoryCache.set(
                cacheKey,
                {
                    time: Date.now(),
                    data: result
                }
            );

            res.setHeader(
                'Cache-Control',
                'public, s-maxage=60'
            );

            return res.status(200).json(
                result
            );
        }

        /*
         * Validate lowest_price
         */

        if (
            typeof data.lowest_price !==
            'string' ||
            data.lowest_price.length === 0
        ) {
            return res.status(502).json({
                error:
                    'Steam returned an invalid price.'
            });
        }

        /*
         |--------------------------------------------------------------------------
         | Save to Firestore
         |--------------------------------------------------------------------------
         */

        if (db) {
            try {
                await db
                    .collection('prices')
                    .doc(cacheKey)
                    .set({
                        price:
                            data.lowest_price,

                        name:
                            market_hash_name,

                        appid:
                            appid,

                        time:
                            Date.now()
                    });
            } catch (error) {
                /*
                 * Firestore failure should not
                 * break the response.
                 */
                console.error(
                    'Firestore write error:',
                    error
                );
            }
        }

        /*
         |--------------------------------------------------------------------------
         | Memory cache
         |--------------------------------------------------------------------------
         */

        const result = {
            success: true,
            lowest_price:
                data.lowest_price,
            cached: false
        };

        memoryCache.set(
            cacheKey,
            {
                time: Date.now(),
                data: result
            }
        );

        /*
         |--------------------------------------------------------------------------
         | HTTP cache
         |--------------------------------------------------------------------------
         */

        res.setHeader(
            'Cache-Control',
            'public, s-maxage=600, stale-while-revalidate=60'
        );

        return res.status(200).json(
            result
        );

    } catch (error) {
        /*
         * Request timeout
         */

        if (
            error &&
            error.name === 'AbortError'
        ) {
            console.error(
                'Steam price request timed out.'
            );

            return res.status(504).json({
                error:
                    'Steam price request timed out.'
            });
        }

        /*
         * Internal error
         *
         * Don't expose error.message to client.
         */

        console.error(
            'Price endpoint error:',
            error
        );

        return res.status(500).json({
            error:
                'Internal server error.'
        });
    }
};
