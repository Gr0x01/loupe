"use client";

interface LoupeLogoProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

/**
 * Loupe logomark - A jeweler's loupe with a subtle "eye" reflection
 * The reflection dot suggests watchfulness without being literal
 *
 * When animate=true, hovering the parent triggers a "blink" on the eye dot
 */
export default function LoupeLogo({ size = 24, className = "", animate = false }: LoupeLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animate ? "loupe-logo-animate" : ""} ${className}`}
      aria-hidden="true"
    >
      {/* Loupe lens - outer ring */}
      <circle
        cx="10"
        cy="10"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />

      {/* Loupe lens - inner glass with subtle fill */}
      <circle
        cx="10"
        cy="10"
        r="5"
        fill="currentColor"
        fillOpacity="0.08"
      />

      {/* The "eye" - reflection/pupil that watches */}
      <circle
        cx="10"
        cy="10"
        r="1.5"
        fill="currentColor"
        className="loupe-eye"
        style={{ transformOrigin: "10px 10px" }}
      />

      {/* Handle */}
      <line
        x1="15"
        y1="15"
        x2="21"
        y2="21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
