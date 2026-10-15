import type { Metadata } from "next";
import LandingPage from "@/features/landing/LandingPage";

export const metadata: Metadata = {
  title: "ProtectSUS — API maintenance and security review",
  description:
    "Understand your API integrations, follow upstream changes, and review evidence-backed patches and security findings in one workspace.",
  alternates: { canonical: "https://www.protectsus.tech/" },
  openGraph: {
    title: "ProtectSUS — Stay ahead of API changes",
    description: "API maintenance and security review, grounded in your code.",
    url: "https://www.protectsus.tech/",
    siteName: "ProtectSUS",
    type: "website",
  },
};

export default function Page() {
  return <LandingPage />;
}
