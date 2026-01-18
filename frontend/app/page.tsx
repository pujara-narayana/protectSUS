"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import LandingPage from "@/features/landing/LandingPage";
import TerminalSpinner from "@/features/landing/TerminalSpinner";

export default function Page() {
  const { status } = useSession();
  const router = useRouter();

  const handleSignIn = () => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      signIn("github", { callbackUrl: "https://www.protectsus.tech/dashboard" });
    }
  };

  if (status === "loading") {
    return <TerminalSpinner />;
  }

  return <LandingPage onSignIn={handleSignIn} />;
}

