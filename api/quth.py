import os
import json
import random
import string
from flask import make_response, redirect

# 获取当前文件所在目录的上级目录 (即项目根目录)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATA_DIR = os.path.join(BASE_DIR, 'bata')

# 全局变量 (演示用，生产应使用 Redis)
CAPTCHA_STORE = ""

# ==========================================
# 1. 生成纯代码 SVG 验证码
# ==========================================
def generate_captcha_image():
    global CAPTCHA_STORE
    
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    code = ''.join(random.choices(chars, k=4))
    CAPTCHA_STORE = code

    width, height = 120, 40
    lines = []
    for _ in range(5):
        x1, y1 = random.randint(0, width), random.randint(0, height)
        x2, y2 = random.randint(0, width), random.randint(0, height)
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="#d3cce6" stroke-width="1.5" />')
    
    dots = []
    for _ in range(50):
        x, y = random.randint(0, width), random.randint(0, height)
        dots.append(f'<circle cx="{x}" cy="{y}" r="{random.randint(1, 2)}" fill="#e0d6ef" />')

    svg_data = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
    <rect width="{width}" height="{height}" fill="#f8f5fc" rx="4" ry="4"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#4a2c6d" letter-spacing="4">
        {code}
    </text>
    {''.join(lines)}
    {''.join(dots)}
</svg>'''
    
    response = make_response(svg_data)
    response.headers['Content-Type'] = 'image/svg+xml'
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    return response

# ==========================================
# 2. 本地账号密码登录校验 (对接 /bata/users)
# ==========================================
def handle_login(request_data):
    username = request_data.get('username')
    password = request_data.get('password')
    captcha = request_data.get('captcha')
    
    # 1. 校验验证码
    if not captcha or captcha.upper() != CAPTCHA_STORE.upper():
        return {"success": False, "message": "验证码错误"}

    # 2. 读取 /bata/users 下的所有文件，查找该用户
    users_dir = os.path.join(BATA_DIR, 'users')
    if not os.path.exists(users_dir):
        return {"success": False, "message": "用户不存在"}

    found_user = None
    for file in os.listdir(users_dir):
        if file.endswith('.json'):
            file_path = os.path.join(users_dir, file)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                    # 匹配用户名
                    if user_data.get('username') == username:
                        found_user = user_data
                        break
            except Exception:
                continue

    # 3. 校验用户和密码
    if not found_user:
        return {"success": False, "message": "用户不存在"}
    
    if found_user.get('password') != password:
        return {"success": False, "message": "密码错误"}

    # 登录成功，返回用户信息，由 app.py 写入 session
    return {
        "success": True, 
        "message": "登录成功", 
        "user": {"id": found_user.get('id'), "name": found_user.get('username')}
    }

# ==========================================
# 3. GitHub OAuth 跳转逻辑
# ==========================================
def handle_github_oauth():
    # 这里的 Client_ID 核对过您最初截图提供的，修正了字母
    CLIENT_ID = "Ov23lifXykyiDvGXUGiT" 
    redirect_uri = "http://localhost:5000/api/auth/github/callback"
    return redirect(f"https://github.com/login/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={redirect_uri}")