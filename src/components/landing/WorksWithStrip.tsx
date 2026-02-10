"use client";

import Image from "next/image";

const groups = [
  {
    label: "Build",
    tools: [
      { name: "Lovable", src: "/logos/lovable.svg" },
      { name: "Bolt", src: "/logos/bolt.svg" },
      { name: "Cursor", src: "/logos/cursor.svg" },
      { name: "Replit", src: "/logos/replit.svg" },
    ],
  },
  {
    label: "Deploy",
    tools: [
      { name: "Vercel", src: "/logos/vercel.svg" },
      { name: "Netlify", src: "/logos/netlify.svg" },
      { name: "Cloudflare", src: "/logos/cloudflare.svg" },
      { name: "Railway", src: "/logos/railway.svg" },
    ],
  },
  {
    label: "Measure",
    tools: [
      { name: "PostHog", src: "/logos/posthog.svg" },
      { name: "Google Analytics", src: "/logos/ga4.svg" },
      { name: "Supabase", src: "/logos/supabase.svg" },
      { name: "Mixpanel", src: "/logos/mixpanel.svg" },
    ],
  },
];

export default function WorksWithStrip() {
  return (
    <section className="bg-ink-900 py-7 md:py-9 border-y border-white/10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-300">
            No stack migration
          </p>
          <h2
            className="mt-2 text-[clamp(1.4rem,2.8vw,2rem)] text-white leading-[1.15] tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Works with how you already ship
          </h2>
          <p className="mt-2 text-[0.98rem] text-ink-200 leading-relaxed">
            Start with one URL. Connect tools later for deeper correlation.
          </p>
          <p className="mt-1 text-sm text-ink-300">
            Build with AI tools, deploy anywhere, and track outcomes with your
            current analytics stack.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {groups.map((group) => (
            <div
              key={group.label}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-300">
                {group.label}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {group.tools.map((tool) => (
                  <div
                    key={tool.name}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5"
                    title={tool.name}
                  >
                    <div className="h-4 w-4 flex items-center justify-center shrink-0">
                      <Image
                        src={tool.src}
                        alt={tool.name}
                        width={16}
                        height={16}
                        className="h-3.5 w-3.5 object-contain brightness-0 invert opacity-90"
                      />
                    </div>
                    <span className="text-xs font-medium text-white leading-none whitespace-nowrap">
                      {tool.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-sm text-ink-300">
          GitHub deploy tracking is supported in-app for technical founders.
        </p>
      </div>
    </section>
  );
}
