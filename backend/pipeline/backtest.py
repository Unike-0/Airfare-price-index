import numpy as np
from sqlalchemy import func
from sqlalchemy.orm import Session
from database.models import Route, DailyRouteAggregate, DgcaBenchmarkData

def run_backtest_report(db: Session) -> dict:
    """
    Compares computed daily route aggregates (averaged monthly) against
    DGCA monthly benchmark data. Returns metrics like MAE, MAPE, and route details.
    """
    # Get all active routes
    routes = db.query(Route).filter(Route.is_active == True).all()
    route_map = {r.id: f"{r.origin_code}-{r.destination_code}" for r in routes}
    
    # Get all available benchmark entries
    benchmarks = db.query(DgcaBenchmarkData).all()
    
    comparisons = []
    absolute_percentage_errors = []
    absolute_errors = []
    
    for b in benchmarks:
        route_name = route_map.get(b.route_id, "Unknown Route")
        
        # Calculate monthly average of daily median fares for this route & month
        # month is format 'YYYY-MM', match date string using like or strftime
        year_str, month_str = b.month.split("-")
        
        # SQL query to get average of daily aggregates for this route and month
        computed_avg = db.query(func.avg(DailyRouteAggregate.median_fare)).filter(
            DailyRouteAggregate.route_id == b.route_id,
            func.strftime('%Y', DailyRouteAggregate.date) == year_str,
            func.strftime('%m', DailyRouteAggregate.date) == month_str
        ).scalar()
        
        if computed_avg is None:
            # Fallback if SQLite strftime formatting differs in certain environments
            # Query all and filter in python
            all_aggs = db.query(DailyRouteAggregate).filter(
                DailyRouteAggregate.route_id == b.route_id
            ).all()
            matching_aggs = [
                a.median_fare for a in all_aggs 
                if a.date.strftime("%Y-%m") == b.month
            ]
            if matching_aggs:
                computed_avg = float(np.mean(matching_aggs))

        if computed_avg is not None:
            computed_avg = float(computed_avg)
            reported = b.avg_fare_reported
            
            ae = abs(computed_avg - reported)
            pe = (ae / reported) * 100
            
            absolute_errors.append(ae)
            absolute_percentage_errors.append(pe)
            
            comparisons.append({
                "route_id": b.route_id,
                "route_code": route_name,
                "month": b.month,
                "computed_avg_fare": round(computed_avg, 2),
                "reported_avg_fare": reported,
                "absolute_error": round(ae, 2),
                "percentage_error": round(pe, 2)
            })

    mape = float(np.mean(absolute_percentage_errors)) if absolute_percentage_errors else 0.0
    mae = float(np.mean(absolute_errors)) if absolute_errors else 0.0
    
    # Calculate Correlation if we have at least 3 points
    correlation = None
    if len(comparisons) >= 3:
        comp_arr = [c["computed_avg_fare"] for c in comparisons]
        rep_arr = [c["reported_avg_fare"] for c in comparisons]
        corr_matrix = np.corrcoef(comp_arr, rep_arr)
        if not np.isnan(corr_matrix[0, 1]):
            correlation = float(corr_matrix[0, 1])

    return {
        "summary": {
            "mape": round(mape, 2),
            "mae": round(mae, 2),
            "correlation": round(correlation, 4) if correlation is not None else "Insufficient Data",
            "total_records_compared": len(comparisons)
        },
        "details": comparisons
    }
