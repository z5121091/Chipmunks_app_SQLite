#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Generate icon for Data Sync Service
"""

from PIL import Image, ImageDraw

# Create icon at multiple sizes (Windows ICO needs 256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
sizes = [256, 128, 64, 48, 32, 16]
images = []

for size in sizes:
    # Create transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background circle (purple gradient effect - using solid color)
    margin = size // 8
    draw.ellipse(
        [margin, margin, size - margin, size - margin],
        fill=(79, 70, 229, 255)  # Indigo color matching app theme
    )
    
    # Sync arrows
    # Top arrow pointing up
    arrow_size = size // 4
    center = size // 2
    top_y = size // 4
    bottom_y = size * 3 // 4
    
    # Upper arrow (pointing up)
    draw.polygon([
        (center, top_y),
        (center - arrow_size // 2, top_y + arrow_size),
        (center + arrow_size // 2, top_y + arrow_size)
    ], fill=(255, 255, 255, 255))
    
    # Lower arrow (pointing down)
    draw.polygon([
        (center, bottom_y),
        (center - arrow_size // 2, bottom_y - arrow_size),
        (center + arrow_size // 2, bottom_y - arrow_size)
    ], fill=(255, 255, 255, 255))
    
    images.append(img)

# Save as ICO
images[0].save('icon.ico', format='ICO', sizes=[(s, s) for s in sizes], append_images=images[1:])
print("Icon created: icon.ico")
