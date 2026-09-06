import React, { useState, useEffect } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceArea } from "recharts";
import { Plane, TrendingUp, TrendingDown, Minus, Info, Search, Calendar, Bell, ExternalLink } from "lucide-react";
import ExplainPopup from "../components/ExplainPopup";

interface Route {
  id: number;
  origin_code: string;
  origin_city: string;
  destination_code: string;
  destination_city: string;
  current_avg_fare?: number;
}

export default function ConsumerRouteExplorer() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number>(1);
  const [fareHistory, setFareHistory] = useState<any[]>([]);
  const [bestWindow, setBestWindow] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [alertTargetPrice, setAlertTargetPrice] = useState<string>("");
  const [alertStatus, setAlertStatus] = useState<string>("");
  const [showBookModal, setShowBookModal] = useState<any>(null);

  const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:8000") + "/api/v1";

  useEffect(() => {
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteFares(selectedRouteId);
      fetchBestWindow(selectedRouteId);
    }
  }, [selectedRouteId]);

  const fetchRoutes = async () => {
    try {
      const res = await fetch(`${apiUrl}/routes`);
      const data = await res.json();
      setRoutes(data);
      if (data.length > 0) setSelectedRouteId(data[0].id);
    } catch (e) {
      console.error("Failed to load routes", e);
    }
  };

  const fetchRouteFares = async (rId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/routes/${rId}/fares`);
      const data = await res.json();

      const formatted = data.map((d: any) => ({
        date: d.date,
        displayDate: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        price: Math.round(d.avg_fare),
        formattedPrice: `₹${Math.round(d.avg_fare).toLocaleString("en-IN")}`,
      }));

      setFareHistory(formatted);
    } catch (e) {
      console.error("Failed to load fares", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBestWindow = async (rId: number) => {
    try {
      const res = await fetch(`${apiUrl}/innovations/best-time-to-book/${rId}`);
      const data = await res.json();
      setBestWindow(data);
    } catch (e) {
      console.error("Failed to load best window", e);
    }
  };

  const handleBookNowRedirect = (r: Route, farePrice: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const targetUrl = `https://www.makemytrip.com/flight/search?itinerary=${r.origin_code}-${r.destination_code}-${todayStr}&tripType=O&paxType=A-1_C-0_I-0&intl=false&cabinClass=E`;

    setShowBookModal({
      route: `${r.origin_city} (${r.origin_code}) → ${r.destination_city} (${r.destination_code})`,
      price: farePrice,
      url: targetUrl,
    });
  };

  const selectedRoute = routes.find((r) => r.id === Number(selectedRouteId)) || routes[0];

  const latestPrice = fareHistory[fareHistory.length - 1]?.price || selectedRoute?.current_avg_fare || 4500;
  const prevPrice = fareHistory[0]?.price || latestPrice;
  const pctDiff = Math.round(((latestPrice - prevPrice) / prevPrice) * 100);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTargetPrice) return;
    try {
      const res = await fetch(`${apiUrl}/innovations/fare-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          route_id: selectedRouteId,
          target_price: parseFloat(alertTargetPrice),
        }),
      });
      const data = await res.json();
      setAlertStatus(`✅ Price Watch Active! We will alert you when fares drop below ₹${parseFloat(alertTargetPrice).toLocaleString('en-IN')}.`);
    } catch (e) {
      setAlertStatus("Failed to save price watch alert.");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-8">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400 mb-3">
              <Plane className="w-3.5 h-3.5" />
              <span>Consumer Route Explorer</span>
              <ExplainPopup
                title="What does the Route Explorer do?"
                explanation="Select any two Indian cities to view daily historical prices, fare trend direction, and click 'Book This Fare →' to pre-fill live airline search pages."
              />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Flight Fare Inspector</h1>
            <p className="text-slate-400 text-sm mt-1">
              Select any origin and destination to inspect daily fare trends, average prices, and optimal booking advice.
            </p>
          </div>

          {/* City Selection Dropdown */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Select Flight Route
            </label>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl px-4 py-3.5 font-bold text-sm focus:outline-none focus:border-amber-500 shadow-inner"
            >
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  ✈️ {r.origin_city} ({r.origin_code}) → {r.destination_city} ({r.destination_code})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Sector Statistics & Friendly Chart */}
      {selectedRoute && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart Box */}
          <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 md:p-8 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-800/80 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                    <span>{selectedRoute.origin_city}</span>
                    <span className="text-amber-400">→</span>
                    <span>{selectedRoute.destination_city}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Daily Average Economy Fare History</p>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Current Avg Price</span>
                    <span className="text-3xl font-black text-amber-400">
                      ₹{latestPrice.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <button
                    onClick={() => handleBookNowRedirect(selectedRoute, latestPrice)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black px-5 py-3 rounded-2xl text-xs flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                  >
                    <span>Book This Fare →</span>
                  </button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-72 w-full mt-4">
                {loading ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Loading route trend history...
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fareHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="displayDate" stroke="#64748b" fontSize={11} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickFormatter={(v) => `₹${v}`}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#090d16",
                          borderColor: "#334155",
                          borderRadius: "16px",
                          color: "#fff",
                        }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Average Fare"]}
                        labelFormatter={(lbl: any) => `Date: ${lbl}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#f59e0b"
                        strokeWidth={3}
                        dot={{ r: 4, fill: "#f59e0b" }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Data source: Live Scraped & Cleaned Fares</span>
              <span>Updated Daily</span>
            </div>
          </div>

          {/* Side Info Column (Best Time to Book & Price Watch) */}
          <div className="space-y-6">
            {/* Best Time to Book Card */}
            {bestWindow && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
                <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-3">
                  <Calendar className="w-4 h-4" />
                  <span>Best Time to Book Advice</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{bestWindow.recommended_window}</h3>
                <p className="text-slate-300 text-xs leading-relaxed mb-4">{bestWindow.recommendation}</p>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Sweet Spot Lowest Fare:</span>
                    <span className="font-bold text-emerald-400">₹{bestWindow.lowest_avg_fare?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Last-Minute Markup (&lt;3 days):</span>
                    <span className="font-bold text-rose-400">+{bestWindow.last_minute_markup_pct}% Higher</span>
                  </div>
                </div>
              </div>
            )}

            {/* Set Price Watch Alert */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-3">
                <Bell className="w-4 h-4" />
                <span>Set Fare Price Watch</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                We'll track this sector and alert you when average fares drop below your target price.
              </p>

              <form onSubmit={handleCreateAlert} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Target Fare (₹)
                  </label>
                  <input
                    type="number"
                    value={alertTargetPrice}
                    onChange={(e) => setAlertTargetPrice(e.target.value)}
                    placeholder={`e.g. ${Math.round(latestPrice * 0.9)}`}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 rounded-xl text-xs transition-colors shadow-md"
                >
                  Create In-App Price Alert
                </button>
              </form>

              {alertStatus && (
                <div className="mt-3 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded-xl">
                  {alertStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
