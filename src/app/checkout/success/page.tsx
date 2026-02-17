import Link from "next/link";

export const metadata = {
  title: "You're all set — Loupe",
};

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-10">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-accent transition-colors"
          >
            &larr; Back to Loupe
          </Link>
        </div>

        <div className="glass-card-elevated p-8">
          <h1
            className="text-3xl text-text-primary tracking-tight mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            You&apos;re all set.
          </h1>
          <p className="text-text-secondary mb-6">
            Check your email for a sign-in link to get started.
          </p>
          <Link
            href="/login"
            className="text-signal text-sm font-medium hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
