'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Settings, LogOut, Key, X, Eye, EyeOff, ChevronDown, Check, Loader2 } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LLM_PROVIDERS = [
    { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Claude 3.5 Sonnet' },
    { id: 'openai', name: 'OpenAI (GPT-4)', description: 'GPT-4 Turbo' },
    { id: 'gemini', name: 'Google Gemini', description: 'Gemini Pro' },
    { id: 'openrouter', name: 'OpenRouter', description: 'Multiple Models' },
];

interface SettingsDropdownProps {
    userId: string;
    onSignOut: () => void;
}

export default function SettingsDropdown({ userId, onSignOut }: SettingsDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Settings state
    const [llmProvider, setLlmProvider] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [hasApiKey, setHasApiKey] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [dropdownProviderOpen, setDropdownProviderOpen] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

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
        if (showModal) {
            fetchSettings();
        }
    }, [showModal, fetchSettings]);

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
                setTimeout(() => {
                    setShowModal(false);
                    setMessage(null);
                }, 1500);
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    const selectedProvider = LLM_PROVIDERS.find(p => p.id === llmProvider);

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Settings Gear Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                title="Settings"
            >
                <Settings className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="py-1">
                        <button
                            onClick={() => {
                                setShowModal(true);
                                setIsOpen(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                        >
                            <Key className="w-4 h-4" />
                            LLM Settings
                        </button>
                        <div className="border-t border-zinc-800 my-1"></div>
                        <button
                            onClick={onSignOut}
                            className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-zinc-800 flex items-center gap-3 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Settings className="w-5 h-5 text-white" />
                                <h2 className="text-lg font-semibold text-white">LLM Settings</h2>
                            </div>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setMessage(null);
                                }}
                                className="text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {message && (
                                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success'
                                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                                        : 'bg-red-500/10 border border-red-500/30 text-red-400'
                                    }`}>
                                    {message.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {message.text}
                                </div>
                            )}

                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-5">
                                    {/* Provider Dropdown */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            LLM Provider
                                        </label>
                                        <div className="relative">
                                            <button
                                                onClick={() => setDropdownProviderOpen(!dropdownProviderOpen)}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-zinc-600 transition-colors"
                                            >
                                                {selectedProvider ? (
                                                    <div>
                                                        <p className="text-white text-sm">{selectedProvider.name}</p>
                                                        <p className="text-zinc-500 text-xs">{selectedProvider.description}</p>
                                                    </div>
                                                ) : (
                                                    <span className="text-zinc-500 text-sm">Select a provider...</span>
                                                )}
                                                <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${dropdownProviderOpen ? 'rotate-180' : ''}`} />
                                            </button>

                                            {dropdownProviderOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-10 overflow-hidden max-h-60 overflow-y-auto">
                                                    {LLM_PROVIDERS.map((provider) => (
                                                        <button
                                                            key={provider.id}
                                                            onClick={() => {
                                                                setLlmProvider(provider.id);
                                                                setDropdownProviderOpen(false);
                                                            }}
                                                            className={`w-full px-4 py-3 text-left hover:bg-zinc-700 transition-colors flex items-center justify-between ${llmProvider === provider.id ? 'bg-indigo-600/20' : ''
                                                                }`}
                                                        >
                                                            <div>
                                                                <p className="text-white text-sm">{provider.name}</p>
                                                                <p className="text-zinc-500 text-xs">{provider.description}</p>
                                                            </div>
                                                            {llmProvider === provider.id && (
                                                                <Check className="w-4 h-4 text-indigo-400" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* API Key Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-zinc-300 mb-2">
                                            API Key {hasApiKey && <span className="text-emerald-400 text-xs">(Saved)</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showApiKey ? 'text' : 'password'}
                                                value={apiKey}
                                                onChange={(e) => setApiKey(e.target.value)}
                                                placeholder={hasApiKey ? '••••••••••••••••' : 'Enter new API key'}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-12 text-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowApiKey(!showApiKey)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                            >
                                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                        <p className="text-zinc-600 text-xs mt-2">
                                            Leave blank to keep existing key. Enter new key to update.
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 pt-2">
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-zinc-700 disabled:to-zinc-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowModal(false);
                                                setMessage(null);
                                            }}
                                            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-semibold transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
