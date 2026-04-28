import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loupe has shut down",
  description: "Loupe has shut down. Thanks to everyone who tried it.",
};

export default function Home() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-24">
      <div className="max-w-md text-center">
        <h1
          className="text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.2] tracking-[-0.02em] text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Loupe has shut down.
        </h1>
        <p className="text-lg text-text-secondary mt-4 leading-[1.6]">
          Thanks to everyone who tried it.
        </p>
      </div>
    </div>
  );
}
