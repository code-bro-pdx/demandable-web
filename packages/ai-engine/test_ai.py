import sys
from matcher import match_contractors
from spec_analyzer import analyze_bid

def test_matching():
    print("Testing Contractor Matcher...")
    query = "Need a roofer to fix a leak around the chimney on my slate roof"
    category = "Roofing"
    lat = 37.7749
    lng = -122.4194
    
    matches = match_contractors(query, category, lat, lng, limit=2)
    print(f"Found {len(matches)} matches.")
    for m in matches:
        print(f"- {m['name']} (Distance: {m['distance']} miles, Score: {m['score']})")
        print(f"  Pros: {m['pros']}")
        print(f"  Cons: {m['cons']}")
    
    assert len(matches) > 0, "No matches found"
    print("Contractor Matcher Test: PASSED")

def test_bid_parsing():
    print("\nTesting Bid Parser...")
    bid_text = (
        "Estimate to repair slate roof: Milestone 1: Setup scaffolding and replace broken tiles, cost $600. "
        "Milestone 2: Replace flashing around the chimney and apply sealant, cost $400. Total cost is $1000."
    )
    
    parsed = analyze_bid(bid_text)
    print("Parsed output:", parsed)
    assert "milestones" in parsed, "Milestones not found in parsed output"
    assert parsed["totalAmount"] == 1000, f"Expected total 1000, got {parsed['totalAmount']}"
    print("Bid Parser Test: PASSED")

def test_industry_data():
    print("\nTesting Anonymized Industry Data Aggregation...")
    mock_jobs = [
        {"id": 1, "category": "Roofing", "totalAmount": 1000, "status": "Completed"},
        {"id": 2, "category": "Roofing", "totalAmount": 1500, "status": "Resolved"},
        {"id": 3, "category": "Housekeeping", "totalAmount": 150, "status": "Completed"},
        {"id": 4, "category": "Tutoring", "totalAmount": 300, "status": "Active"} # should be excluded
    ]
    
    # Import locally from main to test the controller logic
    from main import app
    from fastapi.testclient import TestClient
    client = TestClient(app)
    
    response = client.post("/industry-data", json={"jobs": mock_jobs})
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    data = response.json()
    print("Aggregated Output:", data)
    
    assert data["anonymizedCount"] == 3, f"Expected 3 completed jobs, got {data['anonymizedCount']}"
    assert len(data["industryTrends"]) == 2, f"Expected 2 categories, got {len(data['industryTrends'])}"
    print("Industry Data Aggregation Test: PASSED")

if __name__ == "__main__":
    try:
        test_matching()
        test_bid_parsing()
        test_industry_data()
        print("\nAll AI and API tests passed successfully!")
    except Exception as e:
        print(f"\nTest failed with error: {e}")
        sys.exit(1)
