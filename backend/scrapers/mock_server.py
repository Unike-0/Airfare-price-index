import random
import math
from datetime import datetime, date
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import HTMLResponse

router = APIRouter(prefix="/mock", tags=["mock_travel_portals"])

@router.get("/robots.txt", response_class=HTMLResponse)
def get_robots_txt():
    # standard robots.txt to test robots.py checker
    return """User-agent: *
Disallow: /mock/admin
Allow: /mock/indigo
Allow: /mock/airindia
Allow: /mock/makemytrip
"""

def generate_mock_flights(carrier: str, origin: str, dest: str, dept_date_str: str):
    try:
        dept_date = datetime.strptime(dept_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")
        
    days_to_dept = (dept_date - date.today()).days
    if days_to_dept < 0:
        days_to_dept = 30 # fallback
        
    # Baseline pricing depending on route and days remaining
    route_key = f"{origin}-{dest}"
    route_bases = {
        "DEL-BOM": 4800,
        "DEL-BLR": 5800,
        "BOM-BLR": 4200,
        "DEL-CCU": 5200,
        "BLR-HYD": 3200,
        "MAA-DEL": 4700
    }
    
    base_price = route_bases.get(route_key, 4500)
    
    # Lead-time elasticity curve calculation:
    # Markup is exponential: T+45 is ~0.95x, T+30 is ~1.05x, T+15 is ~1.3x, T+7 is ~1.6x, T+1 is ~2.5x
    if days_to_dept >= 45:
        lead_factor = 0.95
    elif days_to_dept >= 30:
        lead_factor = 0.95 + (45 - days_to_dept) * 0.0067 # up to 1.05
    elif days_to_dept >= 15:
        lead_factor = 1.05 + (30 - days_to_dept) * 0.0167 # up to 1.3
    elif days_to_dept >= 7:
        lead_factor = 1.30 + (15 - days_to_dept) * 0.0375 # up to 1.6
    else:
        lead_factor = 1.60 + (7 - days_to_dept) * 0.15 # up to 2.5
        
    # Carrier specific scalar
    carrier_factors = {"6E": 1.0, "AI": 1.15, "SG": 0.90, "QP": 0.95, "IX": 0.92}
    cf = carrier_factors.get(carrier, 1.0)
    
    flights = []
    # Generate 3-5 flights for this day
    num_flights = 4
    for i in range(num_flights):
        flight_num = f"{carrier}-{100 + i*111}"
        # Small flight specific variance
        flight_var = random.uniform(0.96, 1.04)
        total_fare = int(base_price * lead_factor * cf * flight_var)
        
        # Split fare elements
        taxes = int(total_fare * 0.17)
        convenience = 350
        base_fare = total_fare - taxes - convenience
        
        # Seats and sold out status
        seats = random.randint(0, 9)
        is_sold_out = (seats == 0)
        
        # Scheduled times
        dep_hour = 6 + i * 4
        dep_time = f"{dep_hour:02d}:00"
        arr_time = f"{(dep_hour + 2) % 24:02d}:15"
        
        flights.append({
            "flight_number": flight_num,
            "departure": dep_time,
            "arrival": arr_time,
            "base_fare": base_fare,
            "taxes_fees": taxes,
            "convenience_fee": convenience,
            "total_fare": total_fare,
            "seats_available": seats,
            "is_sold_out": is_sold_out
        })
        
    return flights

@router.get("/indigo", response_class=HTMLResponse)
def get_indigo_mock(
    origin: str = Query("DEL"),
    dest: str = Query("BOM"),
    date: str = Query("2026-09-05")
):
    """
    Renders a mock web page for IndiGo flight searches, 
    allowing Playwright scrapers to target standard HTML selectors.
    """
    flights = generate_mock_flights("6E", origin, dest, date)
    
    rows = ""
    for f in flights:
        sold_out_badge = '<span class="status sold-out">SOLD OUT</span>' if f["is_sold_out"] else f'<span class="status seats">{f["seats_available"]} left</span>'
        rows += f"""
        <tr class="flight-row" data-flight="{f['flight_number']}">
            <td class="flight-number">{f['flight_number']}</td>
            <td class="times">{f['departure']} &rarr; {f['arrival']}</td>
            <td class="fare-base" data-val="{f['base_fare']}">&#8377;{f['base_fare']}</td>
            <td class="fare-taxes" data-val="{f['taxes_fees']}">&#8377;{f['taxes_fees']}</td>
            <td class="fare-convenience" data-val="{f['convenience_fee']}">&#8377;{f['convenience_fee']}</td>
            <td class="fare-total" data-val="{f['total_fare']}">&#8377;{f['total_fare']}</td>
            <td class="seats-status">{sold_out_badge}</td>
        </tr>
        """
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>IndiGo Flights Search: {origin} to {dest}</title>
        <style>
            body {{ font-family: sans-serif; background: #f0f4f8; padding: 20px; }}
            .container {{ max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            h1 {{ color: #002f6c; border-bottom: 2px solid #002f6c; padding-bottom: 10px; }}
            table {{ wwidth: 100%; border-collapse: collapse; margin-top: 20px; }}
            th, td {{ padding: 12px; border-bottom: 1px solid #ddd; text-align: left; }}
            th {{ background: #002f6c; color: white; }}
            .flight-row:hover {{ background: #f8fafc; }}
            .status {{ padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }}
            .sold-out {{ background: #fee2e2; color: #ef4444; }}
            .seats {{ background: #dcfce7; color: #22c55e; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>IndiGo Direct Search</h1>
            <div>
                <strong>Route:</strong> <span id="route-display">{origin} &rarr; {dest}</span> | 
                <strong>Date:</strong> <span id="date-display">{date}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Flight Number</th>
                        <th>Schedule</th>
                        <th>Base Fare</th>
                        <th>Taxes & Fees</th>
                        <th>Convenience Fee</th>
                        <th>Total Fare</th>
                        <th>Availability</th>
                    </tr>
                </thead>
                <tbody id="flight-results">
                    {rows}
                </tbody>
            </table>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@router.get("/airindia", response_class=HTMLResponse)
def get_airindia_mock(
    origin: str = Query("DEL"),
    dest: str = Query("BOM"),
    date: str = Query("2026-09-05")
):
    """
    Renders a slightly different mock page layout simulating Air India,
    testing scraper adaptability to different DOM layouts.
    """
    flights = generate_mock_flights("AI", origin, dest, date)
    
    cards = ""
    for f in flights:
        sold_out_class = "sold-out" if f["is_sold_out"] else ""
        button_text = "Sold Out" if f["is_sold_out"] else f"Select for ₹{f['total_fare']}"
        cards += f"""
        <div class="flight-card {sold_out_class}" data-flight-id="{f['flight_number']}">
            <div class="card-header">
                <span class="flight-no">{f['flight_number']}</span>
                <span class="time-slot">{f['departure']} - {f['arrival']}</span>
            </div>
            <div class="card-details">
                <div class="fare-item">Base Fare: <span class="base-price">₹{f['base_fare']}</span></div>
                <div class="fare-item">Taxes: <span class="tax-price">₹{f['taxes_fees']}</span></div>
                <div class="fare-item">Fee: <span class="conv-fee">₹{f['convenience_fee']}</span></div>
                <div class="total-price-section">Total: <strong class="total-price">₹{f['total_fare']}</strong></div>
            </div>
            <button class="select-btn" {"disabled" if f["is_sold_out"] else ""}>{button_text}</button>
        </div>
        """
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Air India Flights Search: {origin} to {dest}</title>
        <style>
            body {{ font-family: sans-serif; background: #faf5f5; padding: 20px; }}
            .container {{ max-width: 900px; margin: 0 auto; }}
            h1 {{ color: #d01018; font-weight: 300; }}
            .flight-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; margin-top: 20px; }}
            .flight-card {{ background: white; border: 1px solid #e1b3b5; border-radius: 8px; padding: 15px; display: flex; flex-direction: column; justify-content: space-between; }}
            .flight-card.sold-out {{ opacity: 0.6; border-color: #d1d1d1; }}
            .card-header {{ display: flex; justify-content: space-between; border-bottom: 1px dashed #eee; padding-bottom: 8px; margin-bottom: 12px; font-weight: bold; color: #d01018; }}
            .card-details {{ font-size: 13px; color: #555; margin-bottom: 15px; }}
            .fare-item {{ margin: 4px 0; }}
            .total-price-section {{ font-size: 16px; margin-top: 10px; color: #111; }}
            .select-btn {{ background: #d01018; color: white; border: none; padding: 8px; width: 100%; border-radius: 4px; cursor: pointer; font-weight: bold; }}
            .select-btn:disabled {{ background: #cccccc; cursor: not-allowed; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Air India - Book Flight</h1>
            <div>Sector: <strong>{origin}</strong> to <strong>{dest}</strong> | Date: <strong>{date}</strong></div>
            <div class="flight-grid">
                {cards}
            </div>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)

@router.get("/makemytrip")
def get_makemytrip_mock(
    origin: str = Query("DEL"),
    dest: str = Query("BOM"),
    date: str = Query("2026-09-05")
):
    """
    Returns a mock JSON structure simulating an OTA's HTTP JSON response API.
    """
    # OTA aggregates multiple carriers
    indigo_flights = generate_mock_flights("6E", origin, dest, date)
    airindia_flights = generate_mock_flights("AI", origin, dest, date)
    spicejet_flights = generate_mock_flights("SG", origin, dest, date)
    
    all_flights = indigo_flights + airindia_flights + spicejet_flights
    random.shuffle(all_flights)
    
    return {
        "status": "success",
        "search_metadata": {
            "origin": origin,
            "destination": dest,
            "departure_date": date,
            "timestamp": datetime.utcnow().isoformat()
        },
        "flights": [
            {
                "flightNumber": f["flight_number"],
                "carrierCode": f["flight_number"].split("-")[0],
                "times": {
                    "dep": f["departure"],
                    "arr": f["arrival"]
                },
                "pricing": {
                    "base": f["base_fare"],
                    "taxes": f["taxes_fees"],
                    "convenience": f["convenience_fee"],
                    "total": f["total_fare"],
                    "currency": "INR"
                },
                "inventory": {
                    "seats": f["seats_available"],
                    "soldOut": f["is_sold_out"]
                }
            }
            for f in all_flights
        ]
    }
