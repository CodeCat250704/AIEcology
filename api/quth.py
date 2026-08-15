# api/quth.py
import random
import string
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from flask import make_response, redirect

# 全局变量（仅用于生产前的临时演示，生产环境建议用 Redis 存储验证码）
CAPTCHA_STORE = ""

# 1. 生成纯图片验证码 (返回图片二进制)
def generate_captcha_image():
    global CAPTCHA_STORE
    # 生成4位随机验证码 (数字+字母)
    code = ''.join(random.choices(string.ascii_letters + string.digits, k=4))
    CAPTCHA_STORE = code
    
    img = Image.new('RGB', (120, 40), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    draw.text((10, 10), code, fill=(74, 44, 109), font=font)
    
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    
    response = make_response(buf.read())
    response.headers['Content-Type'] = 'image/png'
    return response

# 2. 验证码校验与登录逻辑 (对接 app.py 的 /api/auth/login)
def handle_login(request_data):
    # 接收前端传来的参数
    username = request_data.get('username')
    password = request_data.get('password')
    captcha = request_data.get('captcha')
    
    # 验证验证码 (这里只是演示逻辑)
    if not captcha or captcha.lower() != CAPTCHA_STORE.lower():
        return {"success": False, "message": "验证码错误"}
    
    # 如果验证码通过，查询 bata/users/ 下的文件，进行真实比对。
    # 这里暂时预留为成功返回，方便前端测试
    return {"success": True, "message": "登录成功", "redirect_url": "/home/index.html"}

# 3. GitHub OAuth 跳转逻辑 (对接 app.py 的 /api/auth/github)
def handle_github_oauth():
    # 替换为您的 GitHub App Client ID
    CLIENT_ID = "your_github_client_id"
    redirect_uri = "http://localhost:5000/api/auth/github/callback"
    github_auth_url = f"https://github.com/login/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={redirect_uri}"
    
    # 直接执行 302 跳转
    return redirect(github_auth_url)