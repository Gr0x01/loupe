import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1
          className="text-3xl text-text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Something went wrong
        </h1>
        <p className="text-text-secondary mb-8">
          We couldn&apos;t sign you in. The link may have expired or already
          been used.
        </p>
        <Link
          href="/login"
          className="btn-primary inline-block"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
