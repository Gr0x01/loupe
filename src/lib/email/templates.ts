/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Brand colors
const colors = {
  background: "#F5F5F7",
  card: "#FFFFFF",
  accent: "#5B2E91",
  textPrimary: "#111118",
  textSecondary: "#55556D",
  scoreHigh: "#1A8C5B",
  scoreMid: "#D4940A",
  scoreLow: "#C23B3B",
  border: "#E5E5EA",
};

// Typography stacks
const fonts = {
  headline: "Georgia, 'Times New Roman', serif",
  body: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  mono: "'SF Mono', Menlo, Monaco, 'Courier New', monospace",
};

/**
 * Base email layout wrapper matching Loupe brand
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Loupe</title>
  <!--[if mso]>
  <style type="text/css">
    table { border-collapse: collapse; }
    .fallback-font { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    @media only screen and (max-width: 480px) {
      .email-container { padding: 24px 16px !important; }
      .content-card { padding: 24px 20px !important; }
      .score-number { font-size: 48px !important; }
      .cta-button { padding: 14px 24px !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: ${fonts.body};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.background};">
    <tr>
      <td class="email-container" align="center" style="padding: 48px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 28px;">
              <span style="font-family: ${fonts.headline}; font-size: 26px; font-weight: 400; color: ${colors.textPrimary}; letter-spacing: -0.5px;">Loupe</span>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.card}; border-radius: 20px; border: 1px solid ${colors.border}; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);">
                <tr>
                  <td class="content-card" style="padding: 36px 32px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: ${colors.textSecondary};">
                Sent by <span style="font-family: ${fonts.headline}; color: ${colors.textPrimary};">Loupe</span>
              </p>
              <p style="margin: 0; font-size: 12px; color: ${colors.textSecondary};">
                <a href="https://getloupe.io/settings/integrations" style="color: ${colors.textSecondary}; text-decoration: underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Get score color based on value
 */
function getScoreColor(score: number): string {
  if (score >= 70) return colors.scoreHigh;
  if (score >= 40) return colors.scoreMid;
  return colors.scoreLow;
}

/**
 * Format score delta with arrow and color
 */
function formatScoreDelta(current: number, previous: number | null): string {
  if (previous === null) return "";
  const delta = current - previous;
  if (delta === 0)
    return `<span style="color: ${colors.textSecondary};">no change</span>`;
  const arrow = delta > 0 ? "+" : "";
  const color = delta > 0 ? colors.scoreHigh : colors.scoreLow;
  return `<span style="color: ${color}; font-weight: 600;">${arrow}${delta} points</span>`;
}

interface ScanCompleteParams {
  pageUrl: string;
  score: number;
  previousScore: number | null;
  analysisId: string;
  triggerType: "daily" | "weekly";
}

/**
 * Generate dynamic subject line based on score change
 */
function getSubjectLine(
  score: number,
  previousScore: number | null,
  prefix: string
): string {
  if (previousScore === null) {
    return `${prefix} — ${score}/100`;
  }
  const delta = score - previousScore;
  if (delta < -5) {
    return `${prefix} dropped ${Math.abs(delta)} points — ${score}/100`;
  }
  if (delta > 5) {
    return `${prefix} improved ${delta} points — ${score}/100`;
  }
  if (delta === 0) {
    return `${prefix} is stable — ${score}/100`;
  }
  // Small change
  return `${prefix} — ${score}/100 (${delta > 0 ? "+" : ""}${delta})`;
}

/**
 * Generate Twitter share URL
 */
function getTwitterShareUrl(score: number, resultsUrl: string): string {
  const text = `Just audited my landing page with @getloupe — scored ${score}/100`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(resultsUrl)}`;
}

/**
 * Scan complete email for scheduled (daily/weekly) scans
 */
export function scanCompleteEmail({
  pageUrl,
  score,
  previousScore,
  analysisId,
  triggerType,
}: ScanCompleteParams): { subject: string; html: string } {
  const scoreColor = getScoreColor(score);
  const deltaHtml = formatScoreDelta(score, previousScore);
  const resultsUrl = `https://getloupe.io/analysis/${analysisId}`;
  const hasChanges = previousScore !== null && score !== previousScore;

  // Dynamic subject line
  const subjectPrefix = `Your ${triggerType} scan`;
  const subject = getSubjectLine(score, previousScore, subjectPrefix);

  // Dynamic headline
  const headline =
    previousScore === null
      ? `Your ${triggerType} scan is ready`
      : hasChanges
        ? "Something shifted on your page"
        : "Your page is holding steady";

  // Dynamic CTA
  const ctaText = hasChanges ? "See what changed" : "View full report";

  // Twitter share
  const twitterUrl = getTwitterShareUrl(score, resultsUrl);

  const content = `
    <h1 style="margin: 0 0 12px 0; font-family: ${fonts.headline}; font-size: 26px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      ${headline}
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 15px; color: ${colors.textSecondary}; line-height: 1.5;">
      We just analyzed <strong style="color: ${colors.textPrimary};">${escapeHtml(pageUrl)}</strong>
    </p>

    <!-- Score Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background-color: ${colors.background}; border-radius: 16px; padding: 32px 20px; text-align: center; border: 1px solid ${colors.border};">
          <p class="score-number" style="margin: 0 0 4px 0; font-family: ${fonts.headline}; font-size: 56px; font-weight: 400; color: ${scoreColor}; letter-spacing: -2px; line-height: 1;">
            ${score}
          </p>
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
            out of 100
          </p>
          ${previousScore !== null ? `<p style="margin: 12px 0 0 0; font-size: 14px;">${deltaHtml}</p>` : ""}
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a class="cta-button" href="${resultsUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(91, 46, 145, 0.35);">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>

    <!-- Share -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${twitterUrl}" style="font-size: 13px; color: ${colors.textSecondary}; text-decoration: none;">
            Share your score on Twitter &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface DeployScanCompleteParams {
  pageUrl: string;
  score: number;
  previousScore: number | null;
  analysisId: string;
  commitSha: string;
  commitMessage: string | null;
}

/**
 * Deploy scan complete email for GitHub-triggered scans
 */
export function deployScanCompleteEmail({
  pageUrl,
  score,
  previousScore,
  analysisId,
  commitSha,
  commitMessage,
}: DeployScanCompleteParams): { subject: string; html: string } {
  const scoreColor = getScoreColor(score);
  const deltaHtml = formatScoreDelta(score, previousScore);
  const resultsUrl = `https://getloupe.io/analysis/${analysisId}`;
  const shortSha = commitSha.slice(0, 7);
  const hasChanges = previousScore !== null && score !== previousScore;

  // Dynamic subject line
  const subject = getSubjectLine(score, previousScore, `Deploy ${shortSha}`);

  // Dynamic headline based on outcome
  let headline: string;
  if (previousScore === null) {
    headline = "Post-deploy scan complete";
  } else if (score < previousScore - 5) {
    headline = "This deploy changed things";
  } else if (hasChanges) {
    headline = "A few things shifted after this deploy";
  } else {
    headline = "Your deploy looks clean";
  }

  // Dynamic CTA
  const ctaText = hasChanges ? "See what changed" : "View full report";

  // Twitter share
  const twitterUrl = getTwitterShareUrl(score, resultsUrl);

  const content = `
    <h1 style="margin: 0 0 12px 0; font-family: ${fonts.headline}; font-size: 26px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      ${headline}
    </h1>
    <p style="margin: 0 0 20px 0; font-size: 15px; color: ${colors.textSecondary}; line-height: 1.5;">
      We analyzed <strong style="color: ${colors.textPrimary};">${escapeHtml(pageUrl)}</strong> after your deploy
    </p>

    <!-- Commit Info -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
      <tr>
        <td style="background-color: ${colors.background}; border-radius: 12px; padding: 16px 18px; border: 1px solid ${colors.border};">
          <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
            Triggered by deploy
          </p>
          <p style="margin: 0;">
            <code style="font-family: ${fonts.mono}; background-color: #E5E5EA; padding: 4px 10px; border-radius: 6px; font-size: 13px; color: ${colors.textPrimary};">${shortSha}</code>
          </p>
          ${commitMessage ? `<p style="margin: 10px 0 0 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.4;">${escapeHtml(commitMessage.slice(0, 80))}${commitMessage.length > 80 ? "..." : ""}</p>` : ""}
        </td>
      </tr>
    </table>

    <!-- Score Card -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background-color: ${colors.background}; border-radius: 16px; padding: 32px 20px; text-align: center; border: 1px solid ${colors.border};">
          <p class="score-number" style="margin: 0 0 4px 0; font-family: ${fonts.headline}; font-size: 56px; font-weight: 400; color: ${scoreColor}; letter-spacing: -2px; line-height: 1;">
            ${score}
          </p>
          <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
            out of 100
          </p>
          ${previousScore !== null ? `<p style="margin: 12px 0 0 0; font-size: 14px;">${deltaHtml}</p>` : ""}
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px;">
      <tr>
        <td align="center">
          <a class="cta-button" href="${resultsUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 12px; box-shadow: 0 4px 14px rgba(91, 46, 145, 0.35);">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>

    <!-- Share -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center">
          <a href="${twitterUrl}" style="font-size: 13px; color: ${colors.textSecondary}; text-decoration: none;">
            Share your score on Twitter &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface WaitlistConfirmationParams {
  email: string;
}

/**
 * Waitlist confirmation email
 */
export function waitlistConfirmationEmail({
  email,
}: WaitlistConfirmationParams): { subject: string; html: string } {
  const subject = "You're on the Loupe waitlist";

  const content = `
    <h1 style="margin: 0 0 16px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      You're in.
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 16px; color: ${colors.textSecondary}; line-height: 1.6;">
      Thanks for signing up for Loupe. We're building something to help founders like you catch the changes that slip through when you're shipping fast.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="background-color: ${colors.background}; border-radius: 12px; padding: 24px; border: 1px solid ${colors.border};">
          <p style="margin: 0 0 12px 0; font-size: 11px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px;">
            What you'll get
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.6;">
            We'll screenshot your pages on a schedule, detect meaningful changes — copy that got reworded, CTAs that disappeared, trust signals that broke — and tell you what shifted and what to do about it.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0 0 28px 0; font-size: 14px; color: ${colors.textSecondary};">
      We'll reach out to <strong style="color: ${colors.textPrimary};">${escapeHtml(email)}</strong> when you're in.
    </p>

    <!-- Referral hook -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top: 1px solid ${colors.border}; padding-top: 24px;">
      <tr>
        <td>
          <p style="margin: 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">
            Know a founder who ships fast? <a href="https://getloupe.io?ref=waitlist" style="color: ${colors.accent}; text-decoration: none; font-weight: 500;">Forward this to them</a> — we're letting people in soon.
          </p>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}
