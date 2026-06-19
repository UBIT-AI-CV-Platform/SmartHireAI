// Branded transactional email builders for SmartHire AI.
// Matches the design language of backend/email-templates/*.html.

type ApplicationOpts = {
  name: string
  jobTitle: string
  company: string
  location?: string | null
  matchScore?: number | null
}

export const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

// Branded pill button used as the CTA in every email.
const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:6px auto 0 auto;"><tr><td align="center" bgcolor="#3525cd" style="border-radius:14px;background:linear-gradient(135deg,#3525cd 0%,#712ae2 100%);">
    <a href="${href}" target="_blank" style="display:inline-block;padding:13px 30px;font-size:14px;font-weight:800;color:#ffffff;text-decoration:none;border-radius:14px;font-family:'Inter','Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(label)}</a>
  </td></tr></table>`

const shell = (innerHtml: string) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f9fb;margin:0;padding:32px 12px;font-family:'Inter','Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="460" cellpadding="0" cellspacing="0" style="width:460px;max-width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px -12px rgba(53,37,205,0.18);">
      <tr>
        <td style="background:#3525cd;background:linear-gradient(135deg,#3525cd 0%,#712ae2 100%);padding:32px 32px 28px 32px;text-align:center;">
          <table role="presentation" cellpadding="0" cellspacing="0" align="center"><tr>
            <td style="vertical-align:middle;padding-right:10px;"><div style="width:40px;height:40px;background:rgba(255,255,255,0.18);border-radius:12px;text-align:center;line-height:40px;font-size:20px;color:#ffffff;">&#10024;</div></td>
            <td style="vertical-align:middle;"><span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">SmartHire <span style="color:#d2bbff;">AI</span></span></td>
          </tr></table>
        </td>
      </tr>
      ${innerHtml}
      <tr><td style="padding:28px 36px 0 36px;"><div style="height:1px;background-color:#eceef0;"></div></td></tr>
      <tr><td style="padding:18px 36px 32px 36px;text-align:center;"><p style="margin:0;font-size:12px;color:#9a98a8;">&copy; SmartHire AI &mdash; AI-powered recruitment</p></td></tr>
    </table>
  </td></tr>
</table>`

export function applicationConfirmationEmail(o: ApplicationOpts) {
  const subject = `Application sent — ${o.jobTitle} at ${o.company}`
  const meta = [o.location, o.matchScore != null ? `${o.matchScore}% skills match` : null].filter(Boolean).join(' • ')
  const inner = `
    <tr><td style="padding:36px 36px 8px 36px;text-align:center;">
      <div style="width:56px;height:56px;margin:0 auto 18px auto;background:#e8fff1;border-radius:16px;text-align:center;line-height:56px;font-size:26px;">&#9989;</div>
      <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#191c1e;letter-spacing:-0.5px;">Application sent!</h1>
      <p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:#5b5b6b;">
        Hi ${escapeHtml(o.name) || 'there'}, your application and CV were successfully sent to the recruiter. Here are the details:
      </p>
    </td></tr>
    <tr><td style="padding:0 36px;">
      <div style="background:#f0f4ff;border:1px solid #e2dfff;border-radius:16px;padding:20px 22px;text-align:left;">
        <div style="font-size:17px;font-weight:800;color:#191c1e;">${escapeHtml(o.jobTitle)}</div>
        <div style="font-size:14px;font-weight:600;color:#3525cd;margin-top:2px;">${escapeHtml(o.company)}</div>
        ${meta ? `<div style="font-size:12px;color:#777587;margin-top:8px;">${escapeHtml(meta)}</div>` : ''}
      </div>
    </td></tr>
    <tr><td style="padding:24px 36px 0 36px;text-align:center;">
      <p style="margin:0;font-size:13px;line-height:20px;color:#777587;">
        You can track this application&rsquo;s status anytime from your SmartHire AI dashboard. We&rsquo;ll keep you posted as it moves forward.
      </p>
      <p style="margin:14px 0 0 0;font-size:12px;line-height:18px;color:#9a98a8;">Good luck! &#128640;</p>
    </td></tr>`
  return { subject, html: shell(inner) }
}

// Shared centered hero block: emoji badge, heading, intro line.
const hero = (badge: string, badgeBg: string, title: string, intro: string) => `
  <tr><td style="padding:36px 36px 8px 36px;text-align:center;">
    <div style="width:56px;height:56px;margin:0 auto 18px auto;background:${badgeBg};border-radius:16px;text-align:center;line-height:56px;font-size:26px;">${badge}</div>
    <h1 style="margin:0 0 8px 0;font-size:22px;font-weight:800;color:#191c1e;letter-spacing:-0.5px;">${escapeHtml(title)}</h1>
    <p style="margin:0 0 22px 0;font-size:14px;line-height:22px;color:#5b5b6b;">${intro}</p>
  </td></tr>`

const infoCard = (title: string, sub: string, meta?: string | null) => `
  <tr><td style="padding:0 36px;">
    <div style="background:#f0f4ff;border:1px solid #e2dfff;border-radius:16px;padding:20px 22px;text-align:left;">
      <div style="font-size:17px;font-weight:800;color:#191c1e;">${escapeHtml(title)}</div>
      <div style="font-size:14px;font-weight:600;color:#3525cd;margin-top:2px;">${escapeHtml(sub)}</div>
      ${meta ? `<div style="font-size:12px;color:#777587;margin-top:8px;">${escapeHtml(meta)}</div>` : ''}
    </div>
  </td></tr>`

const ctaRow = (label: string, href: string, note?: string) => `
  <tr><td style="padding:24px 36px 0 36px;text-align:center;">
    ${button(label, href)}
    ${note ? `<p style="margin:16px 0 0 0;font-size:12px;line-height:18px;color:#9a98a8;">${escapeHtml(note)}</p>` : ''}
  </td></tr>`

// A recruiter messaged the candidate (or vice-versa). CTA → open the chat.
export function newMessageEmail(o: { name: string; fromName: string; preview: string; basePath: string; role: 'recruiter' | 'candidate' }) {
  const who = o.role === 'recruiter' ? 'candidate' : 'recruiter'
  const subject = `New message from ${o.fromName} — SmartHire AI`
  const inner =
    hero('&#128172;', '#eef0ff', `${o.fromName} sent you a message`,
      `Hi ${escapeHtml(o.name) || 'there'}, you have a new message from a ${who} on SmartHire AI.`) +
    `<tr><td style="padding:0 36px;"><div style="background:#f7f7fb;border:1px solid #ececf2;border-radius:16px;padding:18px 20px;text-align:left;"><div style="font-size:14px;line-height:22px;color:#33333f;font-style:italic;">&ldquo;${escapeHtml(o.preview)}&rdquo;</div></div></td></tr>` +
    ctaRow('Open the conversation', `${appUrl()}${o.basePath}/inbox`, 'Reply right inside SmartHire AI to keep everything in one place.')
  return { subject, html: shell(inner) }
}

// Interview scheduled by the recruiter. CTA → candidate inbox to confirm.
export function interviewScheduledEmail(o: { name: string; jobTitle: string; company: string; whenText: string; durationMin?: number; notes?: string | null }) {
  const subject = `Interview invitation — ${o.jobTitle} at ${o.company}`
  const meta = [o.whenText, o.durationMin ? `${o.durationMin} min` : null].filter(Boolean).join(' • ')
  const inner =
    hero('&#128197;', '#e6f3ff', 'You have an interview! 🎉',
      `Hi ${escapeHtml(o.name) || 'there'}, ${escapeHtml(o.company)} would like to interview you for the role below. Please confirm your availability.`) +
    infoCard(o.jobTitle, o.company, meta) +
    (o.notes ? `<tr><td style="padding:14px 36px 0 36px;"><p style="margin:0;font-size:13px;line-height:20px;color:#5b5b6b;"><b style="color:#33333f;">Note from the recruiter:</b> ${escapeHtml(o.notes)}</p></td></tr>` : '') +
    ctaRow('Confirm in your inbox', `${appUrl()}/candidate/inbox`, 'Accept or decline and join the video room — all from SmartHire AI.')
  return { subject, html: shell(inner) }
}

// Candidate received an offer. CTA → candidate inbox to respond.
export function offerEmail(o: { name: string; jobTitle: string; company: string }) {
  const subject = `Great news — an offer for ${o.jobTitle} at ${o.company}`
  const inner =
    hero('&#127881;', '#e8fff1', 'Congratulations — you got an offer!',
      `Hi ${escapeHtml(o.name) || 'there'}, ${escapeHtml(o.company)} would like to offer you the role below. We can&rsquo;t wait to hear back from you.`) +
    infoCard(o.jobTitle, o.company) +
    ctaRow('Review your offer', `${appUrl()}/candidate/inbox`, 'Accept or decline your offer directly in SmartHire AI.')
  return { subject, html: shell(inner) }
}

// Candidate was not selected. Kind + brief. CTA → keep applying.
export function rejectionEmail(o: { name: string; jobTitle: string; company: string }) {
  const subject = `Update on your application — ${o.jobTitle}`
  const inner =
    hero('&#128075;', '#fff4e6', 'An update on your application',
      `Hi ${escapeHtml(o.name) || 'there'}, thank you for your interest in the <b>${escapeHtml(o.jobTitle)}</b> role at ${escapeHtml(o.company)}. After careful consideration, the team won&rsquo;t be moving forward this time.`) +
    `<tr><td style="padding:6px 36px 0 36px;text-align:center;"><p style="margin:0;font-size:13px;line-height:20px;color:#777587;">This isn&rsquo;t a reflection of your potential — keep going. Plenty of great roles are waiting for you on SmartHire AI.</p></td></tr>` +
    ctaRow('Browse more jobs', `${appUrl()}/candidate/my-applications`, 'Your AI Interview Coach is always ready to help you prepare.')
  return { subject, html: shell(inner) }
}

function escapeHtml(s: string) {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
