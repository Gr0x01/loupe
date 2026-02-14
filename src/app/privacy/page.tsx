import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Loupe",
  description: "How Loupe collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        Privacy Policy
      </h1>
      <p className="text-sm text-text-muted mb-12">
        Last updated: February 6, 2026
      </p>

      <div className="space-y-10 text-text-secondary">
        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            What We Collect
          </h2>
          <p className="mb-4">
            We collect information you provide directly when using Loupe:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong>Account information:</strong> Email address for
              authentication and notifications
            </li>
            <li>
              <strong>URLs you monitor:</strong> The web pages you add to Loupe
              for analysis
            </li>
            <li>
              <strong>Analytics credentials:</strong> Optional connections to
              services like PostHog, Google Analytics, or Supabase
            </li>
            <li>
              <strong>Payment information:</strong> Processed securely by Stripe
              — we never store your card details
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            How We Use Your Data
          </h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Provide and improve the Loupe service</li>
            <li>Send notifications about changes to your monitored pages</li>
            <li>Process payments and manage your subscription</li>
            <li>Respond to support requests</li>
          </ul>
          <p className="mt-4">
            <strong>AI analysis:</strong> We use AI to analyze your monitored
            pages and identify meaningful changes. This automated processing
            helps surface what matters, but final decisions about your site are
            always yours.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Third-Party Services
          </h2>
          <p className="mb-4">We use trusted third parties to operate Loupe:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong>Stripe:</strong> Payment processing
            </li>
            <li>
              <strong>Supabase:</strong> Database and authentication
            </li>
            <li>
              <strong>Vercel:</strong> Hosting and infrastructure
            </li>
            <li>
              <strong>Resend:</strong> Email delivery
            </li>
          </ul>
          <p className="mt-4 mb-4">
            We also use additional service providers for:
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              <strong>AI processing:</strong> To analyze your monitored pages
              and generate insights
            </li>
            <li>
              <strong>Analytics:</strong> To understand how Loupe is used and
              improve the service
            </li>
            <li>
              <strong>Error monitoring:</strong> To detect and fix issues
              quickly
            </li>
          </ul>
          <p className="mt-4">
            These services have their own privacy policies governing how they
            handle your data. Your data may be processed in the United States
            and other countries where these providers operate.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Cookies
          </h2>
          <p>
            We use essential cookies for authentication and keeping you signed
            in. We don&apos;t use advertising or tracking cookies, and we
            don&apos;t sell your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Data Retention & Deletion
          </h2>
          <p>
            We retain your data while your account is active. You can request
            account deletion at any time by contacting us at{" "}
            <a
              href="mailto:team@getloupe.io"
              className="text-accent hover:underline"
            >
              team@getloupe.io
            </a>
            . Upon deletion, we remove your account data, monitored pages, and
            analysis history.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Security
          </h2>
          <p>
            We use industry-standard security measures including encrypted
            connections (HTTPS), encrypted credentials at rest, and secure
            authentication. Analytics credentials you connect are encrypted
            using AES-256-GCM before storage.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Your Rights
          </h2>
          <p>
            You can request access to, correction of, or deletion of your
            personal data at any time by emailing us. California residents have
            additional rights under CCPA, including the right to know what data
            we collect and to opt out of data sales (we don&apos;t sell your
            data).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Contact
          </h2>
          <p className="mb-4">
            Questions about this policy? Reach out:
          </p>
          <address className="not-italic">
            <p>
              Email:{" "}
              <a
                href="mailto:team@getloupe.io"
                className="text-accent hover:underline"
              >
                team@getloupe.io
              </a>
            </p>
            <p className="mt-2">
              Loupe
              <br />
              9901 Brodie Lane Ste 160 #1323
              <br />
              Austin, TX 78748
            </p>
          </address>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-border">
        <Link
          href="/"
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; Back to home
        </Link>
      </div>
    </main>
  );
}
