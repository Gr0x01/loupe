import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { AnalysisResult, Finding } from "@/lib/types/analysis";

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#111118",
    backgroundColor: "#faf9fb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e8e6ec",
  },
  logo: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5b2e91",
  },
  domain: {
    fontSize: 12,
    color: "#64617a",
  },
  verdictSection: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e6ec",
  },
  verdictLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#5b2e91",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  verdictText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111118",
    lineHeight: 1.4,
    marginBottom: 12,
  },
  verdictContext: {
    fontSize: 11,
    color: "#64617a",
    lineHeight: 1.5,
  },
  impactBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 46, 145, 0.1)",
    padding: "8 12",
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 12,
  },
  impactText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5b2e91",
  },
  impactLabel: {
    fontSize: 10,
    color: "#64617a",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111118",
    marginBottom: 16,
    marginTop: 10,
  },
  findingCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e6ec",
  },
  findingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  findingImpact: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "#5b2e91",
    padding: "4 8",
    borderRadius: 4,
    marginRight: 10,
  },
  findingImpactMedium: {
    backgroundColor: "#7c4dab",
  },
  findingImpactLow: {
    backgroundColor: "#9d7dc0",
  },
  findingTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111118",
    flex: 1,
  },
  findingLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64617a",
    textTransform: "uppercase",
    marginBottom: 4,
    marginTop: 8,
  },
  findingValue: {
    fontSize: 10,
    color: "#64617a",
    lineHeight: 1.4,
    fontStyle: "italic",
  },
  suggestionValue: {
    fontSize: 11,
    color: "#111118",
    lineHeight: 1.4,
    fontWeight: "bold",
  },
  predictionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(91, 46, 145, 0.08)",
    padding: "6 10",
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 10,
  },
  predictionRange: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#5b2e91",
  },
  predictionText: {
    fontSize: 10,
    color: "#64617a",
    marginLeft: 6,
  },
  headlineSection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e6ec",
  },
  headlineCurrent: {
    fontSize: 11,
    color: "#64617a",
    marginBottom: 12,
    fontStyle: "italic",
  },
  headlineSuggested: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#111118",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e8e6ec",
  },
  footerText: {
    fontSize: 9,
    color: "#64617a",
  },
  footerCta: {
    fontSize: 10,
    color: "#5b2e91",
    fontWeight: "bold",
  },
  summarySection: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e8e6ec",
    borderLeftWidth: 3,
    borderLeftColor: "#5b2e91",
  },
  summaryText: {
    fontSize: 12,
    color: "#111118",
    lineHeight: 1.6,
    fontStyle: "italic",
  },
});

// Types
interface AuditPdfProps {
  url: string;
  structured: AnalysisResult["structured"];
  createdAt: string;
}

// PDF Document Component
function AuditDocument({ url, structured, createdAt }: AuditPdfProps) {
  const domain = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  })();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>Loupe</Text>
          <Text style={styles.domain}>{domain}</Text>
        </View>

        {/* Verdict Section */}
        <View style={styles.verdictSection}>
          <Text style={styles.verdictLabel}>Verdict</Text>
          <Text style={styles.verdictText}>&quot;{structured.verdict}&quot;</Text>
          {structured.verdictContext && (
            <Text style={styles.verdictContext}>{structured.verdictContext}</Text>
          )}
          <View style={styles.impactBadge}>
            <Text style={styles.impactText}>+{structured.projectedImpactRange}</Text>
            <Text style={styles.impactLabel}>potential improvement</Text>
          </View>
        </View>

        {/* Findings */}
        {structured.findings && structured.findings.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>What to Fix</Text>
            {structured.findings.slice(0, 5).map((finding: Finding, index: number) => (
              <View key={index} style={styles.findingCard}>
                <View style={styles.findingHeader}>
                  <Text
                    style={[
                      styles.findingImpact,
                      finding.impact === "medium" ? styles.findingImpactMedium : undefined,
                      finding.impact === "low" ? styles.findingImpactLow : undefined,
                    ].filter(Boolean) as typeof styles.findingImpact[]}
                  >
                    {finding.impact.toUpperCase()}
                  </Text>
                  <Text style={styles.findingTitle}>{finding.title}</Text>
                </View>
                <Text style={styles.findingLabel}>Current</Text>
                <Text style={styles.findingValue}>&quot;{finding.currentValue}&quot;</Text>
                <Text style={styles.findingLabel}>Suggestion</Text>
                <Text style={styles.suggestionValue}>&quot;{finding.suggestion}&quot;</Text>
                <View style={styles.predictionBadge}>
                  <Text style={styles.predictionRange}>+{finding.prediction.range}</Text>
                  <Text style={styles.predictionText}>{finding.prediction.friendlyText}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Headline Rewrite */}
        {structured.headlineRewrite && (
          <View>
            <Text style={styles.sectionTitle}>Headline Rewrite</Text>
            <View style={styles.headlineSection}>
              <Text style={styles.findingLabel}>Current</Text>
              <Text style={styles.headlineCurrent}>&quot;{structured.headlineRewrite.current}&quot;</Text>
              <Text style={styles.findingLabel}>Suggested</Text>
              <Text style={styles.headlineSuggested}>&quot;{structured.headlineRewrite.suggested}&quot;</Text>
            </View>
          </View>
        )}

        {/* Summary */}
        {structured.summary && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryText}>{structured.summary}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Audit from {formatDate(createdAt)}</Text>
          <Text style={styles.footerCta}>Track your changes at getloupe.io</Text>
        </View>
      </Page>
    </Document>
  );
}

// Generate PDF as Blob
export async function generateAuditPdf(props: AuditPdfProps): Promise<Blob> {
  const doc = <AuditDocument {...props} />;
  return await pdf(doc).toBlob();
}
