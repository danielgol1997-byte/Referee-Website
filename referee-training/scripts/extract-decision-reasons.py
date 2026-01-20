#!/usr/bin/env python3
"""
Extract decision reasons from UEFA decision PNG images using OCR.
"""

import os
import re
from pathlib import Path
from collections import defaultdict

try:
    from PIL import Image
    import pytesseract
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call(["pip", "install", "pytesseract", "Pillow"])
    from PIL import Image
    import pytesseract

def extract_text_from_image(image_path):
    """Extract text from a PNG image using OCR."""
    try:
        image = Image.open(image_path)
        # Use OCR to extract text
        text = pytesseract.image_to_string(image, lang='eng')
        return text.strip()
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return ""

def find_decision_reason(text):
    """Extract the decision reason from the OCR text."""
    reasons = []
    
    # Clean up text
    text = re.sub(r'\s+', ' ', text)
    text = text.strip()
    
    # Pattern 1: Lines starting with © or similar symbols (often used for reasons)
    copyright_pattern = r'[©©•]\s*(.+?)(?:\n|$)'
    matches = re.findall(copyright_pattern, text, re.IGNORECASE | re.MULTILINE)
    reasons.extend([m.strip() for m in matches if len(m.strip()) > 10])
    
    # Pattern 2: Lines that explain why (contain words like "no", "not", "because", "due to", etc.)
    explanation_keywords = ['no ', 'not ', 'because', 'due to', 'as a result', 'since', 'when', 'if']
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        # Skip if it's just decision types or categories
        if any(skip in line.upper() for skip in ['PLAY ON', 'FREE KICK', 'PENALTY', 'OFFENCE', 'SANCTION', 'CARELESS', 'RECKLESS', 'SERIOUS FOUL']):
            continue
        # Check if line contains explanation keywords and is substantial
        if any(keyword in line.lower() for keyword in explanation_keywords) and len(line) > 15:
            reasons.append(line)
    
    # Pattern 3: Look for sentences/phrases that explain the decision
    # These often come after decision types
    sentences = re.split(r'[\.\n]', text)
    for sentence in sentences:
        sentence = sentence.strip()
        # Skip short or decision-type-only sentences
        if len(sentence) < 15:
            continue
        # Skip if it's just a list of decision types
        if all(word in sentence.upper() for word in ['FREE KICK', 'PENALTY']):
            continue
        # Look for explanatory phrases
        if any(indicator in sentence.lower() for indicator in ['supports', 'extended', 'stopped', 'challenge', 'contact', 'force', 'intent', 'position']):
            reasons.append(sentence)
    
    # Pattern 4: Look for specific reason patterns
    reason_patterns = [
        r'(.+?)\s+/\s+(.+?)(?:\n|$)',
        r'(.+?)\s+or\s+(.+?)(?:\n|$)',
    ]
    for pattern in reason_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                reasons.extend([m.strip() for m in match if len(m.strip()) > 10])
            elif len(match.strip()) > 10:
                reasons.append(match.strip())
    
    # Clean and deduplicate reasons
    cleaned_reasons = []
    for reason in reasons:
        reason = re.sub(r'\s+', ' ', reason)
        reason = reason.strip('.,;:()[]')
        # Filter out very short or very long reasons
        if 10 <= len(reason) <= 200:
            # Remove duplicates (case-insensitive)
            if not any(r.lower() == reason.lower() for r in cleaned_reasons):
                cleaned_reasons.append(reason)
    
    return cleaned_reasons if cleaned_reasons else None

def main():
    decisions_folder = Path("/Users/daniel/Downloads/UEFA2025-1/Resource/medias/images/decisions")
    
    if not decisions_folder.exists():
        print(f"Folder not found: {decisions_folder}")
        return
    
    # Get all PNG files
    png_files = sorted(decisions_folder.glob("*.png"))
    print(f"Found {len(png_files)} PNG files")
    
    # Extract reasons from all images
    all_reasons = []
    reasons_by_file = {}
    
    for png_file in png_files:
        print(f"Processing {png_file.name}...")
        text = extract_text_from_image(png_file)
        reasons = find_decision_reason(text)
        
        if reasons:
            all_reasons.extend(reasons)
            reasons_by_file[png_file.name] = reasons
            print(f"  Found {len(reasons)} reason(s):")
            for r in reasons:
                print(f"    - {r[:80]}...")
        else:
            # If no reason found, save full text for manual review
            reasons_by_file[png_file.name] = [text[:200] if text else "(no text extracted)"]
            print(f"  No clear reason found. Text preview: {text[:80]}...")
    
    # Find unique reasons (case-insensitive deduplication)
    seen = set()
    unique_reasons = []
    for reason in all_reasons:
        reason_lower = reason.lower().strip()
        if reason_lower not in seen and len(reason.strip()) > 5:
            seen.add(reason_lower)
            unique_reasons.append(reason)
    
    unique_reasons.sort(key=str.lower)
    
    print(f"\n{'='*80}")
    print(f"Found {len(unique_reasons)} unique decision reasons:")
    print(f"{'='*80}\n")
    
    for i, reason in enumerate(unique_reasons, 1):
        print(f"{i}. {reason}")
    
    # Save to file
    output_file = Path("referee-training/scripts/decision-reasons.txt")
    output_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("UNIQUE DECISION REASONS FROM UEFA IMAGES\n")
        f.write("="*80 + "\n\n")
        for reason in unique_reasons:
            f.write(f"{reason}\n")
    
    print(f"\nResults saved to: {output_file}")
    
    # Also save detailed mapping
    detail_file = Path("referee-training/scripts/decision-reasons-by-file.txt")
    with open(detail_file, 'w', encoding='utf-8') as f:
        f.write("DECISION REASONS BY FILE\n")
        f.write("="*80 + "\n\n")
        for filename, reasons_list in sorted(reasons_by_file.items()):
            f.write(f"{filename}:\n")
            if isinstance(reasons_list, list):
                for r in reasons_list:
                    f.write(f"  - {r}\n")
            else:
                f.write(f"  - {reasons_list}\n")
            f.write("\n")
    
    print(f"Detailed mapping saved to: {detail_file}")
    
    return unique_reasons

if __name__ == "__main__":
    main()
