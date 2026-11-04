/**
 * Magic-link email via Resend. Without RESEND_API_KEY (local dev) the link is
 * printed to the server console instead, so sign-in still works offline.
 */
import { Resend } from "resend";

export async function sendMagicLinkEmail(to: string, url: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.info(`\n[magic link] Sign-in link for ${to}:\n${url}\n`);
    return;
  }
  const from = process.env.EMAIL_FROM ?? "CogniArena <onboarding@resend.dev>";
  const { error } = await new Resend(key).emails.send({
    from,
    to,
    subject: "Your CogniArena sign-in link",
    text: `Sign in to CogniArena:\n\n${url}\n\nThis link expires in 5 minutes. If you didn't ask for it, ignore this email.`,
    html: `<p>Sign in to CogniArena:</p><p><a href="${url}">Sign in</a></p><p>This link expires in 5 minutes. If you didn't ask for it, ignore this email.</p>`,
  });
  if (error) throw new Error(`Could not send sign-in email: ${error.message}`);
}
