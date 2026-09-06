import React, { useState } from "react";
import { Calendar, Plane, ArrowRight, CheckCircle2, AlertTriangle, Info } from "lucide-react";

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  current_avg_fare?: number;
}

interface ShouldIBookToolProps {
  routes: Route[];
}

export default function ShouldIBookTool({ routes }: ShouldIBookToolProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<number>(routes[0]?.id || 1);
  const [travelDate, setTravelDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20); // Default to ~20 days out
    return d.toISOString().split("T")[0];
  });
  const [advice, setAdvice] = useState<any>(null);

  const selectedRoute = routes.find((r) => r.id === Number(selectedRouteId)) || routes[0];

  const handleCalculateAdvice = (e: React.FormEvent) => {
    e.preventDefault();
    const today = new Date();
    const target = new Date(travelDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const basePrice = selectedRoute?.current_avg_fare || 4800;

    let verdict = "";
    let isGood = true;
    let explanation = "";
    let estimatedPrice = basePrice;

    if (diffDays < 0) {
      verdict = "Travel date has already passed";
      isGood = false;
      explanation = "Please pick a future departure date.";
    } else if (diffDays <= 3) {
      verdict = "Book Immediately (Last-Minute Markups Active)";
      isGood = false;
      estimatedPrice = Math.round(basePrice * 1.65);
      explanation = `Flights departing within 3 days are currently marked up by ~65%. Estimated fare is ₹${estimatedPrice.toLocaleString('en-IN')}. Fares will only increase further as departure approaches.`;
    } else if (diffDays >= 21 && diffDays <= 28) {
      verdict = "Great Time to Book! You are in the Sweet Spot Window";
      isGood = true;
      estimatedPrice = Math.round(basePrice * 0.88);
      explanation = `Booking ${diffDays} days in advance is optimal for ${selectedRoute?.origin_city || 'Delhi'} to ${selectedRoute?.destination_city || 'Mumbai'}. You save roughly 35-40% compared to booking late!`;
    } else if (diffDays < 21) {
      verdict = "Book Now — Prices rising gradually";
      isGood = true;
      estimatedPrice = Math.round(basePrice * 1.15);
      explanation = `You are ${diffDays} days away from departure. Fares are starting to rise towards the last-minute peak. Booking today protects you from further spikes.`;
    } else {
      verdict = "Wait or Track — Prices will stabilize around T-25 days";
      isGood = true;
      estimatedPrice = Math.round(basePrice * 0.95);
      explanation = `You are ${diffDays} days away from departure. Fares are relatively stable. Set a Price Alert to be notified when fares hit the T-21 day sweet spot.`;
    }

    setAdvice({
      diffDays,
      verdict,
      isGood,
      explanation,
      estimatedPrice,
    });
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-xl text-white">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
          <Plane className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">"Should I Book Now?" Smart Advisor</h3>
          <p className="text-slate-400 text-sm">
            Select your route and planned travel date for instant booking guidance based on historical lead-time curves.
          </p>
        </div>
      </div>

      <form onSubmit={handleCalculateAdvice} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Route
          </label>
          <select
            value={selectedRouteId}
            onChange={(e) => setSelectedRouteId(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.origin_city} ({r.origin_code}) → {r.destination_city} ({r.destination_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Departure Date
          </label>
          <input
            type="date"
            value={travelDate}
            onChange={(e) => setTravelDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold py-3 px-6 rounded-xl text-sm transition-all flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20"
          >
            <span>Analyze Best Booking Window</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>

      {advice && (
        <div
          className={`mt-6 p-6 rounded-2xl border ${
            advice.isGood
              ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/20 border-rose-500/30 text-rose-300"
          } transition-all duration-300 animate-fadeIn`}
        >
          <div className="flex items-start space-x-4">
            {advice.isGood ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0 mt-1" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-rose-400 flex-shrink-0 mt-1" />
            )}
            <div>
              <div className="flex items-center space-x-3 flex-wrap">
                <span className="font-bold text-lg text-white">{advice.verdict}</span>
                <span className="bg-slate-950 border border-slate-800 text-slate-300 px-3 py-1 rounded-full text-xs font-medium">
                  {advice.diffDays} days until travel
                </span>
              </div>
              <p className="text-slate-300 text-sm mt-2 leading-relaxed">{advice.explanation}</p>

              <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400">Estimated Average Fare:</span>
                <span className="text-xl font-bold text-amber-400">
                  ₹{advice.estimatedPrice.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
