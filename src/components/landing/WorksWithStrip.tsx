"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const categories = [
  {
    label: "Build with",
    tools: [
      { name: "Lovable", src: "/logos/lovable.svg" },
      { name: "Bolt", src: "/logos/bolt.svg" },
      { name: "Cursor", src: "/logos/cursor.svg" },
      { name: "Replit", src: "/logos/replit.svg" },
    ],
  },
  {
    label: "Deploy to",
    tools: [
      { name: "Vercel", src: "/logos/vercel.svg" },
      { name: "Netlify", src: "/logos/netlify.svg" },
      { name: "Cloudflare", src: "/logos/cloudflare.svg" },
      { name: "Railway", src: "/logos/railway.svg" },
    ],
  },
  {
    label: "Track with",
    tools: [
      { name: "PostHog", src: "/logos/posthog.svg" },
      { name: "Google Analytics", src: "/logos/ga4.svg" },
      { name: "Supabase", src: "/logos/supabase.svg" },
      { name: "Mixpanel", src: "/logos/mixpanel.svg" },
    ],
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
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const current = categories[activeIndex];

  return (
    <section className="bg-ink-900 py-8 md:py-10">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col items-center gap-5">
          {/* Category label */}
          <span
            className={`text-ink-300 text-sm font-semibold uppercase tracking-[0.12em] transition-opacity duration-200 ${
              isAnimating ? "opacity-0" : "opacity-100"
            }`}
          >
            {current.label}
          </span>

          {/* Logos row */}
          <div
            className={`flex items-center justify-center gap-8 md:gap-12 transition-all duration-200 ${
              isAnimating ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
            }`}
          >
            {current.tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-center justify-center h-8 md:h-10"
                title={tool.name}
              >
                <Image
                  src={tool.src}
                  alt={tool.name}
                  width={100}
                  height={40}
                  className="h-6 md:h-8 w-auto max-w-[100px] md:max-w-[120px] object-contain brightness-0 invert opacity-80 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>

          {/* Category dots */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {categories.map((cat, i) => (
              <button
                key={cat.label}
                onClick={() => {
                  setIsAnimating(true);
                  setTimeout(() => {
                    setActiveIndex(i);
                    setIsAnimating(false);
                  }, 200);
                }}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === activeIndex
                    ? "bg-signal w-5"
                    : "bg-ink-600 w-1.5 hover:bg-ink-400"
                }`}
                aria-label={`Show ${cat.label} tools`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
