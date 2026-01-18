"use client";

import { useState, useEffect } from 'react';

const lines = [
  'Booting protectSUS kernel...', 
  'Loading agentic models...', 
  'Calibrating market sentiment...', 
  'Initializing security protocols...', 
  'Establishing secure connection...', 
  'Compiling smart contract ABI...', 
  'Analyzing bytecode...',
  'Running simulation...',
  'Finalizing audit report...',
  'Done.',
];

const TerminalSpinner = () => {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setVisibleLines(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-full max-w-md bg-[#0d1117] rounded-lg p-6 font-mono text-sm text-blue-400 border border-zinc-800 shadow-2xl shadow-blue-500/10">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
          <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
        </div>
        <div className="h-48 overflow-y-auto">
          {visibleLines.map((line, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <p className="whitespace-pre-wrap animate-fadeIn">{line}</p>
            </div>
          ))}
          {visibleLines.length < lines.length && (
            <div className="flex items-center gap-2">
              <span className="text-zinc-500">$</span>
              <span className="w-2 h-4 bg-blue-400 animate-blink"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TerminalSpinner;
