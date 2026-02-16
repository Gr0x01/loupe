import type { Metadata } from "next";
import PricingContent from "@/components/pricing/PricingContent";

export const metadata: Metadata = {
  title: "Pricing — Loupe",
  description:
    "Free, Pro, and Scale plans for founders who ship fast. Track pages, catch risky changes after deploy, and correlate changes to outcomes.",
};

export const dynamic = "force-static";

export default function PricingPage() {
  return <PricingContent />;
}
