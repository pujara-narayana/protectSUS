'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { redirect } from 'next/navigation';
import {
    Settings, LogOut, Save, Key, Eye, EyeOff, Check, AlertCircle,
    Loader2, ChevronDown, Trash2, Shield
} from 'lucide-react';
import TerminalSpinner from '@/features/landing/TerminalSpinner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LLM_PROVIDERS = [
    { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Claude 3.5 Sonnet - Best for code analysis' },
    { id: 'openai', name: 'OpenAI (GPT-4)', description: 'GPT-4 Turbo - Versatile and powerful' },
    { id: 'gemini', name: 'Google Gemini', description: 'Gemini Pro - Fast and efficient' },
    { id: 'openrouter', name: 'OpenRouter', description: 'Access multiple models via one API' },
];

export default function SettingsPage() {
    const { status, data: session } = useSession();
    const userId = (session?.user as any)?.id || "";

    // Settings state
    const [llmProvider, setLlmProvider] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // UI state
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Fetch user settings
    const fetchSettings = useCallback(async () => {
        if (!userId) return;

        try {
            const response = await fetch(`${API_URL}/api/v1/user/settings?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setLlmProvider(data.llm_provider);
                setHasApiKey(data.has_api_key);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Save settings
    const handleSave = async () => {
        if (!userId) return;

        setSaving(true);
        setMessage(null);

        try {
            const body: any = {};
            if (llmProvider) body.llm_provider = llmProvider;
            if (apiKey) body.api_key = apiKey;

            const response = await fetch(`${API_URL}/api/v1/user/settings?user_id=${userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Settings saved successfully!' });
                if (apiKey) {
                    setHasApiKey(true);
                    setApiKey('');
                }
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Delete API key
    const handleDeleteApiKey = async () => {
        if (!userId) return;

        setDeleting(true);
        setMessage(null);

        try {
            const response = await fetch(`${API_URL}/api/v1/user/settings/api-key?user_id=${userId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setHasApiKey(false);
                setMessage({ type: 'success', text: 'API key removed successfully!' });
            } else {
                throw new Error('Failed to delete');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to remove API key.' });
        } finally {
            setDeleting(false);
        }
    };

    const handleSignOut = () => {
        signOut({ callbackUrl: '/' });
    };

    if (status === 'loading') {
        return <TerminalSpinner />;
    }

    if (status === 'unauthenticated') {
        redirect('/');
    }

    const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmProvider);

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Settings className="w-6 h-6 text-indigo-500" />
                            <div>
                                <h1 className="text-lg font-semibold text-white">Settings</h1>
                                <p className="text-xs text-zinc-500">Manage your preferences</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="/dashboard" className="text-zinc-400 hover:text-white text-sm transition-colors">
                                Dashboard
                            </a>
                            <a href="/graphs" className="text-zinc-400 hover:text-white text-sm transition-colors">
                                Graphs
                            </a>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
                {/* Message Banner */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/10 border border-red-500/30 text-red-400'
                        }`}>
                        {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p className="text-sm">{message.text}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Account Section */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-500" />
                                Account
                            </h2>

                            <div className="flex items-center justify-between py-4 border-b border-zinc-800">
                                <div>
                                    <p className="text-white font-medium">{session?.user?.name || 'User'}</p>
                                    <p className="text-zinc-500 text-sm">{session?.user?.email || 'No email'}</p>
                                </div>
                                <img
                                    src={session?.user?.image || '/default-avatar.png'}
                                    alt="Avatar"
                                    className="w-12 h-12 rounded-full border-2 border-zinc-700"
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    onClick={handleSignOut}
                                    className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-sm">Sign out</span>
                                </button>
                            </div>
                        </section>

                        {/* LLM Provider Section */}
                        <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Key className="w-5 h-5 text-indigo-500" />
                                LLM Provider
                            </h2>
                            <p className="text-zinc-500 text-sm mb-4">
                                Choose which AI model to use for code analysis. You can use the default (Anthropic) or provide your own API key.
                            </p>

                            {/* Provider Dropdown */}
                            <div className="relative mb-6">
                                <label className="block text-sm text-zinc-400 mb-2">Select Provider</label>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-zinc-600 transition-colors"
                                >
                                    <div>
                                        <p className="text-white">{selectedProvider?.name || 'Select a provider'}</p>
                                        {selectedProvider && (
                                            <p className="text-zinc-500 text-xs">{selectedProvider.description}</p>
                                        )}
                                    </div>
                                    <ChevronDown className={`w-5 h-5 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {dropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden">
                                        {LLM_PROVIDERS.map((provider) => (
                                            <button
                                                key={provider.id}
                                                onClick={() => {
                                                    setLlmProvider(provider.id);
                                                    setDropdownOpen(false);
                                                }}
                                                className={`w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors ${llmProvider === provider.id ? 'bg-indigo-600/20 border-l-2 border-indigo-500' : ''
                                                    }`}
                                            >
                                                <p className="text-white">{provider.name}</p>
                                                <p className="text-zinc-500 text-xs">{provider.description}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* API Key Input */}
                            <div className="mb-6">
                                <label className="block text-sm text-zinc-400 mb-2">
                                    API Key {hasApiKey && <span className="text-emerald-400">(Saved)</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showApiKey ? 'text' : 'password'}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-24"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                            className="text-zinc-500 hover:text-zinc-300"
                                        >
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                        {hasApiKey && (
                                            <button
                                                type="button"
                                                onClick={handleDeleteApiKey}
                                                disabled={deleting}
                                                className="text-red-400 hover:text-red-300"
                                                title="Remove API key"
                                            >
                                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-zinc-600 text-xs mt-2">
                                    Your API key is encrypted and stored securely. Leave blank to use the system default.
                                </p>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Settings
                                    </>
                                )}
                            </button>
                        </section>

                        {/* Danger Zone */}
                        <section className="bg-red-500/5 border border-red-500/20 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                            <p className="text-zinc-500 text-sm mb-4">
                                These actions are irreversible. Please proceed with caution.
                            </p>
                            <button
                                onClick={handleSignOut}
                                className="flex items-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-medium transition-colors border border-red-500/30"
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
