import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
import cv2
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import pypdfium2 as pdfium

app = FastAPI(title="UniFinance PaddleOCR Service")

# Allow CORS for Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR (downloads models on first run if not cached)
ocr = PaddleOCR(lang='en')

CATEGORY_MAPPING = [
    {"category": "Food", "keywords": ["starbucks", "mcdonald", "burger", "coffee", "cafe", "food", "eats", "restaurant", "groceries", "supermarket", "coles", "woolworths", "pizza", "deli", "bakery", "pub", "grill", "kitchen", "diner", "subway"]},
    {"category": "Transport", "keywords": ["uber", "lyft", "taxi", "train", "bus", "subway", "transit", "fuel", "petrol", "gas", "shell", "chevron", "exxon", "mobil", "bp", "caltex", "flight", "airline", "railway"]},
    {"category": "Subscriptions", "keywords": ["netflix", "spotify", "aws", "azure", "google cloud", "github", "adobe", "subscriptions", "monthly", "membership", "cloud", "billing", "domain", "hosting"]},
    {"category": "Education", "keywords": ["university", "college", "book", "tuition", "course", "udemy", "coursera", "textbook", "library", "school", "exam", "fees", "class"]},
    {"category": "Shopping", "keywords": ["amazon", "walmart", "target", "ebay", "clothing", "zara", "h&m", "nike", "store", "mall", "apparel", "fashion", "shoes", "electronics", "best buy", "k-mart", "kmart", "boutique", "woolworths"]},
    {"category": "Entertainment", "keywords": ["cinema", "movie", "theater", "concert", "game", "nintendo", "playstation", "xbox", "steam", "ticket", "show", "amusement", "event", "club", "bar", "drinks"]},
    {"category": "Hostel/Rent", "keywords": ["rent", "landlord", "hostel", "accommodation", "lease", "lodging", "hotel", "airbnb", "room"]},
    {"category": "Health", "keywords": ["chemist warehouse", "chemist", "pharmacy", "doctor", "hospital", "dentist", "medical", "walgreens", "cvs", "physio", "clinic", "medicine", "prescription"]}
]

def classify_category(merchant: str, raw_text: str) -> str:
    search_text = f"{merchant} {raw_text}".lower()
    for item in CATEGORY_MAPPING:
        for kw in item["keywords"]:
            if kw in search_text:
                return item["category"]
    return "Miscellaneous"

def extract_merchant(lines: List[str]) -> str:
    # 1. Clean list of candidates from the top of the receipt
    search_limit = min(len(lines), 10)
    
    # Common words that are not merchants
    stop_words = {"date", "time", "invoice", "receipt", "order", "tel", "phone", "tax", "gst", "total", "subtotal", "cashier", "cash", "visa", "mastercard"}
    
    for i in range(search_limit):
        line = lines[i].strip()
        if not line:
            continue
        
        # Check if line contains stop words
        line_lower = line.lower()
        if any(sw in line_lower for sw in stop_words):
            continue
            
        # Skip lines that are mostly numeric (phone numbers, dates, zip codes)
        if len(re.sub(r'[^0-9]', '', line)) > len(re.sub(r'[^a-zA-Z]', '', line)):
            continue
            
        # If it looks like a business name (at least 3 characters and has letters)
        if len(line) >= 3 and any(c.isalpha() for c in line):
            return line
            
    return "Unknown Merchant"

def extract_amount(raw_text: str, lines: List[str]) -> float:
    # Heuristics for final amount extraction
    amount_patterns = [
        r'(?:total|grand\s+total|amount\s+due|total\s+due|charged|payment|paid)\s*(?::|\$|usd|inr|aud|rs\.?)?\s*([\d,]+\.\d{2})',
        r'[\d,]+\.\d{2}'
    ]
    
    # Try finding lines with amount labels
    for pattern in amount_patterns[:1]:
        for line in lines:
            match = re.search(pattern, line, re.IGNORECASE)
            if match:
                try:
                    val = float(match.group(1).replace(',', ''))
                    if val > 0:
                        return val
                except ValueError:
                    pass
                    
    # Fallback: scan all numbers and take the largest one that is not a credit card or huge number
    all_floats = []
    for line in lines:
        matches = re.findall(r'\b\d+[\.,]\d{2}\b', line)
        for m in matches:
            try:
                val = float(m.replace(',', '').replace(' ', ''))
                if 0.1 <= val < 100000.0:
                    all_floats.append(val)
            except ValueError:
                pass
                
    if all_floats:
        # Usually total is the largest or near the bottom, let's take the max
        return max(all_floats)
        
    return 0.0

def extract_currency(raw_text: str) -> str:
    text_upper = raw_text.upper()
    
    # Match currency codes
    for code in ["AUD", "USD", "INR", "EUR", "GBP"]:
        if code in text_upper:
            return code
            
    # Match currency symbols
    symbol_mapping = {
        "$": "USD", # Default symbol $ to USD or AUD based on keywords
        "₹": "INR",
        "€": "EUR",
        "£": "GBP"
    }
    
    if "AUD" in text_upper or "AU$" in text_upper:
        return "AUD"
        
    for symbol, code in symbol_mapping.items():
        if symbol in raw_text:
            if symbol == "$" and ("AUD" in text_upper or "A$" in text_upper):
                return "AUD"
            return code
            
    return "USD" # Default fallback

def extract_date(lines: List[str]) -> str:
    # Regexes for various date formats
    date_patterns = [
        r'\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b', # YYYY-MM-DD
        r'\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b', # DD/MM/YYYY or MM/DD/YYYY
        r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b', # Jan 15, 2026
        r'\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})\b' # 15 Jan 2026
    ]
    
    months = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }
    
    for line in lines:
        line_lower = line.lower()
        for idx, pattern in enumerate(date_patterns):
            match = re.search(pattern, line_lower)
            if match:
                try:
                    if idx == 0: # YYYY-MM-DD
                        year, month, day = int(match.group(1)), int(match.group(2)), int(match.group(3))
                        return f"{year:04d}-{month:02d}-{day:02d}"
                    elif idx == 1: # DD/MM/YYYY
                        p1, p2, year_val = int(match.group(1)), int(match.group(2)), int(match.group(3))
                        if year_val < 100:
                            year_val += 2000
                        # Check typical day/month orders
                        if p1 > 12:
                            return f"{year_val:04d}-{p2:02d}-{p1:02d}" # DD/MM/YYYY
                        else:
                            # Assume DD/MM/YYYY or MM/DD/YYYY
                            return f"{year_val:04d}-{p2:02d}-{p1:02d}"
                    else: # Textual month patterns
                        month_str = match.group(1) if idx == 2 else match.group(2)
                        day_val = int(match.group(2)) if idx == 2 else int(match.group(1))
                        year_val = int(match.group(3))
                        month_val = months.get(month_str[:3], 1)
                        return f"{year_val:04d}-{month_val:02d}-{day_val:02d}"
                except Exception:
                    pass
                    
    # Return today's date formatted as ISO if no date found
    return datetime.today().strftime('%Y-%m-%d')

def order_points(pts):
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)] # Top-left
    rect[2] = pts[np.argmax(s)] # Bottom-right
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)] # Top-right
    rect[3] = pts[np.argmax(diff)] # Bottom-left
    return rect

def four_point_transform(image, pts):
    rect = order_points(pts)
    (tl, tr, br, bl) = rect
    widthA = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    widthB = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    maxWidth = max(int(widthA), int(widthB))
    heightA = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    heightB = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    maxHeight = max(int(heightA), int(heightB))
    dst = np.array([
        [0, 0],
        [maxWidth - 1, 0],
        [maxWidth - 1, maxHeight - 1],
        [0, maxHeight - 1]], dtype="float32")
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, M, (maxWidth, maxHeight))
    return warped

def preprocess_image(img):
    h, w = img.shape[:2]
    max_dim = max(h, w)
    
    # 1. Downscale extremely large images to speed up OCR and keep memory down
    if max_dim > 1800:
        scale = 1800 / max_dim
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
        h, w = img.shape[:2]

    # 2. Gray, Denoise & Enhance Contrast (CLAHE)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # 3. Boundary detection and Auto-Cropping
    edged = cv2.Canny(enhanced, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edged, kernel, iterations=1)
    
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]
    
    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        
        # Look for a 4-corner contour that occupies at least 12% of the total frame
        if len(approx) == 4 and cv2.contourArea(c) > 0.12 * (h * w):
            try:
                pts = approx.reshape(4, 2)
                warped = four_point_transform(img, pts)
                wh, ww = warped.shape[:2]
                
                # Check if warped image size and ratio is plausible
                if ww > 80 and wh > 80 and 0.18 < (ww / wh) < 5.5:
                    # Return color warped receipt if detection is clean
                    return warped
            except Exception:
                pass

    # Fallback: return the contrast-enhanced image converted back to BGR color space
    return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

def extract_texts_from_ocr_result(result) -> List[str]:
    lines = []
    if not result:
        return lines
    
    # PaddleOCR can return a list of results (one per page or detection block)
    for block in result:
        if isinstance(block, dict):
            # New Paddlex dict format
            if 'rec_texts' in block:
                lines.extend([str(t) for t in block['rec_texts']])
        elif isinstance(block, list):
            # Classic nested list format: [[[bbox, (text, score)], ...]]
            for line in block:
                if isinstance(line, list) and len(line) > 1:
                    text_tuple = line[1]
                    if isinstance(text_tuple, tuple) and len(text_tuple) > 0:
                        lines.append(str(text_tuple[0]))
                elif isinstance(line, str):
                    lines.append(line)
    return lines

@app.post("/ocr/extract")
async def extract_ocr(file: UploadFile = File(...)):
    # Validate file format
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
    _, ext = os.path.splitext(file.filename.lower())
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported types: JPG, JPEG, PNG, WEBP, PDF")

    try:
        contents = await file.read()
        raw_text_lines = []

        if ext == ".pdf":
            # PDF Processing using pypdfium2 to render pages to images
            pdf = pdfium.PdfDocument(contents)
            for page in pdf:
                # Render page to PIL image
                bitmap = page.render(scale=2) # 2x scale for better OCR quality
                pil_img = bitmap.to_pil()
                # Convert to numpy/cv2 format
                cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
                
                # Perform OCR on page
                result = ocr.ocr(cv_img)
                raw_text_lines.extend(extract_texts_from_ocr_result(result))
        else:
            # Image Processing
            nparr = np.frombuffer(contents, np.uint8)
            cv_img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if cv_img is None:
                raise HTTPException(status_code=400, detail="Failed to decode image file")
                
            # Preprocess/Optimize image (contrast, denoising, auto-cropping)
            processed_img = preprocess_image(cv_img)
            
            # Perform OCR on image
            result = ocr.ocr(processed_img)
            raw_text_lines.extend(extract_texts_from_ocr_result(result))

        if not raw_text_lines:
            # Fallback when no text detected
            return {
                "success": True,
                "data": {
                    "amount": 0.0,
                    "currency": "USD",
                    "merchant": "Unknown Merchant",
                    "date": datetime.today().strftime('%Y-%m-%d'),
                    "category": "Miscellaneous",
                    "description": "Purchased from Unknown Merchant"
                }
            }

        raw_text = "\n".join(raw_text_lines)
        
        # Extraction logic
        merchant = extract_merchant(raw_text_lines)
        amount = extract_amount(raw_text, raw_text_lines)
        currency = extract_currency(raw_text)
        date = extract_date(raw_text_lines)
        category = classify_category(merchant, raw_text)
        description = f"Purchased from {merchant}"

        return {
            "success": True,
            "data": {
                "amount": amount,
                "currency": currency,
                "merchant": merchant,
                "date": date,
                "category": category,
                "description": description
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"OCR Processing failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

