# Waitlist Form Setup Guide

The waitlist form is configured to send emails to **info@smutsail.com** using SendGrid.

## Setup Instructions

1. **Get your SendGrid API Key**:
   - Log in to your SendGrid account at [sendgrid.com](https://sendgrid.com)
   - Go to **Settings → API Keys**
   - Click **Create API Key**
   - Give it a name (e.g., "Smutsail Website")
   - Select **Full Access** or **Restricted Access** with "Mail Send" permissions
   - Copy the API key (you'll only see it once!)

2. **Verify your sender email in SendGrid** (if not already done):
   - Go to **Settings → Sender Authentication**
   - Verify the domain `smutsail.com` or the email address you want to send from
   - This is required for SendGrid to send emails

3. **Add environment variables to Vercel**:
   - Go to your Vercel project → **Settings → Environment Variables**
   - Add the following:
     - **Name**: `SENDGRID_API_KEY`
     - **Value**: (paste your SendGrid API key)
     - **Environment**: Production, Preview, Development (check all)
   - Optional (if you want to customize the "from" email):
     - **Name**: `SENDGRID_FROM_EMAIL`
     - **Value**: `noreply@smutsail.com` (or your verified sender email)
   - Click **Save**

4. **Redeploy your site**:
   - Go to **Deployments** tab in Vercel
   - Click the **"..."** menu on the latest deployment
   - Select **Redeploy**

That's it! All waitlist submissions will now be sent to **info@smutsail.com** via SendGrid.

---

## Testing

After setup, test the form by:
1. Going to your website
2. Filling out the waitlist form
3. Checking your inbox at info@smutsail.com

You should receive an email with the subscriber's name and email address.
