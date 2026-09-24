/**
 * Render and send the "your matches" email.
 *
 * Kept separate from api/lead.js so the template can be exercised offline —
 * see scripts/preview-email.js in the app repo.
 *
 * TWO RULES, both inherited from the rest of the product:
 *
 *  1. Never invent a deadline. A programme with no published date says so.
 *  2. Every programme links to its source, so the reader can check us.
 */

'use strict';

const BRAND = '#7c3aed';
const INK = '#1a1a2e';
const MUTED = '#6b7280';

function esc(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtDate(iso) {
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function daysUntil(iso) {
    if (!iso) return null;
    return Math.ceil((new Date(`${iso}T00:00:00Z`) - new Date()) / 86400000);
}

/** One line describing the application window, or an honest absence. */
function deadlineLine(p) {
    if (!p.closes) return { text: 'Deadline not published — check the programme page', urgent: false };

    const n = daysUntil(p.closes);
    if (p.opens && new Date(`${p.opens}T00:00:00Z`) > new Date()) {
        return { text: `Opens ${fmtDate(p.opens)}, closes ${fmtDate(p.closes)}`, urgent: false };
    }
    if (n < 0) return { text: `Closed ${fmtDate(p.closes)}`, urgent: false };
    return {
        text: `Closes ${fmtDate(p.closes)} · ${n} day${n === 1 ? '' : 's'} left`,
        urgent: n <= 30,
    };
}

function programmeHtml(p) {
    const dl = deadlineLine(p);
    const meta = [p.city, p.country, p.language, p.duration].filter(Boolean).join(' · ');

    return `
    <tr><td style="padding:0 0 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="border:1px solid #e6e3f5;border-radius:10px;">
        <tr><td style="padding:16px 18px;">
          <div style="font:600 16px/1.35 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK};">
            ${esc(p.name)}
          </div>
          <div style="font:400 14px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};margin-top:2px;">
            ${esc(p.university)}
          </div>
          ${meta ? `<div style="font:400 13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};margin-top:6px;">${esc(meta)}</div>` : ''}
          <div style="margin-top:10px;padding:8px 12px;border-radius:8px;
                      background:${dl.urgent ? '#fff4ed' : '#f6f4ff'};
                      font:600 14px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;
                      color:${dl.urgent ? '#9a3412' : INK};">
            ${esc(dl.text)}
          </div>
          ${p.fee ? `<div style="font:400 13px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};margin-top:8px;">Tuition: ${esc(p.fee)}</div>` : ''}
          ${p.url ? `<div style="margin-top:10px;"><a href="${esc(p.url)}"
              style="font:500 13px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${BRAND};">
              View programme &rarr;</a></div>` : ''}
        </td></tr>
      </table>
    </td></tr>`;
}

function programmeText(p) {
    const dl = deadlineLine(p);
    const meta = [p.city, p.country, p.language, p.duration].filter(Boolean).join(' · ');
    return [
        `${p.name}`,
        `  ${p.university}${meta ? ` — ${meta}` : ''}`,
        `  ${dl.text}`,
        p.fee ? `  Tuition: ${p.fee}` : null,
        p.url ? `  ${p.url}` : null,
    ].filter(Boolean).join('\n');
}

function renderEmail({ query, programmes, matchCount, origin }) {
    const list = Array.isArray(programmes) ? programmes : [];
    const cohort = origin === 'eu' ? 'EU/EEA applicants' : 'applicants outside the EU';
    const subject = list.length
        ? `Your ${list.length} matches${query ? ` for ${query}` : ''}`
        : 'Your Smutsail search';

    const more = matchCount && matchCount > list.length
        ? `<p style="font:400 14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};">
             Showing your ${list.length} best matches out of ${matchCount}.</p>` : '';

    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:24px 12px;background:#f8f9ff;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
   <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:600px;background:#ffffff;border-radius:14px;padding:28px 24px;">

      <tr><td>
        <div style="font:700 22px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${INK};">
          ${esc(query ? `Your matches for ${query}` : 'Your matches')}
        </div>
        <p style="font:400 14px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};">
          Deadlines below are the ones that apply to ${esc(cohort)}.
        </p>
        ${more}
      </td></tr>

      <tr><td style="padding-top:8px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${list.map(programmeHtml).join('')}
        </table>
      </td></tr>

      <tr><td style="padding-top:8px;border-top:1px solid #eeecf8;">
        <p style="font:400 13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};">
          Every deadline above links to where we found it. Where a university hasn't
          published one, we say so rather than guessing — always confirm on the
          programme page before you rely on a date.
        </p>
        <p style="font:400 13px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:${MUTED};">
          <a href="https://www.smutsail.com/find.html" style="color:${BRAND};">Search again at smutsail.com</a>
        </p>
      </td></tr>

    </table>
   </td></tr>
  </table>
</body></html>`;

    const text = [
        query ? `Your matches for ${query}` : 'Your matches',
        '',
        `Deadlines below are the ones that apply to ${cohort}.`,
        matchCount && matchCount > list.length
            ? `Showing your ${list.length} best matches out of ${matchCount}.` : '',
        '',
        list.map(programmeText).join('\n\n'),
        '',
        '---',
        "Every deadline links to where we found it. Where a university hasn't published",
        'one, we say so rather than guessing — always confirm on the programme page.',
        '',
        'Search again: https://www.smutsail.com/find.html',
    ].filter((l) => l !== '').join('\n');

    return { subject, html, text };
}

/**
 * Send via Resend. Returns {sent:false, reason} rather than throwing — a failed
 * email must never lose the lead or break the user's flow.
 */
async function sendMatchesEmail(to, payload) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return { sent: false, reason: 'no-api-key' };

    const from = process.env.EMAIL_FROM || 'Smutsail <hello@smutsail.com>';
    const { subject, html, text } = renderEmail(payload);

    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [to], subject, html, text }),
        });
        if (!r.ok) {
            const detail = await r.text();
            console.error('email: resend rejected', r.status, detail.slice(0, 300));
            return { sent: false, reason: `resend-${r.status}` };
        }
        return { sent: true };
    } catch (e) {
        console.error('email: send failed', e && e.message);
        return { sent: false, reason: 'network' };
    }
}

module.exports = { renderEmail, sendMatchesEmail, deadlineLine };
