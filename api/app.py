import os
import json
import time
from flask import Flask, jsonify, request, make_response, send_from_directory
from threading import Thread

# 统一导入名称
from quth import generate_captcha_image, handle_login, handle_github_oauth 
from sync_github import start_github_sync

app = Flask(__name__)

# 获取项目根目录 (D:\AIluntan)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATA_DIR = os.path.join(BASE_DIR, 'bata')

# ==========================================
# 核心工具：安全读取 Bata 文件夹中的数据
# ==========================================
def read_bata_json(sub_path):
    file_path = os.path.join(BATA_DIR, sub_path)
    if not os.path.exists(file_path):
        return None
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"读取 {file_path} 报错: {e}")
        return None

# ==========================================
# 1. 前端静态页面托管 (解决 404 关键)
# ==========================================
@app.route('/')
def serve_root():
    # 访问根目录 / 时，重定向到 /home/index.html
    return send_from_directory(os.path.join(BASE_DIR, 'home'), 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    # 将所有的 /home/xxx, /gitin/xxx, /picture/xxx 请求指向本地的真实文件夹
    # 这样前端直接访问 http://localhost:5000/home/index.html 就能看到页面了
    return send_from_directory(BASE_DIR, path)

# ==========================================
# 2. 数据接口 (API)
# ==========================================
@app.route('/api/banner', methods=['GET'])
def get_banner():
    # 从 bata/meta/banner.json 读取轮播图配置（如果存在）
    # 这里暂且返回一个硬编码结构，供前端测试，避免报错空数据
    return jsonify({
        "title": "AI 项目生态社区",
        "description": "演示开放、设计共享，欢迎来到 AIGC 爱好者的创意世界！",
        "icon": "fa-solid fa-rocket"
    })

@app.route('/api/links', methods=['GET'])
def get_links():
    data = read_bata_json('meta/quick_links.json')
    return jsonify(data if data else [])

@app.route('/api/timeline', methods=['GET'])
def get_timeline():
    data = read_bata_json('meta/timeline.json')
    return jsonify(data if data else [])

@app.route('/api/forum', methods=['GET'])
def get_forum():
    posts_dir = os.path.join(BATA_DIR, 'posts')
    all_posts = []
    if os.path.exists(posts_dir):
        for file in os.listdir(posts_dir):
            if file.endswith('.json'):
                post_data = read_bata_json(f'posts/{file}')
                if post_data: all_posts.append(post_data)
    all_posts.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(all_posts)

@app.route('/api/projects', methods=['GET'])
def get_projects():
    proj_dir = os.path.join(BATA_DIR, 'projects')
    all_projects = []
    if os.path.exists(proj_dir):
        for file in os.listdir(proj_dir):
            if file.endswith('.json'):
                proj_data = read_bata_json(f'projects/{file}')
                if proj_data: all_projects.append(proj_data)
    all_projects.sort(key=lambda x: x.get('views', 0), reverse=True)
    return jsonify(all_projects)

# ==========================================
# 3. 登录相关接口
# ==========================================
@app.route('/api/auth/captcha', methods=['GET'])
def get_captcha():
    # 调用 quth.py 中的生成验证码方法，返回图片
    return generate_captcha_image()

@app.route('/api/auth/login', methods=['POST'])
def login_endpoint():
    # 调用 quth.py 中的验证逻辑
    data = request.get_json()
    return jsonify(handle_login(data))

@app.route('/api/auth/github', methods=['GET'])
def github_login():
    # 调用 quth.py 中的 GitHub 跳转
    return handle_github_oauth()

# ==========================================
# 4. 启动与同步线程
# ==========================================
def run_sync_scheduler():
    while True:
        time.sleep(3600) # 1小时
        print("触发 GitHub 同步...")
        start_github_sync()
            
if __name__ == '__main__':
    Thread(target=run_sync_scheduler, daemon=True).start()
    print("Flask 服务已启动，请访问: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)