#!/usr/bin/python
# -*- coding: utf-8 -*-
"""
生成托盘图标
运行此脚本生成 icon.ico 文件
"""

try:
    from PIL import Image, ImageDraw
    
    # 创建64x64图标
    size = 64
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制圆形背景（紫色）
    draw.ellipse([4, 4, size-4, size-4], fill=(79, 70, 229, 255))
    
    # 绘制同步符号
    # 上箭头
    draw.polygon([(size//2, 12), (size//2-8, 24), (size//2+8, 24)], fill=(255, 255, 255, 255))
    # 下箭头
    draw.polygon([(size//2, size-12), (size//2-8, size-24), (size//2+8, size-24)], fill=(255, 255, 255, 255))
    
    # 保存为ico
    img.save('icon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("图标已生成: icon.ico")
    
except ImportError:
    print("请先安装 Pillow: pip install Pillow")
