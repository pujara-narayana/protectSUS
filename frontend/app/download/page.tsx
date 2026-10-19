import type { Metadata } from "next";
import DownloadPage from "@/features/landing/DownloadPage";

export const metadata: Metadata = {
  title: "Download ProtectSUS for Mac and Windows",
  description: "Get the ProtectSUS desktop app for Mac (Apple Silicon or Intel) or Windows. The right installer is picked for your computer.",
  alternates: { canonical: "https://www.protectsus.tech/download" },
};

export default function Page() {
  return <DownloadPage />;
}
