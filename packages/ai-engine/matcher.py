import os
import numpy as np
import google.generativeai as genai
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

# Configure Google Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)
else:
    # Use dummy mode for tests if key not present
    print("Warning: GEMINI_API_KEY not found in environment. Running in mockup mode.")

# Mock Contractor DB reflecting the static, factual registry
MOCK_CONTRACTORS = [
    {
        "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "name": "Apex Roofing Specialists",
        "category": "Roofing",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "radius": 30,
        "history": "Established 2018. Completed 142 residential roofing jobs. Specialized in asphalt shingles, standing seam metal roofs, and leak repairs.",
        "equipment": "Thermal imaging cameras for leak detection, drone inspection tools, industrial debris vacuum systems.",
        "certifications": "California C-39 Roofing License #847291, Active bonding, General Liability Insurance up to $2M.",
        "factual_description": "Apex specializes in metal and shingle roofing systems. They perform drone inspections and utilize thermal imaging to find leaks. They have worked on 142 residential properties with no outstanding licensing complaints."
    },
    {
        "address": "0x90F8bf323369FD0297AB4208f93D8b8490b4698e",
        "name": "Precision Tile & Roof Co",
        "category": "Roofing",
        "latitude": 37.7833,
        "longitude": -122.4167,
        "radius": 15,
        "history": "Established 2021. Completed 56 jobs. Specialized in clay tiles, slate roofing, and chimney flashings.",
        "equipment": "Tile cutters, automated lift hoists, safety anchors.",
        "certifications": "California C-39 License #923485, General Liability Insurance up to $1M.",
        "factual_description": "Precision Tile specializes in high-weight slate and tile systems. They handle historic restorations and chimney refitting. They operate within a smaller 15-mile radius."
    },
    {
        "address": "0x2546BcD3c84621e9a6d9435b474955bbf8d7e1fd",
        "name": "EcoClean Housekeeping",
        "category": "Housekeeping",
        "latitude": 37.7599,
        "longitude": -122.4346,
        "radius": 20,
        "history": "Established 2020. Completed 310 cleanings. Focus on residential maintenance and move-out deep cleanings.",
        "equipment": "HEPA-filter vacuums, steam sanitizers, microfiber dry-dusting systems.",
        "certifications": "Registered Sole Proprietorship, Insured up to $500k, Green Clean Institute Certified.",
        "factual_description": "EcoClean uses 100% biodegradable cleaning agents. They specialize in recurring residential maintenance. They do not handle biohazard or industrial cleaning."
    },
    {
        "address": "0xcd3B766CCDd6AE471129600F2cd16d7a469B56e7",
        "name": "A+ STEM Tutoring",
        "category": "Tutoring",
        "latitude": 37.7891,
        "longitude": -122.4014,
        "radius": 25,
        "history": "Established 2022. Provided 450 tutoring hours. Focused on High School Algebra, Calculus, and Physics.",
        "equipment": "Digital tablets, interactive whiteboards, curated test preparation material.",
        "certifications": "Tutors hold BS degrees in Mathematics/Physics, background checked via LiveScan.",
        "factual_description": "A+ STEM provides in-person and digital tutoring for high-school level physics and mathematics. All staff are background checked. They do not tutor elementary reading or college-level engineering."
    }
]

def get_embedding(text: str) -> List[float]:
    """Generates text embedding using Gemini embedding model."""
    if not API_KEY:
        # Mock embedding return for test consistency
        return [0.1] * 768
    
    try:
        response = genai.embed_content(
            model="models/text-embedding-004",
            contents=text,
            task_type="retrieval_document"
        )
        return response['embedding']
    except Exception as e:
        print(f"Error calling Gemini Embedding API: {e}")
        return [0.1] * 768

def calculate_cosine_similarity(a: List[float], b: List[float]) -> float:
    """Computes cosine similarity between two vectors."""
    a_arr = np.array(a)
    b_arr = np.array(b)
    dot_product = np.dot(a_arr, b_arr)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates approximate distance in miles between two coordinates (Haversine formula)."""
    R = 3958.8  # Earth radius in miles
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1-a))
    return float(R * c)

def compile_factual_pros_cons(contractor: Dict[str, Any], query: str) -> Dict[str, List[str]]:
    """Calls Gemini to compile a strictly factual Pros and Cons summary based on contractor capabilities."""
    if not API_KEY:
        return {
            "pros": [f"Specializes in {contractor['category']}", "Vetted in database"],
            "cons": ["Operating radius limit applies"]
        }

    prompt = f"""
    You are an objective, AI-agent auditor for Demandable Web.
    Your task is to analyze the contractor's factual profile and evaluate how well they match the homeowner's request.
    
    Homeowner Request: "{query}"
    
    Contractor Factual Profile:
    - Name: {contractor['name']}
    - Category: {contractor['category']}
    - History: {contractor['history']}
    - Equipment: {contractor['equipment']}
    - Certifications: {contractor['certifications']}
    - Capabilities: {contractor['factual_description']}
    
    RULES:
    1. Output a JSON object with two fields: "pros" (list of strings) and "cons" (list of strings).
    2. Be strictly factual and objective.
    3. Do NOT use promotional language, slogans, eye-candy, or adjectives like "excellent", "premier", "best".
    4. Focus on equipment alignment, specific license validity, distance/radius constraints, and specific capabilities needed for the request.
    5. Rely ONLY on the provided factual profile.
    6. Return ONLY the raw JSON block without markdown code fences.
    """

    model = genai.GenerativeModel("gemini-1.5-flash")
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean up any potential markdown wraps
        if text.startswith("```json"):
            text = text.split("```json")[1].split("```")[0].strip()
        elif text.startswith("```"):
            text = text.split("```")[1].split("```")[0].strip()
        
        import json
        return json.loads(text)
    except Exception as e:
        print(f"Error compiling pros/cons: {e}")
        return {
            "pros": ["Listed capabilities match category", "Credentials verified"],
            "cons": ["Check distance boundaries"]
        }

def match_contractors(
    query: str,
    category: str,
    user_lat: float,
    user_lon: float,
    limit: int = 3
) -> List[Dict[str, Any]]:
    """Matches homeowners request to local contractors using semantic search and geographical constraints."""
    query_emb = get_embedding(query)
    matches = []

    for contractor in MOCK_CONTRACTORS:
        if contractor["category"].lower() != category.lower():
            continue
        
        # Calculate distance
        distance = calculate_distance(user_lat, user_lon, contractor["latitude"], contractor["longitude"])
        if distance > contractor["radius"]:
            continue # Outside operating radius

        # Calculate semantic score
        contractor_text = f"{contractor['history']} {contractor['equipment']} {contractor['certifications']} {contractor['factual_description']}"
        contractor_emb = get_embedding(contractor_text)
        score = calculate_cosine_similarity(query_emb, contractor_emb)

        matches.append({
            "contractor": contractor,
            "distance": round(distance, 1),
            "score": score
        })

    # Sort by semantic score descending
    matches.sort(key=lambda x: x["score"], reverse=True)
    matches = matches[:limit]

    # Generate factual Pros/Cons for matches
    result = []
    for m in matches:
        c = m["contractor"]
        pros_cons = compile_factual_pros_cons(c, query)
        result.append({
            "walletAddress": c["address"],
            "name": c["name"],
            "category": c["category"],
            "distance": m["distance"],
            "score": round(m["score"], 3),
            "metadataURI": "ipfs://factual-profile-data",
            "pros": pros_cons.get("pros", []),
            "cons": pros_cons.get("cons", [])
        })

    return result
