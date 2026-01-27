// Vercel Serverless Function to send waitlist emails using SendGrid
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, _to, _subject } = req.body;

  // Validate input
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
  const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'info@smutsail.com';

  if (!SENDGRID_API_KEY) {
    return res.status(500).json({
      error: 'SendGrid API key not configured. Please set SENDGRID_API_KEY environment variable in Vercel.'
    });
  }

  try {
    // Send email using SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: _to || 'info@smutsail.com' }],
            subject: _subject || 'New Smutsail Waitlist Signup',
          },
        ],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: 'Smutsail',
        },
        reply_to: {
          email: email,
          name: name,
        },
        content: [
          {
            type: 'text/plain',
            value: `
New Waitlist Signup

Name: ${name}
Email: ${email}
Signed up: ${new Date().toLocaleString()}

You can reply directly to this email to contact ${name}.
            `,
          },
          {
            type: 'text/html',
            value: `
              <h2>New Waitlist Signup</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Signed up:</strong> ${new Date().toLocaleString()}</p>
              <hr>
              <p><em>You can reply directly to this email to contact ${name}.</em></p>
            `,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `SendGrid API error (${response.status})`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorMessage = errorJson.errors.map(e => e.message).join(', ');
        }
      } catch (e) {
        // If parsing fails, use the raw error text
        errorMessage = errorText || errorMessage;
      }
      
      console.error('SendGrid API Error:', response.status, errorText);
      throw new Error(errorMessage);
    }

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully to info@smutsail.com'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      error: error.message || 'Failed to send email. Please try again later.'
    });
  }
}
