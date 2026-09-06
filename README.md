# APIx: Airfare Price Index Platform

APIx is a dual-interface airfare tracking platform designed both for everyday Indian consumers and regulatory macro-economic institutions (NSO, MoSPI, RBI). It provides real-time, daily airfare price monitoring across Indian domestic flight sectors.

> **Readability Rule**: If a non-technical user can't understand a screen in 10 seconds, simplify it further.

---

## 🌟 KEY FEATURES IN V2

### 1. Consumer Public View (Default Landing Page)
- **Today's Flight Price Score**: Big friendly headline score (e.g. `110.3`) with plain-English verdict (`🔴 Flights are 10% pricier than usual`).
- **Data Provenance Badge**: Clear `🟢 LIVE | Data Source: Simulated Data Mode | Last updated: [timestamp]` badge on top of all pages.
- **3-Step Animated Explainer**: Simple 1-2-3 icon strip introducing how APIx cleans and aggregates daily fares.
- **First-Time Visitor Guided Tour**: 4-step interactive walkthrough tooltip introducing scores, booking advice, route inspection, and chatbot helper.
- **Persistent "❓ Explain this" Popups**: Clickable popups next to every chart and metric providing 1-2 sentence plain-language explanations with zero jargon.

### 2. Advanced Analyst / Regulator View (Toggle OFF by default)
- Accessible via the **"Switch to Advanced View"** toggle on the top navigation bar.
- Hidden technical dashboard for regulatory bodies (NSO, RBI, MoSPI):
  - Laspeyres index formulas & DoD route weight attribution
  - Scraper monitoring & audit logs
  - Outlier review panel & API playground

### 3. 8 Standout Innovation Features
1. 🏆 **Real Traveller View vs. Official CPI View Comparison Chart**: Side-by-side dual line chart showing APIx daily score in real-time vs official monthly MoSPI CPI (45-day lag) & DGCA averages.
2. 🎯 **"Best Time to Book" Predictor**: Advance purchase lead-time curve (T+1 to T+45) highlighting the 21–28 day sweet spot.
3. 🔔 **Fare Alert / Price Watch**: Set target route & threshold price with in-app alert status.
4. ✈️ **Route Affordability ("Fare per KM")**: Sector distance in km and normalized cost ranking in ₹/km.
5. 🗓️ **Festival & Holiday Surge Overlay**: Event markers for Diwali, Holi, Eid, IPL, and New Year demand spikes.
6. 🚨 **Surge & Anomaly Detector**: Auto-generated plain-language explanations of price spikes.
7. 💬 **Natural Language Query Box**: Plain English search input ("How much did Delhi to Mumbai flights cost last week?").
8. 🔗 **"Book This Fare" Deep-Link Redirect**: Next to any route price, click **"Book Now →"** to pre-fill search dates directly on MakeMyTrip / Airline portals.

---

## 🏗️ SYSTEM ARCHITECTURE OVERVIEW

```mermaid
graph TD
    subgraph Data Scraping & Simulation
        A[Playwright Live Scraper Engine]
        B[Scheduled Live Data Simulator Engine]
    end

    subgraph Backend Container (FastAPI)
        C[Cleaning Pipeline: IQR Outliers & Deduplication]
        D[Laspeyres Price Index Builder]
        E[Innovation Feature Endpoints & Chatbot API]
        F[(PostgreSQL / SQLite Database)]
    end

    subgraph Frontend Container (React + Vite)
        G[Public Consumer View (Default)]
        H[Advanced Analyst View (Toggleable)]
    end

    A -->|Raw Quotes| F
    B -->|Realistic Fares| F
    F --> C --> D --> F
    G -->|REST / WebSockets| E
    H -->|REST / WebSockets| E
```

---

## 🚀 QUICK START & RUNTIME DEPLOYMENT

### 1. Launching the Backend (FastAPI)
```bash
cd backend
python -m pytest   # Run unit tests
python main.py     # Server runs on http://localhost:8000
```

### 2. Launching the Frontend (React + Vite)
```bash
cd frontend
npm run build      # Validate bundle
npm run dev        # App opens on http://localhost:5173
```

---

## 🧪 RUNNING TESTS
To execute the unit tests offline:
```bash
cd backend
python -m pytest
```
This validates IQR outlier boundary rules, Laspeyres math formulas, and database model relationships.
