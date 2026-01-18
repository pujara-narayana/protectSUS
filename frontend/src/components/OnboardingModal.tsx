'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LLM_PROVIDERS = [
    {
        id: 'anthropic',
        name: 'Anthropic',
        model: 'Claude 3.5 Sonnet',
        description: 'Best for code analysis and security audits',
        keyPlaceholder: 'sk-ant-...'
    },
    {
        id: 'openai',
        name: 'OpenAI',
        model: 'GPT-4 Turbo',
        description: 'Versatile and powerful general-purpose AI',
        keyPlaceholder: 'sk-...'
    },
    {
        id: 'gemini',
        name: 'Google Gemini',
        model: 'Gemini Pro',
        description: 'Fast and efficient for code tasks',
        keyPlaceholder: 'AIza...'
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        model: 'Multiple Models',
        description: 'Access various models via one API',
        keyPlaceholder: 'sk-or-...'
    },
];

interface OnboardingModalProps {
    userId: string;
    userName?: string;
    onComplete: () => void;
}

export default function OnboardingModal({ userId, userName, onComplete }: OnboardingModalProps) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const provider = LLM_PROVIDERS.find(p => p.id === selectedProvider);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedProvider) {
            setError('Please select an LLM provider');
            return;
        }

        if (!apiKey.trim()) {
            setError('Please enter your API key');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/v1/user/settings?user_id=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    llm_provider: selectedProvider,
                    api_key: apiKey,
                }),
            });

            if (response.ok) {
                // Mark onboarding as complete
                localStorage.setItem('llm_onboarding_complete', 'true');
                onComplete();
            } else {
                throw new Error('Failed to save settings');
            }
        } catch (err) {
            setError('Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                            <Key className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Welcome{userName ? `, ${userName}` : ''}!</h2>
                            <p className="text-white/80 text-sm">One more step to get started</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-zinc-400 text-sm mb-6">
                        To use ProtectSUS for security audits, please provide your LLM API key.
                        This is required for AI-powered code analysis.
                    </p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Provider Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Select LLM Provider <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {provider ? (
                                    <div>
                                        <p className="text-white font-medium">{provider.name}</p>
                                        <p className="text-zinc-500 text-xs">{provider.model}</p>
                                    </div>
                                ) : (
                                    <span className="text-zinc-500">Choose a provider...</span>
                                )}
                                <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {dropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden">
                                    {LLM_PROVIDERS.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedProvider(p.id);
                                                setDropdownOpen(false);
                                                setApiKey('');
                                            }}
                                            className={`w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between ${selectedProvider === p.id ? 'bg-indigo-600/20' : ''
                                                }`}
                                        >
                                            <div>
                                                <p className="text-white font-medium">{p.name}</p>
                                                <p className="text-zinc-500 text-xs">{p.description}</p>
                                            </div>
                                            {selectedProvider === p.id && (
                                                <Check className="w-4 h-4 text-indigo-400" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* API Key Input */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                            API Key <span className="text-red-400">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={provider?.keyPlaceholder || 'Enter your API key'}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12"
                                disabled={!selectedProvider}
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                                {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        <p className="text-zinc-600 text-xs mt-2">
                            Your API key is encrypted and stored securely. We never share your keys.
                        </p>
                    </div>

                    {/* Help text */}
                    {selectedProvider && (
                        <div className="mb-6 p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg text-xs text-zinc-400">
                            <p className="font-medium text-zinc-300 mb-1">How to get your {provider?.name} API key:</p>
                            {selectedProvider === 'anthropic' && (
                                <p>Visit <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">console.anthropic.com</a> → Settings → API Keys</p>
                            )}
                            {selectedProvider === 'openai' && (
                                <p>Visit <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">platform.openai.com</a> → API Keys</p>
                            )}
                            {selectedProvider === 'gemini' && (
                                <p>Visit <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a> → Get API Key</p>
                            )}
                            {selectedProvider === 'openrouter' && (
                                <p>Visit <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">openrouter.ai</a> → Keys</p>
                            )}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={saving || !selectedProvider || !apiKey.trim()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                Get Started
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
