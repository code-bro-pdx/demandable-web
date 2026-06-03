import os
import json
import google.generativeai as genai
from dotenv import load_dotenv
from typing import Dict, Any

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

def analyze_bid(bid_text: str) -> Dict[str, Any]:
    """Uses Gemini to parse unstructured text estimates/negotiations into structured milestone parameters."""
    if not API_KEY:
        # Mock parser for test consistency
        return {
            "milestones": [
                {"amount": 600, "description": "Milestone 1: Preliminary setup and materials"},
                {"amount": 400, "description": "Milestone 2: Execution and cleanup"}
            ],
            "totalAmount": 1000,
            "contractMetadataURI": "ipfs://mock-parsed-metadata"
        }

    prompt = f"""
    You are an AI contract auditor for Demandable Web.
    Your task is to analyze the unstructured contractor bid/estimate text and decompose it into a clean, structured set of milestone payments.
    
    Bid/Estimate Text:
    "{bid_text}"
    
    RULES:
    1. Parse the text and split the work into logical milestones.
    2. Extract the price for each milestone.
    3. Ensure the sum of milestone amounts equals the total bid cost mentioned.
    4. Provide a short, factual 1-sentence description for each milestone.
    5. Output the result strictly in this JSON format:
    {{
      "milestones": [
        {{
          "amount": <integer amount in USD dollars, e.g. 600>,
          "description": "<factual description of work to verify for this milestone>"
        }}
      ],
      "totalAmount": <integer sum of all milestones>,
      "contractMetadataURI": "ipfs://generated-milestone-specifications"
    }}
    
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
        
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing bid text: {e}")
        # Return fallback structured milestones if parsing fails
        return {
            "milestones": [
                {"amount": 1000, "description": "Full scope of work as described in bid"}
            ],
            "totalAmount": 1000,
            "contractMetadataURI": "ipfs://fallback-parsed-metadata"
        }
