import Image from "next/image";

const tools = [
  { name: "Lovable", src: "/logos/lovable.svg" },
  { name: "Bolt", src: "/logos/bolt-color.svg" },
  { name: "Cursor", src: "/logos/cursor-color.svg" },
  { name: "Replit", src: "/logos/replit-color.svg" },
  { name: "Vercel", src: "/logos/vercel-color.svg" },
];

export default function TribeSignal() {
  return (
    <div className="mt-6 landing-hero-tribe">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
        Built for founders shipping with
      </p>
      <div className="mt-2.5 flex items-center gap-5">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity duration-150"
            title={tool.name}
          >
            <Image
              src={tool.src}
              alt={tool.name}
              width={20}
              height={20}
              className="h-5 w-5 object-contain"
            />
            <span className="text-sm font-medium text-text-secondary hidden sm:inline">
              {tool.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
