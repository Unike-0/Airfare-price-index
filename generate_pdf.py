import os
import sys
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(45, 750, "APIx: Airfare Price Index Platform — Comprehensive Project Dossier")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(45, 742, letter[0] - 45, 742)
            
        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(45, 40, letter[0] - 45, 40)
        
        self.drawString(45, 28, "Confidential — APIx System Architecture, Innovation Suite & Reference")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 45, 28, page_str)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=45,
        rightMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Custom color palette
    c_primary = colors.HexColor("#0f172a") # Dark Slate
    c_accent = colors.HexColor("#4338ca")  # Deep Indigo
    c_secondary = colors.HexColor("#0369a1") # Deep Sky
    c_light_bg = colors.HexColor("#f8fafc")
    c_border = colors.HexColor("#cbd5e1")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        leading=14,
        textColor=c_accent,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=12.5,
        leading=15,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=12.5,
        textColor=c_primary,
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=4
    )

    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=12,
        bulletIndent=4,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor("#1e293b")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # ==================== TITLE BANNER ====================
    banner_data = [
        [
            Paragraph("<font size='8.5' color='#4338ca'><b>HACKATHON 2026 — OFFICIAL SYSTEM SPECIFICATION DOSSIER</b></font>", body_style)
        ],
        [
            Paragraph("<b>APIx: Airfare Price Index Platform (v2)</b>", title_style)
        ],
        [
            Paragraph("Dual-Interface Real-Time Airfare Tracking, Mathematical Laspeyres Index Engine & Regulatory Monitoring", subtitle_style)
        ],
        [
            Paragraph(f"<b>Date:</b> {datetime.now().strftime('%B %d, %Y')} &nbsp;|&nbsp; <b>Version:</b> 2.0.0 Production &nbsp;|&nbsp; <b>Target Audience:</b> Indian Consumers, NSO, MoSPI, RBI, DGCA", body_style)
        ]
    ]
    banner_table = Table(banner_data, colWidths=[522])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('BOX', (0, 0), (-1, -1), 1, c_border),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 2),
        ('BOTTOMPADDING', (0, 1), (-1, 1), 2),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 8))

    # ==================== 1. EXECUTIVE SUMMARY ====================
    story.append(Paragraph("1. Executive Summary & Problem Statement", h1_style))
    story.append(Paragraph(
        "<b>APIx</b> is an airfare price intelligence ecosystem built to solve two contrasting needs across India's domestic aviation sector:",
        body_style
    ))
    story.append(Paragraph(
        "• <b>Consumer Price Transparency:</b> Indian domestic airfares are volatile due to dynamic pricing algorithms. Everyday consumers struggle to evaluate whether today's quoted price is fair or inflated.",
        bullet_style
    ))
    story.append(Paragraph(
        "• <b>Macro-Economic & Regulatory Tracking:</b> Official government Consumer Price Index (CPI) metrics from MoSPI suffer from a 45-day reporting lag. Macroeconomic regulators (NSO, RBI, DGCA) require real-time, mathematically rigorous Laspeyres index tracking with daily sector weight attributions.",
        bullet_style
    ))
    story.append(Paragraph(
        "<b>The Readability Rule:</b> If a non-technical consumer cannot understand a screen in 10 seconds, the platform simplifies it into plain English (e.g., <i>'Flights are 10% pricier than usual today'</i>) while maintaining deep technical analysis behind an analyst toggle.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # ==================== 2. SYSTEM ARCHITECTURE ====================
    story.append(Paragraph("2. System Architecture & Tech Stack", h1_style))
    
    arch_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technologies", table_header_style), Paragraph("Key Responsibilities", table_header_style)],
        [
            Paragraph("<b>Frontend UI</b>", table_cell_bold),
            Paragraph("React 18, TypeScript, Vite, TailwindCSS, Recharts, Lucide Icons", table_cell_style),
            Paragraph("Dual-view UI (Consumer vs Advanced Analyst), real-time chart rendering, interactive guided tour, explainers.", table_cell_style)
        ],
        [
            Paragraph("<b>Backend API</b>", table_cell_bold),
            Paragraph("FastAPI (Python 3.9+), Uvicorn, Pydantic, WebSockets", table_cell_style),
            Paragraph("High-performance REST API, asynchronous WebSockets, JWT authentication, rate limiting, and NLP chatbot engine.", table_cell_style)
        ],
        [
            Paragraph("<b>Data Pipelines</b>", table_cell_bold),
            Paragraph("NumPy, Pandas, APScheduler, Playwright Scrapers", table_cell_style),
            Paragraph("IQR outlier cleaning, base-period pricing, Laspeyres index calculations, and automated scraping simulation.", table_cell_style)
        ],
        [
            Paragraph("<b>Persistence & Cache</b>", table_cell_bold),
            Paragraph("SQLite 3 / PostgreSQL 15, SQLAlchemy 2.0, Redis 7", table_cell_style),
            Paragraph("ACID transaction storage for raw quotes, daily aggregates, index history, user tiers, and fast caching.", table_cell_style)
        ],
    ]
    arch_table = Table(arch_data, colWidths=[95, 185, 242])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_light_bg]),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 6))

    # ==================== 3. CONSUMER VS ANALYST INTERFACES ====================
    story.append(Paragraph("3. Dual-Interface System Design", h1_style))
    
    ui_data = [
        [Paragraph("Feature Area", table_header_style), Paragraph("Consumer Public View (Default)", table_header_style), Paragraph("Advanced Analyst / Regulator View", table_header_style)],
        [
            Paragraph("<b>Hero Metric</b>", table_cell_bold),
            Paragraph("Large Flight Price Score (e.g. 110.3) with color-coded verdict banner.", table_cell_style),
            Paragraph("Laspeyres Index value with mathematical formulas, DoD change, and base-period reference.", table_cell_style)
        ],
        [
            Paragraph("<b>Data Transparency</b>", table_cell_bold),
            Paragraph("[LIVE] badge with data source and human-readable timestamp.", table_cell_style),
            Paragraph("Scraper pipeline logs, latency monitors, success rate %, and health status.", table_cell_style)
        ],
        [
            Paragraph("<b>Route Analysis</b>", table_cell_bold),
            Paragraph("Cheapest routes, Fare/km ranking, and 'Book Now' deep links.", table_cell_style),
            Paragraph("DGCA traffic-weighted route breakdown, fare IQR spread, and raw quote drilldown.", table_cell_style)
        ],
        [
            Paragraph("<b>Onboarding & Help</b>", table_cell_bold),
            Paragraph("4-step guided walkthrough tour & 'Explain this' popups.", table_cell_style),
            Paragraph("Tiered API key management (Bronze/Silver/Gold) & raw JSON/CSV export playground.", table_cell_style)
        ]
    ]
    ui_table = Table(ui_data, colWidths=[100, 211, 211])
    ui_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_primary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_light_bg]),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(ui_table)
    story.append(Spacer(1, 6))

    # Page Break for clean section division
    story.append(PageBreak())

    # ==================== 4. 8 STANDOUT INNOVATION FEATURES ====================
    story.append(Paragraph("4. The 8 Standout Innovation Features", h1_style))

    innovations = [
        ("1. Real Traveller vs Official CPI Comparison", "Dual-line tracking showing daily APIx live scores alongside official monthly MoSPI CPI data (45-day lag) and DGCA benchmark averages, validating real-time predictive inflation accuracy."),
        ("2. 'Best Time to Book' Predictor", "Advance purchase lead-time curve (T+1 to T+45) highlighting the optimal 21-28 day booking sweet spot where average fares drop by 22% compared to last-minute bookings."),
        ("3. Fare Alert & Price Watch", "Custom route monitoring allowing users to set target price thresholds and receive instant visual alerts when fares dip below their budget."),
        ("4. Route Affordability (Fare per KM)", "Normalizes domestic routes by sector distance (km), calculating true INR/km affordability to expose which sectors are overpriced relative to flight duration."),
        ("5. Festival & Holiday Surge Overlay", "Interactive chronological overlays for major Indian festivals (Diwali, Holi, Eid, New Year, IPL) explaining historical 30-50% demand-driven price surges."),
        ("6. Anomaly & Surge Root-Cause Explanations", "Automated natural language explainers analyzing sudden price spikes (e.g. weather disruptions, fuel price adjustments, or high festive bookings)."),
        ("7. Natural Language Search & Chatbot", "Plain-English conversational query box and in-site chatbot that understands queries like 'How much did Delhi to Mumbai flights cost last week?'."),
        ("8. 'Book This Fare' Deep-Link Redirect", "Direct action links allowing users to seamlessly transition from analytics to booking on MakeMyTrip / Airline portals with pre-filled dates and city pairs.")
    ]

    for title, desc in innovations:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(desc, body_style))

    story.append(Spacer(1, 6))

    # ==================== 5. MATHEMATICAL FOUNDATION ====================
    story.append(Paragraph("5. Mathematical Foundation & Cleaning Pipeline", h1_style))
    
    story.append(Paragraph("<b>A. Interquartile Range (IQR) Outlier Filter</b>", h2_style))
    story.append(Paragraph(
        "To eliminate scraping artifacts and erroneous fare spikes, APIx computes IQR bounds per route and departure bucket:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>IQR = Q3 - Q1</b> &nbsp;&nbsp;|&nbsp;&nbsp; <b>Valid Range = [Q1 - 1.5 &times; IQR, &nbsp;Q3 + 1.5 &times; IQR]</b><br/>"
        "Quotes falling outside this window are flagged as outliers and excluded from index aggregation.",
        body_style
    ))

    story.append(Paragraph("<b>B. Laspeyres Price Index Formula</b>", h2_style))
    story.append(Paragraph(
        "The composite Airfare Price Index is calculated using the standard macroeconomic Laspeyres formulation:<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;<b>I_t = [ &Sigma; ( P_i,t &times; W_i,0 ) / &Sigma; ( P_i,0 &times; W_i,0 ) ] &times; 100</b><br/>"
        "Where <b>P_i,t</b> is the median fare for route <i>i</i> on day <i>t</i>, <b>P_i,0</b> is the base period price, and <b>W_i,0</b> is the DGCA passenger traffic volume weight for route <i>i</i>.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # Page Break for Schema & APIs
    story.append(PageBreak())

    # ==================== 6. DATABASE SCHEMA & ENTITY MODELS ====================
    story.append(Paragraph("6. Database Schema & Data Models", h1_style))
    
    schema_data = [
        [Paragraph("Table Name", table_header_style), Paragraph("Primary Fields", table_header_style), Paragraph("Description & Role", table_header_style)],
        [
            Paragraph("<b>routes</b>", table_cell_bold),
            Paragraph("id, origin_code, origin_city, destination_code, destination_city, dgca_traffic_weight, distance_km", table_cell_style),
            Paragraph("Domestic city pairs and their official regulatory traffic weight allocations.", table_cell_style)
        ],
        [
            Paragraph("<b>carriers</b>", table_cell_bold),
            Paragraph("id, code (6E, AI, SG, QP, IX), name, is_active", table_cell_style),
            Paragraph("Airlines tracked across domestic sectors.", table_cell_style)
        ],
        [
            Paragraph("<b>raw_fare_quotes</b>", table_cell_bold),
            Paragraph("id, route_id, carrier_id, source_id, fare_amount, base_fare, taxes_fees, flight_date, scrape_timestamp, is_outlier", table_cell_style),
            Paragraph("Granular ticket quotes scraped or simulated across advance purchase windows.", table_cell_style)
        ],
        [
            Paragraph("<b>daily_route_aggregates</b>", table_cell_bold),
            Paragraph("id, route_id, date, median_fare, mean_fare, min_fare, max_fare, std_dev, sample_count", table_cell_style),
            Paragraph("Cleaned daily summary statistics computed post-IQR filtering.", table_cell_style)
        ],
        [
            Paragraph("<b>apix_index_values</b>", table_cell_bold),
            Paragraph("id, date, index_value, dod_change_pct, mom_change_pct, base_period_date", table_cell_style),
            Paragraph("Final macro-level composite daily price index records.", table_cell_style)
        ],
        [
            Paragraph("<b>users</b>", table_cell_bold),
            Paragraph("id, username, hashed_password, role, api_key, api_tier, api_limit, is_active", table_cell_style),
            Paragraph("Role-based access control (Admin, Analyst, NSO/RBI API clients).", table_cell_style)
        ],
    ]
    schema_table = Table(schema_data, colWidths=[110, 202, 210])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_secondary),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_light_bg]),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 8))

    # ==================== 7. REST API SPECIFICATIONS ====================
    story.append(Paragraph("7. REST API Endpoints Reference", h1_style))
    
    api_data = [
        [Paragraph("Method", table_header_style), Paragraph("Endpoint", table_header_style), Paragraph("Description & Access Tier", table_header_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/index/current</b>", table_cell_style), Paragraph("Latest headline score, verdict string, and DoD change.", table_cell_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/index/timeseries</b>", table_cell_style), Paragraph("Historical index values (7d, 30d, 90d, 1y).", table_cell_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/routes/summary</b>", table_cell_style), Paragraph("Route-level median fares, price changes, and fare/km.", table_cell_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/analytics/cpi-comparison</b>", table_cell_style), Paragraph("APIx real-time score vs MoSPI CPI & DGCA monthly benchmark.", table_cell_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/analytics/advance-purchase</b>", table_cell_style), Paragraph("Lead-time pricing curve (T+1 to T+45 days).", table_cell_style)],
        [Paragraph("<font color='#2563eb'><b>POST</b></font>", table_cell_style), Paragraph("<b>/api/v1/chatbot/query</b>", table_cell_style), Paragraph("Natural language inquiry engine & conversational guide.", table_cell_style)],
        [Paragraph("<font color='#059669'><b>GET</b></font>", table_cell_style), Paragraph("<b>/api/v1/export/csv</b>", table_cell_style), Paragraph("Bulk regulatory data export (Requires Bronze/Silver/Gold key).", table_cell_style)],
        [Paragraph("<font color='#7c3aed'><b>WS</b></font>", table_cell_style), Paragraph("<b>/ws/live-stream</b>", table_cell_style), Paragraph("WebSocket connection for live quote feeds and index updates.", table_cell_style)],
    ]
    api_table = Table(api_data, colWidths=[55, 202, 265])
    api_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), c_accent),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, c_border),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, c_light_bg]),
        ('PADDING', (0, 0), (-1, -1), 4.5),
    ]))
    story.append(api_table)
    story.append(Spacer(1, 8))

    # ==================== 8. QUICKSTART & VERIFICATION ====================
    story.append(Paragraph("8. Runtime Execution & Verification Commands", h1_style))
    story.append(Paragraph("<b>Launching Backend Server:</b>", h2_style))
    story.append(Paragraph("<font name='Courier' size='8' color='#1e293b'>cd backend &amp;&amp; python main.py &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Runs on http://localhost:8000</font>", body_style))
    
    story.append(Paragraph("<b>Launching Frontend Client:</b>", h2_style))
    story.append(Paragraph("<font name='Courier' size='8' color='#1e293b'>cd frontend &amp;&amp; npm run dev &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Opens on http://localhost:5173</font>", body_style))
    
    story.append(Paragraph("<b>Running Offline Test Suite:</b>", h2_style))
    story.append(Paragraph("<font name='Courier' size='8' color='#1e293b'>cd backend &amp;&amp; python -m pytest &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# Validates index math, IQR rules &amp; API routes</font>", body_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF: {filename}")

if __name__ == "__main__":
    output_path = os.path.join(os.getcwd(), "APIx_Project_Documentation.pdf")
    build_pdf(output_path)
