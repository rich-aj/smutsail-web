// Vercel Serverless Function
// Saves beta signups to Firebase Realtime Database + sends email via SendGrid

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, _to, _subject } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL;
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'info@smutsail.com';

  const signupData = {
    name,
    email,
    signedUpAt: new Date().toISOString(),
    source: req.headers.referer || 'direct',
  };

  const errors = [];

  // ── 1. Save to Firebase Realtime Database ──
  // Uses open-write rules on /betaSignups — no secret needed (see setup instructions)
  if (FIREBASE_DATABASE_URL) {
    try {
      const firebaseRes = await fetch(
        `${FIREBASE_DATABASE_URL}/betaSignups.json`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(signupData),
        }
      );

      if (!firebaseRes.ok) {
        const errText = await firebaseRes.text();
        console.error('Firebase error:', firebaseRes.status, errText);
        errors.push(`Firebase: ${firebaseRes.status}`);
      } else {
        console.log('Saved to Firebase:', email);
      }
    } catch (err) {
      console.error('Firebase save failed:', err);
      errors.push('Firebase save failed');
    }
  } else {
    console.warn('FIREBASE_DATABASE_URL not set — skipping database save');
  }

  // ── 2. Send email via SendGrid ──
  if (SENDGRID_API_KEY) {
    try {
      const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: _to || 'info@smutsail.com' }],
              subject: _subject || 'New Smutsail Beta Signup',
            },
          ],
          from: { email: SENDGRID_FROM_EMAIL, name: 'Smutsail' },
          reply_to: { email, name },
          content: [
            {
              type: 'text/html',
              value: `
                <h2>New Beta Signup 🎉</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Source:</strong> ${signupData.source}</p>
                <hr>
                <p><em>Reply directly to this email to contact ${name}.</em></p>
              `,
            },
          ],
        }),
      });

      if (!sgRes.ok) {
        const errText = await sgRes.text();
        console.error('SendGrid error:', sgRes.status, errText);
        errors.push(`SendGrid: ${sgRes.status}`);
      } else {
        console.log('Email sent for:', email);
      }
    } catch (err) {
      console.error('SendGrid failed:', err);
      errors.push('Email send failed');
    }
  } else {
    console.warn('SENDGRID_API_KEY not set — skipping email');
  }

  // ── Respond ──
  // Success as long as at least one channel worked (or neither was configured yet)
  if (errors.length === 2) {
    return res.status(500).json({
      error: 'Signup could not be saved. Please try again.',
      details: errors,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Thanks for signing up! We\'ll be in touch soon.',
  });
}
