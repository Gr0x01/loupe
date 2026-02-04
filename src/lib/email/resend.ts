import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend. Fire-and-forget pattern — returns immediately.
 * Errors are logged but don't throw.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
  try {
    await resend.emails.send({
      from: "Loupe <notifications@getloupe.io>",
      to,
      subject,
      html,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}
