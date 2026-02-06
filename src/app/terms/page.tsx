import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Loupe",
  description: "Terms and conditions for using Loupe.",
};

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-semibold text-text-primary mb-2">
        Terms of Service
      </h1>
      <p className="text-sm text-text-muted mb-12">
        Last updated: February 6, 2026
      </p>

      <div className="space-y-10 text-text-secondary">
        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Service Description
          </h2>
          <p>
            Loupe is a website monitoring service that analyzes web pages for
            changes and provides AI-powered insights. We scan the URLs you
            provide, detect meaningful changes, and notify you when something
            needs attention.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Ownership
          </h2>
          <p>
            Loupe&apos;s service, design, and branding belong to us. Your data
            — the URLs you monitor, your analytics credentials, your feedback
            — belongs to you. We don&apos;t claim any ownership over the pages
            you monitor or the insights we generate for you.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Your Account
          </h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>You must provide accurate information when creating an account</li>
            <li>You are responsible for maintaining the security of your account</li>
            <li>You must be at least 18 years old to use the service</li>
            <li>One person or entity per account — no sharing credentials</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Acceptable Use
          </h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Monitor pages you don&apos;t own or have permission to access</li>
            <li>Use the service to harass, stalk, or harm others</li>
            <li>Attempt to circumvent usage limits or security measures</li>
            <li>Resell or redistribute the service without permission</li>
            <li>Use the service for any illegal purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Payment Terms
          </h2>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>
              Payments are processed securely by Stripe
            </li>
            <li>
              Subscriptions renew automatically unless cancelled
            </li>
            <li>
              <strong>30-day money-back guarantee:</strong> If you&apos;re not
              satisfied within 30 days of your first payment, contact us for a
              full refund
            </li>
            <li>
              Refunds after the 30-day period are provided at our discretion
            </li>
            <li>
              We may change pricing with 30 days notice to existing customers
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Service Availability
          </h2>
          <p>
            We strive to maintain high uptime but do not guarantee uninterrupted
            service. We may modify, suspend, or discontinue features with
            reasonable notice. Scheduled maintenance will be communicated in
            advance when possible.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Termination
          </h2>
          <p>
            You can cancel anytime through your account settings or by
            contacting us. We may suspend or terminate accounts that violate
            these terms. Upon termination, your access ends and we may delete
            your data after a reasonable period.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Limitation of Liability
          </h2>
          <p>
            Loupe is provided &quot;as is&quot; without warranties of any kind. We are
            not liable for any indirect, incidental, or consequential damages
            arising from your use of the service. Our total liability is limited
            to the amount you paid us in the 12 months preceding any claim.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Changes to These Terms
          </h2>
          <p>
            We may update these terms from time to time. Material changes will
            be communicated via email or through the service. Continued use
            after changes constitutes acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Governing Law
          </h2>
          <p>
            These terms are governed by Texas law. Any disputes will be resolved
            in Travis County, Texas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-medium text-text-primary mb-4">
            Contact
          </h2>
          <p className="mb-4">
            Questions about these terms? Reach out:
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
