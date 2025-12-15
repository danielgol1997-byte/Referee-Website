#!/usr/bin/env python3
"""
Process animated GIF to remove white background and make it transparent
"""

from PIL import Image, ImageSequence
import os

def remove_background_from_gif(input_path, output_path, threshold=240):
    """
    Remove white/light background from animated GIF
    
    Args:
        input_path: Path to input GIF
        output_path: Path to save output GIF
        threshold: RGB threshold for background removal (0-255)
    """
    print(f"📂 Opening: {input_path}")
    
    # Open the GIF
    img = Image.open(input_path)
    
    # Process each frame
    frames = []
    durations = []
    
    print(f"🎬 Processing {img.n_frames} frames...")
    
    for i, frame in enumerate(ImageSequence.Iterator(img)):
        print(f"   Frame {i+1}/{img.n_frames}...", end='\r')
        
        # Convert frame to RGBA
        frame = frame.convert('RGBA')
        
        # Get pixel data
        datas = frame.getdata()
        
        # Create new pixel data with transparency
        new_data = []
        for item in datas:
            # Check if pixel is background (light/white)
            # Also handle alpha channel if present
            if len(item) == 4:
                r, g, b, a = item
            else:
                r, g, b = item
                a = 255
            
            # If pixel is mostly white/light, make it transparent
            if r > threshold and g > threshold and b > threshold:
                new_data.append((r, g, b, 0))
            else:
                new_data.append((r, g, b, a))
        
        # Update frame data
        frame.putdata(new_data)
        frames.append(frame)
        
        # Try to get frame duration
        try:
            duration = frame.info.get('duration', 100)
            durations.append(duration)
        except:
            durations.append(100)
    
    print(f"\n✅ Processed {len(frames)} frames")
    
    # Save as animated GIF with transparency
    print(f"💾 Saving to: {output_path}")
    
    frames[0].save(
        output_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        disposal=2,  # Clear frame before rendering next
        transparency=0,
        optimize=False  # Don't optimize to preserve transparency
    )
    
    print(f"✅ Saved GIF with transparency!")
    
    # Also save as WebP (better compression, supports animation and transparency)
    webp_path = output_path.replace('.gif', '.webp')
    print(f"💾 Converting to WebP: {webp_path}")
    
    try:
        frames[0].save(
            webp_path,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            quality=90,
            method=6,
            lossless=False
        )
        print(f"✅ Saved WebP with transparency!")
    except Exception as e:
        print(f"⚠️  WebP save failed: {e}")
    
    return output_path, webp_path

if __name__ == "__main__":
    input_gif = "hand-phone-temp.gif"
    output_gif = "public/logo/whistle-practice.gif"
    
    print("=" * 60)
    print("🎨 GIF Background Removal")
    print("=" * 60)
    print()
    
    if not os.path.exists(input_gif):
        print(f"❌ Input file not found: {input_gif}")
        exit(1)
    
    try:
        gif_out, webp_out = remove_background_from_gif(input_gif, output_gif, threshold=240)
        
        print()
        print("=" * 60)
        print("✅ SUCCESS!")
        print("=" * 60)
        print(f"📁 GIF:  {gif_out}")
        print(f"📁 WebP: {webp_out}")
        print()
        print("🎯 Next steps:")
        print("   The logo has been saved and is ready to use!")
        print("   We'll update the Header component to use the new logo.")
        
    except Exception as e:
        print()
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

