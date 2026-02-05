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
  textMuted: "#8E8EA0",
  scoreHigh: "#1A8C5B",
  scoreMid: "#D4940A",
  scoreLow: "#C23B3B",
  border: "#E5E5EA",
  borderSubtle: "#ECECF0",
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
      .content-card { padding: 32px 24px !important; }
      .cta-button { padding: 14px 24px !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.background}; font-family: ${fonts.body};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.background};">
    <tr>
      <td class="email-container" align="center" style="padding: 48px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 520px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom: 32px;">
              <span style="font-family: ${fonts.headline}; font-size: 24px; font-weight: 400; color: ${colors.textPrimary}; letter-spacing: -0.5px;">Loupe</span>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.card}; border-radius: 16px; border: 1px solid ${colors.border};">
                <tr>
                  <td class="content-card" style="padding: 40px 36px;">
                    ${content}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding-top: 28px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: ${colors.textMuted};">
                <a href="https://getloupe.io/settings/integrations" style="color: ${colors.textMuted}; text-decoration: underline;">Manage emails</a>
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

// ============================================
// Context-aware email templates
// ============================================

interface ChangeDetectedEmailParams {
  pageUrl: string;
  analysisId: string;
  triggerType: "daily" | "weekly" | "deploy";
  primaryChange: {
    element: string; // "Your headline"
    before: string;
    after: string;
  };
  additionalChangesCount: number;
  correlation?: {
    hasEnoughData: boolean;
    primaryMetric?: {
      friendlyName: string; // "More people sticking around"
      change: string; // "+8%"
      assessment: "improved" | "regressed" | "neutral";
    };
  };
  topSuggestion?: {
    element: string;
    friendlyText: string;
    range: string;
  };
  commitSha?: string;
  commitMessage?: string;
}

/**
 * Change detected email — sent when scheduled/deploy scan finds changes
 */
export function changeDetectedEmail({
  pageUrl,
  analysisId,
  triggerType,
  primaryChange,
  additionalChangesCount,
  correlation,
  topSuggestion,
  commitSha,
  commitMessage,
}: ChangeDetectedEmailParams): { subject: string; html: string } {
  const resultsUrl = `https://getloupe.io/analysis/${analysisId}`;
  const domain = new URL(pageUrl).hostname;

  // Dynamic subject line based on correlation
  let subject: string;
  if (correlation?.hasEnoughData && correlation.primaryMetric) {
    if (correlation.primaryMetric.assessment === "improved") {
      subject = `Your ${primaryChange.element.toLowerCase()} change helped`;
    } else if (correlation.primaryMetric.assessment === "regressed") {
      subject = `Your ${primaryChange.element.toLowerCase()} change may need attention`;
    } else {
      subject = `${escapeHtml(domain)} changed`;
    }
  } else {
    subject = `${escapeHtml(domain)} changed`;
  }

  // Determine the headline based on correlation status
  let headlineHtml: string;
  if (correlation?.hasEnoughData && correlation.primaryMetric) {
    const metric = correlation.primaryMetric;
    if (metric.assessment === "improved") {
      headlineHtml = `
        <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.scoreHigh}; line-height: 1.2; letter-spacing: -0.5px;">
          This change helped.
        </h1>
        <p style="margin: 0 0 32px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
          ${escapeHtml(metric.friendlyName)} <span style="font-weight: 600; color: ${colors.scoreHigh};">${escapeHtml(metric.change)}</span>
        </p>
      `;
    } else if (metric.assessment === "regressed") {
      headlineHtml = `
        <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.scoreLow}; line-height: 1.2; letter-spacing: -0.5px;">
          This change may need attention.
        </h1>
        <p style="margin: 0 0 32px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
          ${escapeHtml(metric.friendlyName)} <span style="font-weight: 600; color: ${colors.scoreLow};">${escapeHtml(metric.change)}</span>
        </p>
      `;
    } else {
      headlineHtml = `
        <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
          Your page changed.
        </h1>
        <p style="margin: 0 0 32px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
          No significant impact yet.
        </p>
      `;
    }
  } else {
    // Still watching for data
    headlineHtml = `
      <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
        Your page changed.
      </h1>
      <p style="margin: 0 0 32px 0; font-size: 17px; color: ${colors.textMuted}; line-height: 1.5;">
        Watching for impact over the next few days.
      </p>
    `;
  }

  // The change detail - cleaner before/after
  const changeDetailHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 12px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(primaryChange.element)}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 15px; color: ${colors.textMuted}; line-height: 1.5;">
            <span style="text-decoration: line-through;">${escapeHtml(truncateText(primaryChange.before, 80))}</span>
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.5;">
            ${escapeHtml(truncateText(primaryChange.after, 80))}
          </p>
        </td>
      </tr>
    </table>
  `;

  // Additional changes note (inline, not a separate section)
  const additionalChangesHtml = additionalChangesCount > 0
    ? `<p style="margin: 0 0 28px 0; font-size: 14px; color: ${colors.textMuted};">
        + ${additionalChangesCount} more change${additionalChangesCount > 1 ? "s" : ""} in the full report
      </p>`
    : "";

  // Deploy context (subtle, not prominent)
  let deployContextHtml = "";
  if (triggerType === "deploy" && commitSha) {
    const shortSha = commitSha.slice(0, 7);
    deployContextHtml = `
      <p style="margin: 0 0 28px 0; font-size: 13px; color: ${colors.textMuted};">
        Triggered by deploy <code style="font-family: ${fonts.mono}; background-color: ${colors.background}; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${shortSha}</code>${commitMessage ? ` — ${escapeHtml(truncateText(commitMessage, 40))}` : ""}
      </p>
    `;
  }

  // Next suggestion (if available, keep it light)
  let suggestionHtml = "";
  if (topSuggestion) {
    suggestionHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; border-top: 1px solid ${colors.borderSubtle}; padding-top: 24px;">
        <tr>
          <td>
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
              Next up
            </p>
            <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.5;">
              ${escapeHtml(topSuggestion.element)}: ${escapeHtml(topSuggestion.friendlyText)}
              <span style="color: ${colors.textMuted};"> — ${escapeHtml(topSuggestion.range)}</span>
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  const content = `
    ${headlineHtml}
    ${deployContextHtml}
    ${changeDetailHtml}
    ${additionalChangesHtml}
    ${suggestionHtml}

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <a class="cta-button" href="${resultsUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 10px;">
            See full report
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface AllQuietEmailParams {
  pageUrl: string;
  analysisId: string;
  lastChangeDate: string | null;
  topSuggestion?: {
    title: string;
    element: string;
    friendlyText: string;
    range: string;
  };
}

/**
 * All quiet email — sent when scheduled scan finds no changes
 */
export function allQuietEmail({
  pageUrl,
  analysisId,
  lastChangeDate,
  topSuggestion,
}: AllQuietEmailParams): { subject: string; html: string } {
  const resultsUrl = `https://getloupe.io/analysis/${analysisId}`;
  const domain = new URL(pageUrl).hostname;

  const subject = `All quiet on ${domain}`;

  // Main message
  let statusHtml = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      Your page is stable.
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
      <strong style="color: ${colors.textPrimary};">${escapeHtml(domain)}</strong>${lastChangeDate ? ` — no changes since ${escapeHtml(lastChangeDate)}` : ""}
    </p>
  `;

  // Suggestion section (if available)
  let suggestionHtml = "";
  if (topSuggestion) {
    suggestionHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
        <tr>
          <td style="padding: 20px; background-color: ${colors.background}; border-radius: 12px;">
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
              While things are quiet
            </p>
            <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.5;">
              ${escapeHtml(topSuggestion.element)}: ${escapeHtml(topSuggestion.friendlyText)}
              <span style="color: ${colors.textMuted};"> — ${escapeHtml(topSuggestion.range)}</span>
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  const ctaText = topSuggestion ? "See suggestion" : "View your page";

  const content = `
    ${statusHtml}
    ${suggestionHtml}

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <a class="cta-button" href="${resultsUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 10px;">
            ${ctaText}
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface CorrelationUnlockedEmailParams {
  pageUrl: string;
  analysisId: string;
  change: {
    element: string;
    before: string;
    after: string;
    changedAt: string; // "Jan 20"
  };
  metric: {
    friendlyName: string;
    change: string;
  };
  topSuggestion?: {
    element: string;
    friendlyText: string;
    range: string;
  };
}

/**
 * Correlation unlocked email — sent when a watching item becomes validated
 */
export function correlationUnlockedEmail({
  pageUrl,
  analysisId,
  change,
  metric,
  topSuggestion,
}: CorrelationUnlockedEmailParams): { subject: string; html: string } {
  const resultsUrl = `https://getloupe.io/analysis/${analysisId}`;

  const subject = `Your ${change.element.toLowerCase()} change helped`;

  // Hero moment - the win
  const heroHtml = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 32px; font-weight: 400; color: ${colors.scoreHigh}; line-height: 1.2; letter-spacing: -0.5px;">
      It worked.
    </h1>
    <p style="margin: 0 0 32px 0; font-size: 20px; color: ${colors.textPrimary}; line-height: 1.4;">
      ${escapeHtml(metric.friendlyName)} <span style="font-weight: 600; color: ${colors.scoreHigh};">${escapeHtml(metric.change)}</span>
    </p>
  `;

  // The change that worked
  const changeDetailHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 12px;">
          <p style="margin: 0 0 12px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
            Your ${escapeHtml(change.element.toLowerCase())} on ${escapeHtml(change.changedAt)}
          </p>
          <p style="margin: 0 0 8px 0; font-size: 15px; color: ${colors.textMuted}; line-height: 1.5;">
            <span style="text-decoration: line-through;">${escapeHtml(truncateText(change.before, 60))}</span>
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.5;">
            ${escapeHtml(truncateText(change.after, 60))}
          </p>
        </td>
      </tr>
    </table>
  `;

  // Next suggestion (if available)
  let suggestionHtml = "";
  if (topSuggestion) {
    suggestionHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px; border-top: 1px solid ${colors.borderSubtle}; padding-top: 24px;">
        <tr>
          <td>
            <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
              Next up
            </p>
            <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.5;">
              ${escapeHtml(topSuggestion.element)}: ${escapeHtml(topSuggestion.friendlyText)}
              <span style="color: ${colors.textMuted};"> — ${escapeHtml(topSuggestion.range)}</span>
            </p>
          </td>
        </tr>
      </table>
    `;
  }

  const content = `
    ${heroHtml}
    ${changeDetailHtml}
    ${suggestionHtml}

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <a class="cta-button" href="${resultsUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 10px;">
            See what worked
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface WeeklyDigestPageStatus {
  url: string;
  domain: string;
  status: "changed" | "stable" | "suggestion";
  changesCount?: number;
  helped?: boolean;
  suggestionTitle?: string;
}

interface WeeklyDigestEmailParams {
  pages: WeeklyDigestPageStatus[];
}

/**
 * Weekly digest email — sent to users monitoring 3+ pages
 */
export function weeklyDigestEmail({
  pages,
}: WeeklyDigestEmailParams): { subject: string; html: string } {
  const subject = "Your weekly Loupe report";
  const dashboardUrl = "https://getloupe.io/dashboard";

  // Count stats
  const changedCount = pages.filter(p => p.status === "changed").length;
  const helpedCount = pages.filter(p => p.status === "changed" && p.helped).length;

  // Header with summary
  let summaryText = "";
  if (changedCount === 0) {
    summaryText = "All pages stable this week.";
  } else if (helpedCount > 0) {
    summaryText = `${changedCount} page${changedCount > 1 ? "s" : ""} changed${helpedCount > 0 ? `, ${helpedCount} helped` : ""}.`;
  } else {
    summaryText = `${changedCount} page${changedCount > 1 ? "s" : ""} changed.`;
  }

  const headerHtml = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      This week
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
      ${summaryText}
    </p>
  `;

  // Build page rows - simpler, cleaner
  const pageRows = pages
    .map((page) => {
      let statusText = "";
      let statusColor = colors.textMuted;

      if (page.status === "changed") {
        if (page.helped) {
          statusText = "helped";
          statusColor = colors.scoreHigh;
        } else {
          statusText = `${page.changesCount || 1} change${(page.changesCount || 1) > 1 ? "s" : ""}`;
          statusColor = colors.textSecondary;
        }
      } else if (page.status === "stable") {
        statusText = "stable";
        statusColor = colors.textMuted;
      } else if (page.status === "suggestion") {
        statusText = "suggestion ready";
        statusColor = colors.accent;
      }

      return `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid ${colors.borderSubtle};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size: 15px; color: ${colors.textPrimary};">
                  ${escapeHtml(page.domain)}
                </td>
                <td align="right" style="font-size: 14px; color: ${statusColor};">
                  ${statusText}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `;
    })
    .join("");

  const content = `
    ${headerHtml}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      ${pageRows}
    </table>

    <!-- CTA -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td>
          <a class="cta-button" href="${dashboardUrl}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 10px;">
            View dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

/**
 * Helper to truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "...";
}

interface WaitlistConfirmationParams {
  email: string;
}

export function waitlistConfirmationEmail({
  email,
}: WaitlistConfirmationParams): { subject: string; html: string } {
  const subject = "You're on the Loupe waitlist";

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      You're in.
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.6;">
      We'll reach out to <strong style="color: ${colors.textPrimary};">${escapeHtml(email)}</strong> when there's a spot.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 12px;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
            What you'll get
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.6;">
            We screenshot your pages on a schedule, detect meaningful changes, and tell you whether they helped or hurt.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 14px; color: ${colors.textMuted}; line-height: 1.5;">
      Know a founder who ships fast? <a href="https://getloupe.io?ref=waitlist" style="color: ${colors.accent}; text-decoration: none;">Share Loupe</a>
    </p>
  `;

  return { subject, html: emailWrapper(content) };
}
