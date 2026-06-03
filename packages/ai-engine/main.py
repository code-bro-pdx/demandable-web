import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
from matcher import match_contractors
from spec_analyzer import analyze_bid

app = FastAPI(title="Demandable Web (DW) AI Engine API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MatchRequest(BaseModel):
    query: str
    category: str
    latitude: float
    longitude: float
    limit: int = 3

class BidRequest(BaseModel):
    bid_text: str

@app.get("/")
def read_root():
    return {"status": "active", "service": "Demandable Web AI Engine"}

@app.post("/match")
def match_contractor_endpoint(req: MatchRequest):
    try:
        results = match_contractors(
            query=req.query,
            category=req.category,
            user_lat=req.latitude,
            user_lon=req.longitude,
            limit=req.limit
        )
        return {"matches": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-bid")
def analyze_bid_endpoint(req: BidRequest):
    try:
        results = analyze_bid(req.bid_text)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class IndustryDataRequest(BaseModel):
    jobs: List[Dict[str, Any]]

@app.post("/industry-data")
def industry_data_endpoint(req: IndustryDataRequest):
    try:
        category_costs = {}
        category_counts = {}
        regions = []
        
        for job in req.jobs:
            if job.get("status") not in ["Completed", "Resolved"]:
                continue
                
            category = job.get("category", "General")
            cost = job.get("totalAmount", 0)
            regions.append("Northern California Region")
            
            category_costs[category] = category_costs.get(category, 0) + cost
            category_counts[category] = category_counts.get(category, 0) + 1
            
        trends = []
        for cat, cost in category_costs.items():
            count = category_counts[cat]
            trends.append({
                "category": cat,
                "completedJobs": count,
                "averageVolumeUSD": cost / count if count > 0 else 0,
                "totalVolumeUSD": cost
            })
            
        return {
            "status": "success",
            "anonymizedCount": len(regions),
            "regionsAggregated": list(set(regions)),
            "industryTrends": trends
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
