"use client";

import { useState, useEffect } from "react";

const categories = [
  {
    label: "Build with",
    tools: ["Lovable", "Bolt", "Cursor", "v0", "Replit"],
  },
  {
    label: "Deploy to",
    tools: ["Vercel", "Netlify", "Cloudflare", "Railway"],
  },
  {
    label: "Track with",
    tools: ["PostHog", "Google Analytics", "Supabase", "Mixpanel"],
  },
];

export default function WorksWithStrip() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setActiveIndex((prev) => (prev + 1) % categories.length);
        setIsAnimating(false);
      }, 200);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const current = categories[activeIndex];

  return (
    <section className="bg-ink-900 py-6 md:py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          {/* Category label */}
          <span
            className={`text-ink-300 text-sm font-medium uppercase tracking-[0.1em] transition-opacity duration-200 ${
              isAnimating ? "opacity-0" : "opacity-100"
            }`}
          >
            {current.label}
          </span>

          {/* Divider on desktop */}
          <span className="hidden md:block w-px h-4 bg-ink-700" />

          {/* Tools list */}
          <div
            className={`flex flex-wrap items-center justify-center gap-x-2 md:gap-x-3 gap-y-2 transition-all duration-200 ${
              isAnimating ? "opacity-0 translate-y-1" : "opacity-100 translate-y-0"
            }`}
          >
            {current.tools.map((tool, i) => (
              <span key={tool} className="flex items-center">
                <span className="text-white/90 text-sm md:text-base font-medium">
                  {tool}
                </span>
                {i < current.tools.length - 1 && (
                  <span className="text-ink-500 ml-2 md:ml-3">·</span>
                )}
              </span>
            ))}
          </div>
        </div>

        {/* Category dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {categories.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsAnimating(true);
                setTimeout(() => {
                  setActiveIndex(i);
                  setIsAnimating(false);
                }, 200);
              }}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === activeIndex
                  ? "bg-coral w-4"
                  : "bg-ink-500 w-1.5 hover:bg-ink-300"
              }`}
              aria-label={`Show ${categories[i].label} tools`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
