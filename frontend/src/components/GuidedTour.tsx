import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, X, Check, Compass, Plane, MessageCircle, HelpCircle } from "lucide-react";

export default function GuidedTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Auto show on first visit
    const hasVisited = localStorage.getItem("apix_tour_seen");
    if (!hasVisited) {
      setIsOpen(true);
    }
  }, []);

  const tourSteps = [
    {
      title: "1. Today's Flight Score",
      icon: <Plane className="w-6 h-6 text-amber-400" />,
      content:
        "This headline score tracks real Indian domestic airfares every day. A score of 100 is normal; above 100 means flights are currently pricier than average.",
      highlight: "Headline Score Card",
    },
    {
      title: "2. Best Time to Book Advice",
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      content:
        "Check our advance purchase curves to see when fares hit their sweet spot (usually 21–28 days in advance). Avoid booking within 3 days of departure!",
      highlight: "Smart Advisor & Lead Time Curve",
    },
    {
      title: "3. Inspect Any Flight Route",
      icon: <Compass className="w-6 h-6 text-sky-400" />,
      content:
        "Select your origin and destination city to see daily fare trends, cost per kilometer (₹/km), and instant 'Book Now →' deep-links to complete your booking.",
      highlight: "Route Inspector & Fare Map",
    },
    {
      title: "4. In-Site Chat Helper",
      icon: <MessageCircle className="w-6 h-6 text-purple-400" />,
      content:
        "Click the floating plane icon in the bottom-right corner anytime to ask quick questions about flight prices or cheap booking tips!",
      highlight: "Bottom-Right Chatbot Widget",
    },
  ];

  const handleFinish = () => {
    localStorage.setItem("apix_tour_seen", "true");
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger button in header or banner */}
      <button
        onClick={() => {
          setStep(0);
          setIsOpen(true);
        }}
        className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Take Guided Tour</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-lg w-full relative space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-2xl">
                  {tourSteps[step].icon}
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">
                    Step {step + 1} of {tourSteps.length}
                  </span>
                  <h3 className="text-lg font-bold text-white">{tourSteps[step].title}</h3>
                </div>
              </div>
              <button
                onClick={handleFinish}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-200 text-sm leading-relaxed">{tourSteps[step].content}</p>

            <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl text-xs text-slate-400 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Feature location: <strong>{tourSteps[step].highlight}</strong></span>
            </div>

            {/* Step Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleFinish}
                className="text-xs text-slate-400 hover:text-white font-medium"
              >
                Skip Tour
              </button>

              <div className="flex items-center space-x-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800"
                  >
                    Back
                  </button>
                )}
                {step < tourSteps.length - 1 ? (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinish}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 shadow-md"
                  >
                    <span>Start Exploring</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
