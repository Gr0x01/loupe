interface Benefit {
  /** Icon component or JSX */
  icon: React.ReactNode;
  /** Benefit title */
  title: string;
  /** Benefit description */
  description: string;
}

interface BenefitGridProps {
  /** Section headline */
  headline?: string;
  /** Array of 3 benefits to display */
  benefits: Benefit[];
  /** Use dark section styling */
  dark?: boolean;
}

export default function BenefitGrid({
  headline,
  benefits,
  dark = false,
}: BenefitGridProps) {
  const sectionClass = dark ? "section-dark px-4 py-20" : "px-4 py-20";
  const headlineColor = dark ? "#F5F5F7" : undefined;
  const titleColor = dark ? "#F5F5F7" : undefined;
  const descColor = dark ? "rgba(245, 245, 247, 0.7)" : undefined;

  return (
    <section className={sectionClass}>
      <div className="w-full max-w-5xl mx-auto">
        {headline && (
          <div className="mb-14 text-center">
            <h2
              className="text-[clamp(2rem,4vw,3rem)] leading-tight"
              style={{
                fontFamily: "var(--font-display)",
                color: headlineColor,
              }}
            >
              {headline}
            </h2>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {benefits.map((benefit, i) => (
            <div key={i} className="text-center md:text-left">
              <div className="mb-5 flex justify-center md:justify-start">
                {benefit.icon}
              </div>
              <h3
                className="text-xl font-bold mb-2"
                style={{ color: titleColor }}
              >
                {benefit.title}
              </h3>
              <p
                className="text-base leading-relaxed"
                style={{ color: descColor }}
              >
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
