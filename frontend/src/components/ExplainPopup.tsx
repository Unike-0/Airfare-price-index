import React, { useState } from "react";
import { HelpCircle, X, Info } from "lucide-react";

interface ExplainPopupProps {
  title: string;
  explanation: string;
  example?: string;
}

export default function ExplainPopup({ title, explanation, example }: ExplainPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full transition-colors ml-2"
        title="Click to read a simple 1-sentence explanation"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Explain this</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-md w-full relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Info className="w-5 h-5" />
                <span>{title}</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed">{explanation}</p>

            {example && (
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-400">
                <strong className="text-amber-400 block mb-1">Simple Example:</strong>
                {example}
              </div>
            )}

            <button
              onClick={() => setIsOpen(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Got it, thanks!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
