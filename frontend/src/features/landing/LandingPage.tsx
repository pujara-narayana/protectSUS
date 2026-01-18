"use client";

import { useEffect, useState, useRef } from "react";
import {
  Github,
  ChevronRight,
  Users,
  TrendingUp,
  Code,
  Menu,
  X,
} from "lucide-react";

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: "smooth" });
  }
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    scrollToSection(sectionId);
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => handleNavClick("hero")}
            className="flex items-center gap-2 text-lg sm:text-xl text-white hover:text-blue-400 transition-colors flex-shrink-0"
          >
            ProtectSUS
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("features")}
              className="text-zinc-300 hover:text-white transition-colors text-sm lg:text-base"
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection("demo")}
              className="text-zinc-300 hover:text-white transition-colors text-sm lg:text-base"
            >
              Demo
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-zinc-300 hover:text-white transition-colors text-sm lg:text-base"
            >
              Pricing
            </button>
            <a
              href="https://devpost.com/software/protetsus?ref_content=user-portfolio&ref_feature=in_progress"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-300 hover:text-white transition-colors text-sm lg:text-base"
            >
              Devpost
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden flex items-center text-zinc-300 hover:text-white transition-colors flex-shrink-0"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <nav className="md:hidden pb-4 space-y-2 border-t border-zinc-800">
            <button
              onClick={() => handleNavClick("features")}
              className="block w-full text-left px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors rounded"
            >
              Features
            </button>
            <button
              onClick={() => handleNavClick("demo")}
              className="block w-full text-left px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors rounded"
            >
              Demo
            </button>
            <button
              onClick={() => handleNavClick("pricing")}
              className="block w-full text-left px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors rounded"
            >
              Pricing
            </button>
            <a
              href="https://devpost.com/software/protetsus?ref_content=user-portfolio&ref_feature=in_progress"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-left px-4 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/50 transition-colors rounded"
            >
              Devpost
            </a>
          </nav>
        )}
      </div>
    </header>
  );
};

const LandingPage = ({ onSignIn }: { onSignIn: () => void }) => {
  return (
    <div className="min-h-screen bg-[#0A0F1F]">
      <Header />
      <div
        id="hero"
        className="relative min-h-screen lg:h-screen overflow-hidden"
      >
        {/* Centered Asset - hidden on mobile, shown on desktop */}
        <div className="hidden lg:absolute lg:inset-0 lg:flex lg:items-center lg:justify-center lg:p-40">
          <img
            src="/hero-asset.png"
            alt="Hero"
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Mobile Layout - visible on mobile only */}
        <div className="lg:hidden flex flex-col items-center justify-center min-h-screen px-6 sm:px-8 py-20">
          <img
            src="/hero-asset.png"
            alt="Hero"
            className="w-full max-w-sm sm:max-w-md h-auto object-contain mb-8"
          />
          <div className="w-full text-center">
            <h2 className="text-3xl sm:text-4xl text-white leading-tight font-semibold mb-6">
              Secure Your Code
              <br />
              Base with{" "}
              <span className="text-blue-400">
                Agentic
                <br />
                Intelligence
              </span>
            </h2>
            <p className="text-base sm:text-lg text-zinc-400 mb-6 max-w-sm mx-auto">
              ProtectSUS uses multi-agent debate to catch vulnerabilities before
              they deploy.
            </p>
            <button
              onClick={onSignIn}
              className="group inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors text-sm sm:text-base"
            >
              <Github className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0" />
              <span className="hidden sm:inline">
                Connect with GitHub to Start Audit
              </span>
              <span className="sm:hidden">Start Audit</span>
              <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* Desktop Layout - original positioning */}
        <div className="hidden lg:relative lg:block max-w-7xl mx-auto px-12 h-full">
          {/* Bottom Left */}
          <div className="absolute bottom-12 left-12">
            <h2 className="text-4xl md:text-5xl text-white leading-tight font-semibold">
              Secure Your Code
              <br />
              Base with{" "}
              <span className="text-blue-400">
                Agentic
                <br />
                Intelligence
              </span>
            </h2>
          </div>

          {/* Bottom Right */}
          <div className="absolute bottom-12 right-12 text-right">
            <p className="text-lg text-zinc-400 mb-6 max-w-xs">
              ProtectSUS uses multi-agent debate to catch vulnerabilities before
              they deploy.
            </p>
            <button
              onClick={onSignIn}
              className="group inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors"
            >
              <Github className="w-5 h-5" />
              Connect with GitHub to Start Audit
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
      <div
        id="features"
        className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 blur-3xl"></div>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Users className="w-6 h-6 text-blue-400" />}
            title="Multi-Agent Debate"
            description="Adversarial agents analyze your code from attacker and defender perspectives."
          />
          <FeatureCard
            icon={<TrendingUp className="w-6 h-6 text-blue-400" />}
            title="Reinforcement Learning"
            description="Our agents synthesize, test, and open Pull Requests to patch vulnerabilities."
          />
          <FeatureCard
            icon={<Code className="w-6 h-6 text-blue-400" />}
            title="Instant IDE Feedback"
            description="Integrates directly into your workflow for continuous security."
          />
        </div>
      </div>
      <DemoSection />
      <div id="pricing" className="py-8 sm:py-16">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">Pricing</h2>
            <p className="text-xl text-zinc-400">
              Choose the plan that fits your needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              title="Free"
              price="$0"
              features={[
                "5 audits per month",
                "Basic vulnerability detection",
                "Community support",
              ]}
              buttonText="Get Started"
              onSignIn={onSignIn}
            />
            <PricingCard
              title="Pro"
              price="$49/mo"
              features={[
                "Unlimited audits",
                "Advanced AI agents",
                "Priority support",
                "Market-weighted risk scores",
              ]}
              buttonText="Start Free Trial"
              highlighted={true}
              onSignIn={onSignIn}
            />
            <PricingCard
              title="Enterprise"
              price="Custom"
              features={[
                "Custom integrations",
                "Private deployment",
                "Dedicated support",
                "Custom AI models",
              ]}
              buttonText="Contact Sales"
              onSignIn={onSignIn}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

const Footer = () => {
  return (
    <footer className="bg-zinc-950/80 border-t border-zinc-800">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-zinc-400">
            © {new Date().getFullYear()} ProtectSUS · Built for NexHacks 2026
          </p>
          <div className="flex gap-6 text-sm text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-white transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

const DemoSection = () => {
  const [offsetY, setOffsetY] = useState(0);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (demoRef.current) {
        const rect = demoRef.current.getBoundingClientRect();
        const scrollProgress =
          (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
        const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
        setOffsetY(clampedProgress);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll(); // Initial calculation
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      id="demo"
      className="relative py-8 sm:py-16 overflow-hidden"
      ref={demoRef}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 blur-3xl"></div>
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
        <div
          className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden aspect-video transition-transform duration-100 ease-out"
          style={{
            transform: `translateY(${(0.5 - offsetY) * 50}px) scale(${0.95 + offsetY * 0.05})`,
          }}
        >
          <iframe
            className="w-full h-full"
            src="https://www.youtube.com/embed/Obq2vTh7gec"
            title="ProtectSUS Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/20 hover:-translate-y-2 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      }`}
    >
      <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
};

const PricingCard = ({
  title,
  price,
  features,
  buttonText,
  highlighted = false,
  onSignIn,
}: {
  title: string;
  price: string;
  features: string[];
  buttonText: string;
  highlighted?: boolean;
  onSignIn: () => void;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className={`rounded-xl p-8 hover:-translate-y-3 hover:scale-105 transition-all duration-500 ${
        highlighted
          ? "bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-2 border-blue-600 hover:shadow-2xl hover:shadow-blue-600/30"
          : "bg-zinc-900/50 border border-zinc-800 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/20"
      } ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      style={{ transitionDelay: `${highlighted ? "100ms" : "0ms"}` }}
    >
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <div className="text-3xl font-bold text-blue-400 mb-6">{price}</div>
      <ul className="space-y-3 text-zinc-300 mb-8">
        {features.map((feature, index) => (
          <li key={index}>• {feature}</li>
        ))}
      </ul>
      <button
        onClick={onSignIn}
        className={`w-full px-6 py-3 text-white rounded-lg transition-all duration-200 ${
          highlighted
            ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:shadow-blue-600/50"
            : "bg-zinc-800 hover:bg-zinc-700"
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
};

export default LandingPage;
