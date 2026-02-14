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

// Brand colors — Refined Brutalism 2.0
const colors = {
  background: "#F8FAFC",
  card: "#FFFFFF",
  accent: "#FF6B4A",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  scoreHigh: "#059669",
  scoreMid: "#D97706",
  scoreLow: "#DC2626",
  border: "#9AAABD",
  borderSubtle: "rgba(100, 116, 139, 0.34)",
};

// Typography stacks
const fonts = {
  headline: "'Trebuchet MS', 'Gill Sans', 'Helvetica Neue', Arial, sans-serif",
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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.card}; border-radius: 10px; border: 2px solid ${colors.border}; box-shadow: 2px 2px 0 rgba(51, 65, 85, 0.14);">
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
  /** ID of primary detected_change for hypothesis prompt link */
  hypothesisChangeId?: string;
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
  hypothesisChangeId,
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
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 10px;">
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

  // Hypothesis prompt — "What were you testing?"
  let hypothesisHtml = "";
  if (hypothesisChangeId) {
    const hypothesisUrl = `https://getloupe.io/dashboard?hypothesis=${encodeURIComponent(hypothesisChangeId)}`;
    hypothesisHtml = `
      <p style="margin: 0 0 24px 0; font-size: 14px; color: ${colors.textSecondary}; line-height: 1.5;">
        What were you testing?
        <a href="${hypothesisUrl}" style="color: ${colors.accent}; text-decoration: none; font-weight: 500;"> Tell Loupe &rarr;</a>
      </p>
    `;
  }

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
    ${hypothesisHtml}
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
          <td style="padding: 20px; background-color: ${colors.background}; border-radius: 10px;">
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
  changeId: string; // detected_change ID for dashboard deep link
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
  changeId,
  change,
  metric,
  topSuggestion,
}: CorrelationUnlockedEmailParams): { subject: string; html: string } {
  // Deep link to dashboard with win highlighted
  const resultsUrl = `https://getloupe.io/dashboard?win=${encodeURIComponent(changeId)}`;

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
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 10px;">
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
            See your results
          </a>
        </td>
      </tr>
    </table>
  `;

  return { subject, html: emailWrapper(content) };
}

interface DailyDigestPageResult {
  url: string;
  domain: string;
  analysisId: string;
  hasChanges: boolean;
  primaryChange?: {
    element: string;
    before: string;
    after: string;
  };
  additionalChangesCount?: number;
}

interface DailyDigestEmailParams {
  pages: DailyDigestPageResult[];
}

/**
 * Daily digest email — consolidated summary of all daily/weekly scan results.
 * Only sent when at least one page has changes.
 */
export function dailyDigestEmail({
  pages,
}: DailyDigestEmailParams): { subject: string; html: string } {
  const dashboardUrl = "https://getloupe.io/dashboard";

  const changedPages = pages.filter((p) => p.hasChanges);
  const stablePages = pages.filter((p) => !p.hasChanges);

  // Dynamic subject line
  let subject: string;
  if (changedPages.length === 1 && stablePages.length === 0) {
    subject = `${escapeHtml(changedPages[0].domain)} changed`;
  } else if (changedPages.length === 1) {
    subject = `${escapeHtml(changedPages[0].domain)} changed, ${stablePages.length} page${stablePages.length > 1 ? "s" : ""} stable`;
  } else {
    subject = `${changedPages.length} of ${pages.length} pages changed`;
  }

  // Header
  const headerHtml = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      Your daily scan
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.5;">
      ${changedPages.length} page${changedPages.length !== 1 ? "s" : ""} changed${stablePages.length > 0 ? `, ${stablePages.length} stable` : ""}.
    </p>
  `;

  // Changed pages — show detail
  const changedPagesHtml = changedPages
    .map((page) => {
      const changeDetail = page.primaryChange
        ? `
          <p style="margin: 8px 0 4px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(page.primaryChange.element)}
          </p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: ${colors.textMuted}; line-height: 1.5;">
            <span style="text-decoration: line-through;">${escapeHtml(truncateText(page.primaryChange.before, 60))}</span>
          </p>
          <p style="margin: 0; font-size: 14px; color: ${colors.textPrimary}; line-height: 1.5;">
            ${escapeHtml(truncateText(page.primaryChange.after, 60))}
          </p>
          ${(page.additionalChangesCount ?? 0) > 0 ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: ${colors.textMuted};">+ ${page.additionalChangesCount} more</p>` : ""}
        `
        : "";

      return `
        <tr>
          <td style="padding: 16px; background-color: ${colors.background}; border-radius: 10px; margin-bottom: 8px;">
            <a href="https://getloupe.io/analysis/${page.analysisId}" style="font-size: 15px; font-weight: 600; color: ${colors.textPrimary}; text-decoration: none;">
              ${escapeHtml(page.domain)}
            </a>
            ${changeDetail}
          </td>
        </tr>
        <tr><td style="height: 8px;"></td></tr>
      `;
    })
    .join("");

  // Stable pages — compact list
  let stablePagesHtml = "";
  if (stablePages.length > 0) {
    const stableRows = stablePages
      .map(
        (page) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid ${colors.borderSubtle};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="font-size: 14px; color: ${colors.textPrimary};">
                  ${escapeHtml(page.domain)}
                </td>
                <td align="right" style="font-size: 13px; color: ${colors.textMuted};">
                  stable
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `
      )
      .join("");

    stablePagesHtml = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 16px; margin-bottom: 28px;">
        ${stableRows}
      </table>
    `;
  }

  const content = `
    ${headerHtml}

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: ${stablePages.length > 0 ? "8px" : "28px"};">
      ${changedPagesHtml}
    </table>

    ${stablePagesHtml}

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

interface ClaimPageEmailParams {
  domain: string;
  magicLink: string;
}

/**
 * Claim page email — sent when a user enters their email to claim a page
 */
export function claimPageEmail({
  domain,
  magicLink,
}: ClaimPageEmailParams): { subject: string; html: string } {
  const subject = `Claim ${domain}`;

  const content = `
    <h1 style="margin: 0 0 8px 0; font-family: ${fonts.headline}; font-size: 28px; font-weight: 400; color: ${colors.textPrimary}; line-height: 1.2; letter-spacing: -0.5px;">
      Your audit is ready.
    </h1>
    <p style="margin: 0 0 28px 0; font-size: 17px; color: ${colors.textSecondary}; line-height: 1.6;">
      Claim <strong style="color: ${colors.textPrimary};">${escapeHtml(domain)}</strong> to track what changes&nbsp;next.
    </p>

    <!-- CTA Button -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td>
          <a class="cta-button" href="${escapeHtml(magicLink)}" style="display: inline-block; background-color: ${colors.accent}; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 24px; border-radius: 10px;">
            Claim ${escapeHtml(domain)}
          </a>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
      <tr>
        <td style="padding: 20px; background-color: ${colors.background}; border-radius: 10px;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: ${colors.textMuted}; text-transform: uppercase; letter-spacing: 0.5px;">
            What happens next
          </p>
          <p style="margin: 0; font-size: 15px; color: ${colors.textPrimary}; line-height: 1.6;">
            We'll re-scan your page daily and notify you when something changes — so you know if updates help or&nbsp;hurt.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 13px; color: ${colors.textMuted}; line-height: 1.5;">
      This link expires in 1&nbsp;hour. If you didn't request this, you can ignore this&nbsp;email.
    </p>
  `;

  return { subject, html: emailWrapper(content) };
}

