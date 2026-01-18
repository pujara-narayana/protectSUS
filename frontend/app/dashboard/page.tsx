"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

import { Dashboard } from "@/features/dashboard/DashboardView";
import CommitSelection from "@/features/repo-explorer/CommitSelector";
import TerminalSpinner from "@/features/landing/TerminalSpinner";

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [selectedCommit, setSelectedCommit] = useState<any>(null);

  const handleSelectCommit = (repo: any, commit: any) => {
    setSelectedRepo(repo);
    setSelectedCommit(commit);
  };

  const handleBack = () => {
    setSelectedRepo(null);
    setSelectedCommit(null);
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "https://www.protectsus.tech/" });
  };

  if (status === "loading") {
    return <TerminalSpinner />;
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  if (selectedRepo && selectedCommit) {
    return (
      <Dashboard
        repo={selectedRepo}
        commit={selectedCommit}
        onBack={handleBack}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <CommitSelection
      onSelectCommit={handleSelectCommit}
      onSignOut={handleSignOut}
      session={session}
    />
  );
}
