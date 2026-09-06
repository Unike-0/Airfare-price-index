// Readability Rule: If a non-technical user can't understand this screen in 10 seconds, simplify it further.

import React, { useState, useEffect } from "react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  BarChart, 
  Bar 
} from "recharts";
import { 
  Plane, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Info, 
  Calendar, 
  Bell, 
  AlertTriangle, 
  Zap, 
  CheckCircle2, 
  ArrowRight, 
  Clock, 
  ShieldCheck, 
  HelpCircle,
  ExternalLink
} from "lucide-react";
import ShouldIBookTool from "../components/ShouldIBookTool";
import GuidedTour from "../components/GuidedTour";
import ExplainPopup from "../components/ExplainPopup";

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  current_avg_fare?: number;
}

export default function PublicView() {
  const [indexData, setIndexData] = useState<any>(null);
  const [timeframe, setTimeframe] = useState<"today" | "week" | "month">("today");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1);
  const [showBookModal, setShowBookModal] = useState<any>(null);

  // Innovation Feature States
  const [cpiComparison, setCpiComparison] = useState<any>(null);
  const [bestBookData, setBestBookData] = useState<any>(null);
  const [festivals, setFestivals] = useState<any[]>([]);
  const [farePerKm, setFarePerKm] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  useEffect(() => {
    fetchCurrentIndex();
    fetchRoutes();
    fetchCpiComparison();
    fetchBestTimeData(1);
    fetchFestivals();
    fetchFarePerKm();
    fetchAnomalies();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchBestTimeData(selectedRouteId);
    }
  }, [selectedRouteId]);

  const fetchCurrentIndex = async () => {
    try {
      const res = await fetch(`${apiUrl}/index?frequency=daily`);
      const data = await res.json();
      setIndexData(data);
    } catch (e) {
      console.error("Failed to fetch index", e);
    }
  };

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${apiUrl}/routes`);
      const data = await res.json();
      setRoutes(data);
      if (data.length > 0) setSelectedRouteId(data[0].id);
    } catch (e) {
      console.error("Failed to fetch routes", e);
    }
  };

  const fetchCpiComparison = async () => {
    try {
      const res = await fetch(`${apiUrl}/innovations/cpi-comparison`);
      const data = await res.json();
      setCpiComparison(data);
    } catch (e) {
      console.error("Failed to fetch CPI comparison", e);
    }
  };

  const fetchBestTimeData = async (rId: number) => {
    try {
      const res = await fetch(`${apiUrl}/innovations/best-time-to-book/${rId}`);
      const data = await res.json();
      setBestBookData(data);
    } catch (e) {
      console.error("Failed to fetch best time data", e);
    }
  };

  const fetchFestivals = async () => {
    try {
      const res = await fetch(`${apiUrl}/innovations/festival-impact`);
      const data = await res.json();
      setFestivals(data);
    } catch (e) {
      console.error("Failed to fetch festivals", e);
    }
  };

  const fetchFarePerKm = async () => {
    try {
      const res = await fetch(`${apiUrl}/innovations/fare-per-km`);
      const data = await res.json();
      setFarePerKm(data);
    } catch (e) {
      console.error("Failed to fetch fare per km", e);
    }
  };

  const fetchAnomalies = async () => {
    try {
      const res = await fetch(`${apiUrl}/innovations/anomalies`);
      const data = await res.json();
      setAnomalies(data);
    } catch (e) {
      console.error("Failed to fetch anomalies", e);
    }
  };

  const handleBookNowRedirect = (r: Route) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const targetUrl = `https://www.makemytrip.com/flight/search?itinerary=${r.origin_code}-${r.destination_code}-${todayStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;

    setShowBookModal({
      route: `${r.origin_city} (${r.origin_code}) → ${r.destination_city} (${r.destination_code})`,
      price: r.current_avg_fare || 4500,
      url: targetUrl,
      partner: "MakeMyTrip / Airline Direct",
    });
  };

  const selectedRoute = routes.find((r) => r.id === Number(selectedRouteId)) || routes[0];

  const scoreVal = indexData?.index_value || 110.3;
  const isPricier = scoreVal > 100;
  const priceDiffPct = Math.abs(Math.round((scoreVal - 100) * 10) / 10);

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-8">
      {/* 1. HERO EXPLAINER & MAIN PRICE SCORE */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Live Tag, Guided Tour & Timestamp Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>LIVE SCORE</span>
            </span>
            <span className="text-xs text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 font-medium">
              Data Source: <strong className="text-white">Simulated Data Mode</strong>
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <GuidedTour />
            <span className="text-xs text-slate-500 font-mono flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 mr-1" />
              Last Updated: {indexData?.last_updated ? new Date(indexData.last_updated).toLocaleTimeString() : "Just now"}
            </span>
          </div>
        </div>

        {/* Hero Copy */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              India's Daily Airfare <span className="text-amber-400 underline decoration-amber-500/40">Price Score</span>
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed">
              This score tracks what Indian travellers are really paying for flights across top domestic routes — updated every single day.
            </p>

            {/* 3-Step "How it works" Strip */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl text-center">
                <div className="w-7 h-7 mx-auto bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center font-bold text-xs mb-2">
                  1
                </div>
                <span className="text-xs text-slate-300 font-semibold block">We check real fares daily</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl text-center">
                <div className="w-7 h-7 mx-auto bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center font-bold text-xs mb-2">
                  2
                </div>
                <span className="text-xs text-slate-300 font-semibold block">We clean & average them</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-2xl text-center">
                <div className="w-7 h-7 mx-auto bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center font-bold text-xs mb-2">
                  3
                </div>
                <span className="text-xs text-slate-300 font-semibold block">One simple daily score</span>
              </div>
            </div>
          </div>

          {/* Big Score Badge Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl relative">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Today's Flight Price Score</span>
                <ExplainPopup
                  title="What is Today's Flight Price Score?"
                  explanation="A score of 100 represents normal average airfares. Today's score compares current flight prices across India against that baseline."
                  example="Score 110.3 = Flight prices are currently about 10.3% higher than normal."
                />
              </div>

              {/* Big Score Number */}
              <div className="text-6xl md:text-7xl font-black text-amber-400 tracking-tight animate-pulse">
                {scoreVal}
              </div>

              {/* Verdict Badge */}
              <div
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-2xl text-sm font-bold border ${
                  isPricier
                    ? "bg-rose-950/40 border-rose-500/40 text-rose-400"
                    : "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                }`}
              >
                <span>{isPricier ? "🔴" : "🟢"}</span>
                <span>
                  {isPricier
                    ? `Flights are ${priceDiffPct}% pricier than usual`
                    : `Good time to book — prices are ${priceDiffPct}% lower than average`}
                </span>
              </div>

              {/* Timeframe Toggle Buttons */}
              <div className="flex items-center justify-center space-x-2 pt-4 border-t border-slate-900">
                {(["today", "week", "month"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeframe(t)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                      timeframe === t
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    {t === "today" ? "Today" : t === "week" ? "This Week" : "This Month"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ROUTE SELECTOR & "BOOK THIS FARE" REDIRECT CTA */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>Quick Route Fare Inspector</span>
              <ExplainPopup
                title="How does route fare inspection work?"
                explanation="Select any flight sector to see current average pricing and trigger a direct booking link."
              />
            </h2>
            <p className="text-xs text-slate-400 mt-1">Pick a route to view prices and book directly with real airlines.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(Number(e.target.value))}
              className="w-full sm:w-72 bg-slate-950 border border-slate-800 text-white rounded-2xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-amber-500"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  ✈️ {r.origin_city} ({r.origin_code}) → {r.destination_city} ({r.destination_code})
                </option>
              ))}
            </select>

            {selectedRoute && (
              <button
                onClick={() => handleBookNowRedirect(selectedRoute)}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black px-6 py-3 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
              >
                <span>Book This Fare →</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. INNOVATION FEATURE #6 (HIGHEST PRIORITY) — REAL TRAVELLER VS OFFICIAL CPI COMPARISON */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400 mb-2">
              <Zap className="w-3.5 h-3.5" />
              <span>Core Problem Solved</span>
              <ExplainPopup
                title="Why compare APIx against Official CPI?"
                explanation="Official Consumer Price Index (CPI) transport reports take 45 days to publish and update only once a month. APIx tracks daily price surges in real time."
              />
            </div>
            <h2 className="text-2xl font-bold text-white">
              Real Traveller View vs. Official CPI Transport Index
            </h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              See how APIx captures live daily airfare spikes in real-time, while official monthly government CPI reports lag by 45 days.
            </p>
          </div>

          <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800 text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-mono">Official CPI Lag</span>
            <span className="text-sm font-bold text-rose-400">45 Days Delayed</span>
          </div>
        </div>

        {/* Dual Line Chart */}
        <div className="h-80 w-full">
          {cpiComparison?.series ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cpiComparison.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#090d16",
                    borderColor: "#334155",
                    borderRadius: "16px",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="apix_realtime_score"
                  name="APIx Real Traveller Index (Daily Live)"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
                <Line
                  type="stepAfter"
                  dataKey="official_cpi_transport"
                  name="Official MoSPI CPI Transport Sub-Index (45-Day Lag)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="dgca_monthly_avg"
                  name="DGCA Monthly Sector Average"
                  stroke="#a855f7"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Loading CPI Comparison chart...
            </div>
          )}
        </div>
      </section>

      {/* 3. INNOVATION FEATURE #1 — BEST TIME TO BOOK PREDICTOR */}
      <section className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400 mb-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Smart Booking Advice</span>
              <ExplainPopup
                title="What is the Sweet Spot Window?"
                explanation="Analyzing thousands of flight tickets shows prices drop to their lowest 21 to 28 days before flight departure before spiking inside the final 3 days."
              />
            </div>
            <h2 className="text-2xl font-bold text-white">"Best Time to Book" Lead-Time Curve</h2>
            <p className="text-slate-400 text-xs md:text-sm mt-1">
              Historical advance purchase curve (T+1 to T+45) highlighting the optimal booking sweet spot.
            </p>
          </div>
        </div>

        {/* Lead-Time Curve Bar Chart */}
        {bestBookData && (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl text-xs md:text-sm text-emerald-300 flex items-center justify-between">
              <div>
                <span className="font-bold block text-white text-base">
                  🎯 Sweet Spot: {bestBookData.recommended_window}
                </span>
                <span className="text-slate-300 text-xs">{bestBookData.recommendation}</span>
              </div>
              <span className="text-2xl font-black text-amber-400">
                ₹{bestBookData.lowest_avg_fare?.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bestBookData.curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#090d16",
                      borderColor: "#334155",
                      borderRadius: "16px",
                      color: "#fff",
                    }}
                    formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Average Fare"]}
                  />
                  <Bar dataKey="avg_fare" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* 4. EMBEDDED "SHOULD I BOOK NOW?" TOOL */}
      <ShouldIBookTool routes={routes} />

      {/* 5. INNOVATION FEATURES GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Feature #3 — Festival Impact Overlay */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-3">
            <Sparkles className="w-4 h-4" />
            <span>Festival & Holiday Surge Overlay</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Indian Festival Demand Markers</h3>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {festivals.map((f, idx) => (
              <div
                key={idx}
                className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-start justify-between"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-sm">{f.event_name}</span>
                    <span className="text-[10px] bg-rose-500/10 border border-rose-500/30 text-rose-400 px-2 py-0.5 rounded-full font-bold">
                      +{f.fare_spike_pct}% Spike
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{f.description}</p>
                </div>
                <span className="text-xs font-mono text-amber-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 whitespace-nowrap">
                  {f.date}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Feature #4 — Route Affordability (Fare per KM) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-3">
            <Plane className="w-4 h-4" />
            <span>Route Affordability Index</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Sector Distance Normalized Cost (₹ / KM)</h3>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {farePerKm.slice(0, 6).map((item) => (
              <div
                key={item.route_id}
                className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{item.badge}</span>
                    <span className="font-bold text-white">{item.sector}</span>
                    <span className="text-slate-400 text-[11px]">({item.distance_km} km)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.verdict}</span>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-amber-400 block text-sm">
                    ₹{item.fare_per_km_inr} / km
                  </span>
                  <span className="text-[10px] text-slate-400">Avg ₹{item.avg_fare_inr.toLocaleString("en-IN")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature #5 — Anomaly & Surge Detector */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md lg:col-span-2">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm mb-3">
            <AlertTriangle className="w-4 h-4" />
            <span>Surge & Anomaly Detector</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-4">Auto-Generated Plain-Language Spike Explanations</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.map((anom) => (
              <div
                key={anom.id}
                className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-2xl text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">{anom.route} Spike Detected</span>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full font-mono">
                    {anom.date}
                  </span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{anom.plain_explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURE #8: BOOK FARE DEEP-LINK REDIRECT MODAL */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl max-w-md w-full relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                <Plane className="w-5 h-5" />
                <span>Redirecting to Booking Partner</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300">
                You are about to view live available seats for <strong className="text-white">{showBookModal.route}</strong>.
              </p>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2 text-center">
                <span className="text-slate-400 text-[11px] block uppercase">Selected Route Price</span>
                <span className="text-3xl font-black text-amber-400">₹{showBookModal.price.toLocaleString("en-IN")}</span>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] flex items-center space-x-2">
                <ExternalLink className="w-4 h-4 flex-shrink-0" />
                <span>You'll be taken to <strong>MakeMyTrip / Airline Direct</strong> to complete your booking.</span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowBookModal(null)}
                className="w-1/2 border border-slate-800 rounded-xl py-3 text-xs font-bold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <a
                href={showBookModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setShowBookModal(null)}
                className="w-1/2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl py-3 text-xs text-center flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20"
              >
                <span>Continue to Book</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
