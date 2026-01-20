#!/usr/bin/env python3
"""Extract all unique decision reasons from all PNG images"""

from PIL import Image
import pytesseract
import re
from pathlib import Path

decisions_folder = Path('/Users/daniel/Downloads/UEFA2025-1/Resource/medias/images/decisions')
png_files = sorted(decisions_folder.glob('*.png'))

all_reasons = set()

print(f"Processing {len(png_files)} images...")

for i, png_file in enumerate(png_files, 1):
    if i % 50 == 0:
        print(f"  Processed {i}/{len(png_files)}...")
    
    try:
        img = Image.open(png_file)
        text = pytesseract.image_to_string(img, lang='eng')
        
        # Extract lines that look like reasons
        lines = [l.strip() for l in text.split('\n') if l.strip()]
        
        for line in lines:
            line_upper = line.upper()
            # Skip decision type lines
            if any(x in line_upper for x in ['PLAY ON', 'FREE KICK', 'PENALTY KICK', 'NO OFFENCE', 'INDIRECT', 'DIRECT', 'DROP BALL', 'KICK OFF']):
                continue
            # Skip very short or very long lines
            if len(line) < 8 or len(line) > 200:
                continue
            # Look for reason-like text
            if any(word in line.lower() for word in ['not', 'no', 'but', 'when', 'by', 'off', 'supports', 'extended', 'challenge', 'interfering', 'gaining', 'obstructing', 'impact', 'action', 'clearly', 'obvious', 'deliberately', 'rebounds', 'deflects', 'saved', 'touching', 'playing', 'ball', 'opponent', 'teammate']):
                # Clean up
                line = re.sub(r'\s+', ' ', line)
                line = line.strip('.,;:()[]©•o|')
                # Remove leading "o" or "©" that OCR might add
                line = re.sub(r'^[o©•|\s]+', '', line)
                line = line.strip()
                if 8 <= len(line) <= 180:
                    all_reasons.add(line)
    except Exception as e:
        print(f"  Error processing {png_file.name}: {e}")

# Sort and print
unique_reasons = sorted(all_reasons, key=str.lower)

print(f"\nFound {len(unique_reasons)} unique reasons:\n")

# Save to file
output_file = Path('referee-training/scripts/all-extracted-reasons.txt')
output_file.parent.mkdir(parents=True, exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    for reason in unique_reasons:
        f.write(f"{reason}\n")
        print(reason)

print(f"\nSaved to: {output_file}")
