"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import {
  Github,
  Users,
  TrendingUp,
  Code,
  Bot,
  Shield,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Sparkles,
  LogOut,
  ChevronLeft,
  Search,
  Loader2,
  GitCommit,
} from "lucide-react";
import { getRepos, getCommits } from "@/lib/github";
import LandingPage from "@/features/landing/LandingPage";
import CommitSelection from "@/features/repo-explorer/CommitSelector";
import { Dashboard } from "@/features/dashboard/DashboardView";

// ============================================================================
// Main Page Component
// ============================================================================

export default function Page() {
  const { status, data: session } = useSession();
  const [view, setView] = useState("landing");
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [selectedCommit, setSelectedCommit] = useState<any>(null);

  // History management to sync view state with browser navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        setView(event.state.view);
        // Reset selections when going back to explorer
        if (event.state.view === 'explorer') {
          setSelectedCommit(null);
          setSelectedRepo(null);
        }
      } else {
        // Default to landing if no state is present (e.g., initial load)
        setView(status === 'authenticated' ? 'explorer' : 'landing');
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [status]);

  // Automatically transition view based on authentication status
  useEffect(() => {
    if (status === "authenticated" && view === "landing") {
      setView("explorer");
      window.history.pushState({ view: "explorer" }, "", "/explorer");
    } else if (status === "unauthenticated" && view !== "landing") {
      setView("landing");
      window.history.pushState({ view: "landing" }, "", "/");
    }
  }, [status, view]);

  const handleSignIn = () => {
    signIn("github");
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  const handleSelectCommit = (repo: any, commit: any) => {
    setSelectedRepo(repo);
    setSelectedCommit(commit);
    setView("dashboard");
    window.history.pushState({ view: "dashboard" }, "", "/dashboard");
  };

  const handleBack = () => {
    window.history.back();
  };

  // Render loading state
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Loader2 className="animate-spin h-12 w-12 text-white" />
      </div>
    );
  }

  // Render views based on state
  if (view === "landing") {
    return <LandingPage onSignIn={handleSignIn} />;
  }

  if (view === "explorer") {
    return (
      <CommitSelection
        onSelectCommit={handleSelectCommit}
        onSignOut={handleSignOut}
        session={session}
      />
    );
  }

  if (view === "dashboard" && selectedRepo && selectedCommit) {
    return (
      <Dashboard
        repo={selectedRepo}
        commit={selectedCommit}
        onBack={handleBack}
        onSignOut={handleSignOut}
      />
    );
  }

  // Fallback to landing if state is inconsistent
  return <LandingPage onSignIn={handleSignIn} />;
}

