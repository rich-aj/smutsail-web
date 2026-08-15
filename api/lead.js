/**
 * Lead capture for the programme finder.
 *
 * POST /api/lead  { email, query, level, origin, matchCount, topMatches }
 *
 * Writes to Firebase Realtime Database. The old waitlist path used SendGrid,
 * which is no longer active — and a database write is the better primitive
 * anyway: leads are queryable, survive an email outage, and cost nothing.
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *
 * 1. Vercel → Settings → Environment Variables:
 *
 *      FIREBASE_DB_URL   https://<project>-default-rtdb.firebaseio.com
 *      FIREBASE_DB_SECRET  (optional but recommended — see below)
 *
 * 2. Firebase → Realtime Database → Rules. Leads are write-only from the web:
 *
 *      "leads": {
 *        ".read": false,
 *        ".write": true,
 *        "$id": { ".validate": "newData.hasChildren(['email','createdAt'])" }
 *      }
 *
 *    Write-only means a passer-by can submit a lead but cannot read anyone
 *    else's. If you set FIREBASE_DB_SECRET you can instead close ".write" and
 *    this function will authenticate — stricter, and worth doing before the
 *    booth if you have five minutes.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Crude in-memory throttle. Serverless instances are recycled, so this is a
// speed bump rather than a wall — enough to stop a bored person at a booth
// hammering the form, not enough to call it rate limiting.
const recent = new Map();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function throttled(ip) {
    const now = Date.now();
    const hits = (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
    hits.push(now);
    recent.set(ip, hits);
    if (recent.size > 500) recent.clear(); // bound memory
    return hits.length > MAX_PER_WINDOW;
}

module.exports = async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'POST');
        return res.status(204).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const dbUrl = process.env.FIREBASE_DB_URL;
    if (!dbUrl) {
        console.error('lead: FIREBASE_DB_URL is not set');
        return res.status(500).json({ error: 'Lead capture is not configured yet.' });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    if (throttled(ip)) {
        return res.status(429).json({ error: 'Too many submissions. Please wait a moment.' });
    }

    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    body = body || {};

    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const lead = {
        email,
        query: String(body.query || '').slice(0, 200),
        level: ['masters', 'phd'].includes(body.level) ? body.level : null,
        origin: ['eu', 'non-eu'].includes(body.origin) ? body.origin : null,
        matchCount: Number.isFinite(body.matchCount) ? Math.min(body.matchCount, 9999) : null,
        topMatches: Array.isArray(body.topMatches)
            ? body.topMatches.slice(0, 10).map((s) => String(s).slice(0, 160))
            : [],
        source: 'find-page',
        userAgent: String(req.headers['user-agent'] || '').slice(0, 200),
        createdAt: new Date().toISOString(),
    };

    const secret = process.env.FIREBASE_DB_SECRET;
    const url = `${dbUrl.replace(/\/$/, '')}/leads.json${secret ? `?auth=${encodeURIComponent(secret)}` : ''}`;

    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(lead),
        });

        if (!r.ok) {
            const detail = await r.text();
            // Don't leak database internals to the browser, but do log them.
            console.error('lead: firebase write failed', r.status, detail.slice(0, 300));
            return res.status(502).json({ error: 'Could not save your details. Please try again.' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        console.error('lead: unexpected error', err && err.message);
        return res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};
