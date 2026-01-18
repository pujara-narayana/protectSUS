"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";

import { Dashboard } from "@/features/dashboard/DashboardView";
import CommitSelection from "@/features/repo-explorer/CommitSelector";
import TerminalSpinner from "@/features/landing/TerminalSpinner";
import OnboardingModal from "@/components/OnboardingModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [selectedCommit, setSelectedCommit] = useState<any>(null);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  const userId = (session?.user as any)?.id || "";
  const userName = session?.user?.name?.split(' ')[0] || "";

  // Check if user has completed onboarding
  const checkOnboarding = useCallback(async () => {
    if (!userId) {
      setCheckingOnboarding(false);
      return;
    }

    // Check local storage first for faster UX
    const localComplete = localStorage.getItem('llm_onboarding_complete');
    if (localComplete === 'true') {
      setShowOnboarding(false);
      setCheckingOnboarding(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/v1/user/settings?user_id=${userId}`);
      if (response.ok) {
        const data = await response.json();
        // Show onboarding if no LLM provider or API key set
        if (!data.llm_provider || !data.has_api_key) {
          setShowOnboarding(true);
        } else {
          // User has completed setup, save to localStorage
          localStorage.setItem('llm_onboarding_complete', 'true');
          setShowOnboarding(false);
        }
      } else {
        // If we can't check, show onboarding to be safe
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Show onboarding if we can't verify
      setShowOnboarding(true);
    } finally {
      setCheckingOnboarding(false);
    }
  }, [userId]);

  useEffect(() => {
    if (status === 'authenticated') {
      checkOnboarding();
    }
  }, [status, checkOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('llm_onboarding_complete', 'true');
  };

  const handleSelectCommit = (repo: any, commit: any) => {
    setSelectedRepo(repo);
    setSelectedCommit(commit);
  };

  const handleBack = () => {
    setSelectedRepo(null);
    setSelectedCommit(null);
  };

  const handleSignOut = () => {
    // Clear onboarding state on sign out
    localStorage.removeItem('llm_onboarding_complete');
    signOut({ callbackUrl: "https://www.protectsus.tech/" });
  };

  if (status === "loading" || checkingOnboarding) {
    return <TerminalSpinner />;
  }

  if (status === "unauthenticated") {
    redirect("/");
  }

  // Show onboarding modal if user hasn't set up LLM provider
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <OnboardingModal
          userId={userId}
          userName={userName}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
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
