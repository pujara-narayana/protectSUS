"use client";

import {
  Github,
  ChevronRight,
  Users,
  TrendingUp,
  Code,
} from "lucide-react";

const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Header = () => (
  <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
    <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
      <div className="flex items-center justify-between h-16">
        <button
          onClick={() => scrollToSection('hero')}
          className="flex items-center gap-2 text-xl text-white hover:text-blue-400 transition-colors"
        >
          ProtectSUS
        </button>
        <nav className="flex items-center gap-8">
          <button
            onClick={() => scrollToSection('features')}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Features
          </button>
          <button
            onClick={() => scrollToSection('demo')}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Demo
          </button>
          <button
            onClick={() => scrollToSection('pricing')}
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Pricing
          </button>
          <a
            href="https://devpost.com/software/protetsus?ref_content=user-portfolio&ref_feature=in_progress" // Replace with your actual Devpost URL
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white transition-colors"
          >
            Devpost
          </a>
        </nav>
      </div>
    </div>
  </header>
);

const LandingPage = ({ onSignIn }: { onSignIn: () => void }) => (
    <div className="min-h-screen bg-[#0A0F1F]">
      <Header />
      <div id="hero" className="relative h-screen overflow-hidden">
        {/* Centered Asset */}
        <div className="absolute inset-0 flex items-center justify-center">
          <img src="/hero-asset.png" alt="Hero" className="w-full max-w-5xl mx-auto" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 h-full">
            {/* Bottom Left */}
            <div className="absolute bottom-12 left-12">
                <h2 className="text-4xl md:text-5xl text-white leading-tight font-semibold">
                    Secure Your Code<br />
                    Base with <span className="text-blue-400">Agentic<br />Intelligence</span>
                </h2>
            </div>

            {/* Bottom Right */}
            <div className="absolute bottom-12 right-12 text-right">
                <p className="text-lg text-zinc-400 mb-6 max-w-xs">
                    ProtectSUS uses multi-agent debate to catch vulnerabilities before they deploy.
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
    <div id="features" className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16">
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
    <div id="demo" className="relative py-8 sm:py-16">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 blur-3xl"></div>
      <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 aspect-video flex items-center justify-center">
          <p className="text-zinc-500">[Demo Video Placeholder]</p>
        </div>
      </div>
    </div>
    <div id="pricing" className="py-8 sm:py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">Pricing</h2>
          <p className="text-xl text-zinc-400">Choose the plan that fits your needs</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
            <h3 className="text-2xl font-bold text-white mb-4">Free</h3>
            <div className="text-3xl font-bold text-blue-400 mb-6">$0</div>
            <ul className="space-y-3 text-zinc-300 mb-8">
              <li>• 5 audits per month</li>
              <li>• Basic vulnerability detection</li>
              <li>• Community support</li>
            </ul>
            <button onClick={onSignIn} className="w-full px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">
              Get Started
            </button>
          </div>
          <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border-2 border-blue-600 rounded-xl p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Pro</h3>
            <div className="text-3xl font-bold text-blue-400 mb-6">$49/mo</div>
            <ul className="space-y-3 text-zinc-300 mb-8">
              <li>• Unlimited audits</li>
              <li>• Advanced AI agents</li>
              <li>• Priority support</li>
              <li>• Market-weighted risk scores</li>
            </ul>
            <button onClick={onSignIn} className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-500 hover:to-indigo-500 transition-all duration-200">
              Start Free Trial
            </button>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
            <h3 className="text-2xl font-bold text-white mb-4">Enterprise</h3>
            <div className="text-3xl font-bold text-blue-400 mb-6">Custom</div>
            <ul className="space-y-3 text-zinc-300 mb-8">
              <li>• Custom integrations</li>
              <li>• Private deployment</li>
              <li>• Dedicated support</li>
              <li>• Custom AI models</li>
            </ul>
            <button onClick={onSignIn} className="w-full px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors">
              Contact Sales
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 hover:border-zinc-700 transition-colors">
    <div className="w-12 h-12 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-lg flex items-center justify-center mb-6">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
    <p className="text-zinc-400 leading-relaxed">{description}</p>
  </div>
);

export default LandingPage;
