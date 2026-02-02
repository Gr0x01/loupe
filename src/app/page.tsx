"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/analysis/${data.id}`);
    } catch {
      setError("Failed to start analysis. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center px-4">
      <main className="w-full max-w-2xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight">
          See what your page is really saying
        </h1>
        <p className="text-lg text-gray-500 mt-4 max-w-lg mx-auto">
          Enter a URL. Get a detailed analysis of your marketing, design, and
          conversion quality.
        </p>

        <form onSubmit={handleSubmit} className="mt-12">
          <div className="flex flex-col sm:flex-row items-stretch gap-3 bg-white border border-gray-200 rounded-lg shadow-sm p-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 bg-transparent border-0 outline-none text-gray-900 placeholder-gray-400 text-base px-2 py-2"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-6 py-2.5 bg-gray-900 text-white font-medium rounded-md hover:bg-gray-800 active:bg-gray-950 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 whitespace-nowrap"
            >
              {loading ? "Starting..." : "Analyze my page"}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </form>

        <p className="text-sm text-gray-400 mt-6">
          Free. No signup required. Results in about a minute.
        </p>
      </main>
    </div>
  );
}
