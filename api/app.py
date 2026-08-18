import os
import json
import time
import requests
import urllib3
import hashlib
import uuid
from flask import Flask, jsonify, request, send_from_directory, session
from threading import Thread
from datetime import timedelta
from werkzeug.utils import secure_filename
from supabase import create_client, Client

# 禁用 SSL 警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# 引入自己的业务逻辑
from quth import generate_captcha_image, handle_login, handle_github_oauth
from sync_github import start_github_sync

app = Flask(__name__)

# ==========================================
# 0. Flask 核心配置
# ==========================================
app.secret_key = 'your-super-secret-key-change-this-now'
app.permanent_session_lifetime = timedelta(days=7)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BATA_DIR = os.path.join(BASE_DIR, 'bata')

# 上传目录配置
UPLOAD_FOLDER = os.path.join(BATA_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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
# 0.5 Supabase 客户端配置 (请把这段粘贴到这里！)
# ==========================================
SUPABASE_URL = "https://tapavesjpfegmieqsxrt.supabase.co"
# 【注意】：请将下面这一行替换为您在 GitHub 页面点开眼睛图标后看到的真实 Secret Key！
SUPABASE_KEY = "sb_secret_X21Tff2eroALJyfQjQMiVA_uyRLAYdi"  
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# ==========================================
# 1. 前端静态页面托管
# ==========================================
@app.route('/')
def serve_root():
    return send_from_directory(os.path.join(BASE_DIR, 'home'), 'index.html')

@app.route('/<path:path>')
def serve_static_files(path):
    return send_from_directory(BASE_DIR, path)

@app.route('/bata/uploads/<path:filename>')
def serve_uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ==========================================
# 2. 首页及通用数据接口
# ==========================================
@app.route('/api/banner', methods=['GET'])
def get_banner():
    return jsonify({
        "title": "AI 项目生态社区",
        "description": "演示开放、设计共享，欢迎来到 AIGC 爱好者的创意世界！",
        "icon": "fa-solid fa-rocket"
    })

@app.route('/api/links', methods=['GET'])
def get_links():
    return jsonify(read_bata_json('meta/quick_links.json') or [])

@app.route('/api/timeline', methods=['GET'])
def get_timeline():
    return jsonify(read_bata_json('meta/timeline.json') or [])

@app.route('/api/forum', methods=['GET'])
def get_forum():
    posts_dir = os.path.join(BATA_DIR, 'posts')
    all_posts = []
    if os.path.exists(posts_dir):
        for file in os.listdir(posts_dir):
            if file.endswith('.json'):
                post_data = read_bata_json(f'posts/{file}')
                if post_data:
                    all_posts.append(post_data)
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
                if proj_data:
                    all_projects.append(proj_data)
    all_projects.sort(key=lambda x: x.get('views', 0), reverse=True)
    return jsonify(all_projects)

# ==========================================
# 3. 作品库模块 (Works)
# ==========================================
@app.route('/api/works', methods=['GET'])
def get_works():
    works_dir = os.path.join(BATA_DIR, 'works')
    all_works = []
    if os.path.exists(works_dir):
        for file in os.listdir(works_dir):
            if file.endswith('.json'):
                work_data = read_bata_json(f'works/{file}')
                if work_data:
                    all_works.append(work_data)
    all_works.sort(key=lambda x: x.get('views', 0), reverse=True)
    return jsonify(all_works)

@app.route('/api/works/detail', methods=['GET'])
def get_work_detail():
    work_id = request.args.get('id')
    if not work_id:
        return jsonify({"success": False, "message": "缺少ID参数"}), 400
    work_data = read_bata_json(f'works/{work_id}.json')
    if not work_data:
        return jsonify({"success": False, "message": "作品不存在"}), 404
    return jsonify(work_data)

@app.route('/api/works/create', methods=['POST'])
def create_work():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401

        title = request.form.get('title')
        category = request.form.get('category')
        description = request.form.get('description')
        project_url = request.form.get('project_url')

        if not title or not description:
            return jsonify({"success": False, "message": "标题和描述不能为空"}), 400

        cover_url = None
        if 'cover_img' in request.files:
            file = request.files['cover_img']
            if file and allowed_file(file.filename):
                unique_name = f"{int(time.time())}_{secure_filename(file.filename)}"
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
                file.save(save_path)
                cover_url = f"/bata/uploads/{unique_name}"

        doc_content = None
        if 'doc_txt' in request.files:
            file = request.files['doc_txt']
            if file and allowed_file(file.filename):
                doc_content = file.read().decode('utf-8')

        work_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_work = {
            "id": work_id, "title": title, "category": category,
            "description": description, "project_url": project_url,
            "cover_url": cover_url, "doc_content": doc_content,
            "author": session['user'].get('name'), "date": now,
            "views": 0, "likes": 0, "comments": 0
        }

        works_dir = os.path.join(BATA_DIR, 'works')
        if not os.path.exists(works_dir):
            os.makedirs(works_dir)
        with open(os.path.join(works_dir, f'{work_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(new_work, f, ensure_ascii=False, indent=4)

        # 【关键补充】：同步写入 Supabase 缓存，并带上时间戳
        cache_work = new_work.copy()
        cache_work['created_at'] = time.time()
        supabase.table('works_cache').insert(cache_work).execute()

        return jsonify({"success": True, "message": "作品发布成功"})
    except Exception as e:
        print(f"发布作品报错: {e}")
        print(f"🚨 致命报错详情: {e}")  # 加个显眼的符号，方便在终端找
        import traceback
        traceback.print_exc()          # 这一行会打印出最底层的详细报错堆栈
    return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/works/view', methods=['POST'])
def increment_view():
    try:
        data = request.get_json()
        work_id = data.get('id')
        file_path = os.path.join(BATA_DIR, 'works', f'{work_id}.json')
        if not os.path.exists(file_path):
            return jsonify({"success": False, "message": "作品不存在"}), 404

        with open(file_path, 'r', encoding='utf-8') as f:
            work_data = json.load(f)
        work_data['views'] = work_data.get('views', 0) + 1

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(work_data, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "views": work_data['views']})
    except Exception as e:
        print(f"增加观看数报错: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/works/comment', methods=['POST'])
def post_work_comment():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401

        data = request.get_json()
        work_id = data.get('work_id')
        content = data.get('content')

        if not work_id or not content:
            return jsonify({"success": False, "message": "参数不完整"}), 400

        work_file = os.path.join(BATA_DIR, 'works', f'{work_id}.json')
        if not os.path.exists(work_file):
            return jsonify({"success": False, "message": "作品不存在"}), 404

        with open(work_file, 'r', encoding='utf-8') as f:
            work_data = json.load(f)

        if 'work_comments' not in work_data:
            work_data['work_comments'] = []

        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_comment = {
            "id": str(uuid.uuid4()),
            "author": session['user'].get('name'),
            "content": content,
            "date": now
        }
        work_data['work_comments'].append(new_comment)
        work_data['comments'] = len(work_data['work_comments'])

        with open(work_file, 'w', encoding='utf-8') as f:
            json.dump(work_data, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "评论发布成功", "comments": work_data['comments']})
    except Exception as e:
        print(f"作品评论报错: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

# ==========================================
# 4. 项目中心模块 (Projects)
# ==========================================
PROJECT_DIR = os.path.join(BATA_DIR, 'projects')
os.makedirs(PROJECT_DIR, exist_ok=True)

@app.route('/api/project/list', methods=['GET'])
def get_project_list():
    filter_type = request.args.get('type', 'all')
    all_items = []
    if os.path.exists(PROJECT_DIR):
        for file in os.listdir(PROJECT_DIR):
            if file.endswith('.json'):
                data = read_bata_json(f'projects/{file}')
                if data and (filter_type == 'all' or data.get('type') == filter_type):
                    all_items.append(data)
    all_items.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(all_items)

@app.route('/api/project/detail', methods=['GET'])
def get_project_detail():
    post_id = request.args.get('id')
    if not post_id:
        return jsonify({"success": False, "message": "缺少ID参数"}), 400
    data = read_bata_json(f'projects/{post_id}.json')
    if not data:
        return jsonify({"success": False, "message": "项目不存在"}), 404
    return jsonify(data)

@app.route('/api/project/create', methods=['POST'])
def create_project_post():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401

        p_type = request.form.get('type')
        title = request.form.get('title')
        content = request.form.get('content')

        if not p_type or not title or not content:
            return jsonify({"success": False, "message": "请填写完整信息"}), 400

        post_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_post = {
            "id": post_id, "type": p_type, "title": title,
            "content": content, "author": session['user'].get('name'), "date": now
        }
        with open(os.path.join(PROJECT_DIR, f'{post_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(new_post, f, ensure_ascii=False, indent=4)

        # 【关键补充】：同步写入 Supabase 缓存，并带上时间戳
        cache_post = new_post.copy()
        cache_post['created_at'] = time.time()
        supabase.table('projects_cache').insert(cache_post).execute()

        return jsonify({"success": True, "message": "发布成功"})
    except Exception as e:
        print(f"项目发布报错: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500
    
@app.route('/api/project/apply', methods=['POST'])
def apply_project():
    try:
        if 'user' not in session: return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        proj_id = data.get('project_id')
        file_path = os.path.join(PROJECT_DIR, f'{proj_id}.json')
        if not os.path.exists(file_path): return jsonify({"success": False, "message": "项目不存在"}), 404

        with open(file_path, 'r', encoding='utf-8') as f:
            proj_data = json.load(f)

        user_name = session['user'].get('name')
        if user_name in proj_data.get('members', []): return jsonify({"success": False, "message": "您已是成员"}), 400
        if user_name in proj_data.get('applicants', []): return jsonify({"success": False, "message": "已申请，请等待审核"}), 400

        proj_data.setdefault('applicants', []).append(user_name)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(proj_data, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "申请已提交，等待管理员审核"})
    except Exception as e:
        print(f"申请错误: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/project/approve', methods=['POST'])
def approve_application():
    try:
        if 'user' not in session: return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        proj_id = data.get('project_id')
        applicant_name = data.get('username')
        file_path = os.path.join(PROJECT_DIR, f'{proj_id}.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            proj_data = json.load(f)

        if proj_data.get('author') != session['user'].get('name'):
            return jsonify({"success": False, "message": "只有项目管理员可以审核"}), 403

        if applicant_name in proj_data.get('applicants', []):
            proj_data['applicants'].remove(applicant_name)
            proj_data.setdefault('members', []).append(applicant_name)
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(proj_data, f, ensure_ascii=False, indent=4)
            return jsonify({"success": True, "message": f"{applicant_name} 已加入团队"})
        return jsonify({"success": False, "message": "未找到该申请"}), 400
    except Exception as e:
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/project/log/create', methods=['POST'])
def create_project_log():
    try:
        if 'user' not in session: return jsonify({"success": False, "message": "请先登录"}), 401
        proj_id = request.form.get('project_id')
        log_title = request.form.get('title')
        log_content = request.form.get('content')
        code_snippet = request.form.get('code_snippet')

        file_path = os.path.join(PROJECT_DIR, f'{proj_id}.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            proj_data = json.load(f)

        if session['user'].get('name') not in proj_data.get('members', []):
            return jsonify({"success": False, "message": "您不是该项目的成员，无法发布日志"}), 403

        img_urls = []
        if 'log_images' in request.files:
            files = request.files.getlist('log_images')
            for file in files:
                if file and allowed_file(file.filename):
                    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(time.time())}_{secure_filename(file.filename)}")
                    file.save(save_path)
                    img_urls.append(f"/bata/uploads/{os.path.basename(save_path)}")

        new_log = {
            "id": str(uuid.uuid4()),
            "author": session['user'].get('name'),
            "date": time.strftime("%Y-%m-%d %H:%M:%S"),
            "title": log_title,
            "content": log_content,
            "images": img_urls,
            "code_snippets": code_snippet
        }
        proj_data.setdefault('logs', []).append(new_log)
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(proj_data, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "开发日志发布成功"})
    except Exception as e:
        print(f"日志错误: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

# ==========================================
# 5. 资源中心模块 (Resources) + 评论模块
# ==========================================
RES_DIR = os.path.join(BATA_DIR, 'resources')
COMMENT_DIR = os.path.join(BATA_DIR, 'comments')
os.makedirs(RES_DIR, exist_ok=True)
os.makedirs(COMMENT_DIR, exist_ok=True)

@app.route('/api/resource/list', methods=['GET'])
def get_resources():
    all_res = []
    if os.path.exists(RES_DIR):
        for file in os.listdir(RES_DIR):
            if file.endswith('.json'):
                data = read_bata_json(f'resources/{file}')
                if data:
                    all_res.append(data)
    all_res.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(all_res)

@app.route('/api/resource/detail', methods=['GET'])
def get_resource_detail():
    raw_query = request.query_string.decode('utf-8')
    res_id = None
    if 'id=' in raw_query:
        res_id = raw_query.split('id=')[1].split('&')[0]
    if not res_id:
        res_id = request.args.get('id')
    if not res_id:
        return jsonify({"error": "Missing ID"}), 400
    data = read_bata_json(f'resources/{res_id}.json')
    if not data:
        return jsonify({"error": "Not found"}), 404
    return jsonify(data)

@app.route('/api/resource/create', methods=['POST'])
def create_resource():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401

        title = request.form.get('title')
        category = request.form.get('category')
        description = request.form.get('description')
        download_url = request.form.get('download_url')

        if not title or not download_url:
            return jsonify({"success": False, "message": "标题和下载地址不能为空"}), 400

        cover_url = None
        if 'cover_img' in request.files:
            file = request.files['cover_img']
            if file and allowed_file(file.filename):
                save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(time.time())}_{secure_filename(file.filename)}")
                file.save(save_path)
                cover_url = f"/bata/uploads/{os.path.basename(save_path)}"

        screenshot_urls = []
        if 'screenshots' in request.files:
            files = request.files.getlist('screenshots')
            for file in files:
                if file and allowed_file(file.filename):
                    save_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{int(time.time())}_{secure_filename(file.filename)}")
                    file.save(save_path)
                    screenshot_urls.append(f"/bata/uploads/{os.path.basename(save_path)}")

        doc_content = None
        if 'doc_txt' in request.files:
            file = request.files['doc_txt']
            if file and allowed_file(file.filename):
                doc_content = file.read().decode('utf-8')

        res_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_res = {
            "id": res_id, "title": title, "category": category,
            "description": description, "download_url": download_url,
            "cover_url": cover_url, "screenshots": screenshot_urls,
            "doc_content": doc_content, "author": session['user'].get('name'),
            "date": now
        }
        with open(os.path.join(RES_DIR, f'{res_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(new_res, f, ensure_ascii=False, indent=4)

        # 【关键补充】：同步写入 Supabase 缓存，并带上时间戳
        cache_res = new_res.copy()
        cache_res['created_at'] = time.time()
        supabase.table('resources_cache').insert(cache_res).execute()

        return jsonify({"success": True, "message": "资源发布成功"})
    except Exception as e:
        print(f"资源发布错误: {e}")
        return jsonify({"success": False, "message": "服务器错误"}), 500
    
@app.route('/api/resource/comments', methods=['GET'])
def get_comments():
    raw_query = request.query_string.decode('utf-8')
    res_id = None
    if 'resource_id=' in raw_query:
        res_id = raw_query.split('resource_id=')[1].split('&')[0]
    if not res_id:
        res_id = request.args.get('resource_id')
    if not res_id:
        return jsonify([])
    all_comments = []
    if os.path.exists(COMMENT_DIR):
        for file in os.listdir(COMMENT_DIR):
            if file.endswith('.json'):
                try:
                    with open(os.path.join(COMMENT_DIR, file), 'r', encoding='utf-8') as f:
                        c_data = json.load(f)
                        if c_data.get('resource_id') == res_id:
                            all_comments.append(c_data)
                except:
                    continue
    all_comments.sort(key=lambda x: x.get('date', ''), reverse=True)
    return jsonify(all_comments)

@app.route('/api/resource/comment', methods=['POST'])
def post_comment():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        res_id = data.get('resource_id')
        content = data.get('content')
        score = int(data.get('score', 0))

        if not res_id or not content or score < 1:
            return jsonify({"success": False, "message": "参数不完整"}), 400

        c_id = str(uuid.uuid4())
        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_comment = {
            "id": c_id, "resource_id": res_id, "author": session['user'].get('name'),
            "content": content, "score": score, "date": now, "replies": []
        }
        with open(os.path.join(COMMENT_DIR, f'{c_id}.json'), 'w', encoding='utf-8') as f:
            json.dump(new_comment, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "评论发布成功"})
    except Exception as e:
        print(f"评论错误: {e}")
        return jsonify({"success": False, "message": "内部错误"}), 500

@app.route('/api/resource/reply', methods=['POST'])
def post_reply():
    try:
        if 'user' not in session:
            return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        parent_id = data.get('parent_id')
        content = data.get('content')

        if not parent_id or not content:
            return jsonify({"success": False, "message": "参数不完整"}), 400

        now = time.strftime("%Y-%m-%d %H:%M:%S")
        new_reply = {"author": session['user'].get('name'), "content": content, "date": now}

        parent_file = os.path.join(COMMENT_DIR, f'{parent_id}.json')
        if not os.path.exists(parent_file):
            return jsonify({"success": False, "message": "原评论不存在"}), 404

        with open(parent_file, 'r', encoding='utf-8') as f:
            parent_data = json.load(f)
        parent_data['replies'].append(new_reply)
        with open(parent_file, 'w', encoding='utf-8') as f:
            json.dump(parent_data, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "追评发布成功"})
    except Exception as e:
        print(f"追评错误: {e}")
        return jsonify({"success": False, "message": "内部错误"}), 500

# ==========================================
# 6. 用户认证模块 (Auth)
# ==========================================
@app.route('/api/auth/captcha', methods=['GET'])
def get_captcha():
    return generate_captcha_image()

@app.route('/api/auth/login', methods=['POST'])
def login_endpoint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "请求数据为空"}), 400
        result = handle_login(data)
        if result.get('success'):
            user_info = result.get('user')
            if user_info:
                session['user'] = user_info
                session.permanent = True
        return jsonify(result)
    except Exception as e:
        print(f"登录接口报错: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/auth/register', methods=['POST'])
def register_endpoint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "message": "请求数据为空"}), 400
        username = data.get('username')
        password = data.get('password')
        email = data.get('email')

        if not username or not password or not email:
            return jsonify({"success": False, "message": "请填写完整信息"}), 400

        users_dir = os.path.join(BATA_DIR, 'users')
        if os.path.exists(users_dir):
            for file in os.listdir(users_dir):
                if file.endswith('.json'):
                    file_path = os.path.join(users_dir, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            user_data = json.load(f)
                            if user_data.get('username') == username:
                                return jsonify({"success": False, "message": "该用户名已被注册"}), 400
                            if user_data.get('email') == email:
                                return jsonify({"success": False, "message": "该邮箱已被注册"}), 400
                    except:
                        continue

        unique_id = hashlib.md5(f"{username}{time.time()}".encode()).hexdigest()[:16]
        new_user = {
            "id": unique_id, "username": username, "password": password,
            "email": email, "role": "user", "github_login": None,
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        if not os.path.exists(users_dir):
            os.makedirs(users_dir)
        with open(os.path.join(users_dir, f'{username}.json'), 'w', encoding='utf-8') as f:
            json.dump(new_user, f, ensure_ascii=False, indent=4)
        return jsonify({"success": True, "message": "注册成功"})
    except Exception as e:
        print(f"注册接口报错: {e}")
        return jsonify({"success": False, "message": "服务器内部错误"}), 500

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    if 'user' in session:
        return jsonify({"isLoggedIn": True, "user": session['user']})
    return jsonify({"isLoggedIn": False, "user": None})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user', None)
    return jsonify({"success": True})

@app.route('/api/auth/github', methods=['GET'])
def github_login():
    return handle_github_oauth()

@app.route('/api/auth/github/callback', methods=['GET'])
def github_callback():
    code = request.args.get('code')
    if not code:
        return "授权失败，未获取到 Code", 400

    CLIENT_ID = "Ov23lifXykYiDvGXUGiT"
    CLIENT_SECRET = "bf406fb0a4fe00b1d55f323fa779a05cef2ac125"

    token_url = "https://github.com/login/oauth/access_token"
    headers = {'Accept': 'application/json'}
    payload = {'client_id': CLIENT_ID, 'client_secret': CLIENT_SECRET, 'code': code}

    try:
        response = requests.post(token_url, headers=headers, data=payload, verify=False)
        token_data = response.json()
        access_token = token_data.get('access_token')
        if not access_token:
            return "获取 Access Token 失败", 400
    except Exception as e:
        print(f"请求 GitHub Token 错误: {e}")
        return "GitHub 服务请求异常", 500

    try:
        user_res = requests.get("https://api.github.com/user", headers={'Authorization': f'Bearer {access_token}'}, verify=False)
        github_user = user_res.json()
    except Exception as e:
        print(f"获取 GitHub 用户信息错误: {e}")
        return "获取用户信息失败", 500

    github_id = str(github_user.get('id'))
    github_name = github_user.get('login', 'unknown')

    user_file_path = os.path.join(BATA_DIR, 'users', f'{github_id}.json')
    session['user'] = {"id": github_id, "name": github_name}
    session.permanent = True

    if not os.path.exists(user_file_path):
        users_dir = os.path.join(BATA_DIR, 'users')
        if not os.path.exists(users_dir):
            os.makedirs(users_dir)
        new_user = {
            "id": github_id, "username": f"gh_{github_name}", "password": "github_oauth",
            "email": github_user.get('email', f"{github_id}@github.com"),
            "role": "user", "github_login": github_name
        }
        with open(user_file_path, 'w', encoding='utf-8') as f:
            json.dump(new_user, f, ensure_ascii=False, indent=4)

    return f"<script>window.location.href='/home/index.html';</script>"

# ==========================================
# 7. 后台同步任务
# ==========================================
def run_sync_scheduler():
    while True:
        time.sleep(3600)
        print("触发 GitHub 同步...")
        start_github_sync()

# ==========================================
# 8. 协议中心接口
# ==========================================
LEGAL_DIR = os.path.join(BATA_DIR, 'legal')
os.makedirs(LEGAL_DIR, exist_ok=True)

@app.route('/api/legal/list', methods=['GET'])
def get_legal_docs():
    all_docs = []
    if os.path.exists(LEGAL_DIR):
        for file in os.listdir(LEGAL_DIR):
            if file.endswith('.json'):
                data = read_bata_json(f'legal/{file}')
                if data: all_docs.append(data)
    return jsonify(all_docs)

# ==========================================
# 9. 用户个人中心统计数据接口
# ==========================================
@app.route('/api/user/stats', methods=['GET'])
def get_user_stats():
    if 'user' not in session:
        return jsonify({"works": 0, "projects": 0, "resources": 0})
    
    current_user = session['user'].get('name')
    count_works = 0
    count_projects = 0
    count_resources = 0

    works_dir = os.path.join(BATA_DIR, 'works')
    if os.path.exists(works_dir):
        for file in os.listdir(works_dir):
            if file.endswith('.json'):
                data = read_bata_json(f'works/{file}')
                if data and data.get('author') == current_user:
                    count_works += 1

    proj_dir = os.path.join(BATA_DIR, 'projects')
    if os.path.exists(proj_dir):
        for file in os.listdir(proj_dir):
            if file.endswith('.json'):
                data = read_bata_json(f'projects/{file}')
                if data:
                    if data.get('author') == current_user or current_user in data.get('members', []):
                        count_projects += 1

    res_dir = os.path.join(BATA_DIR, 'resources')
    if os.path.exists(res_dir):
        for file in os.listdir(res_dir):
            if file.endswith('.json'):
                data = read_bata_json(f'resources/{file}')
                if data and data.get('author') == current_user:
                    count_resources += 1

    return jsonify({
        "works": count_works,
        "projects": count_projects,
        "resources": count_resources
    })

# ==========================================
# 10. 用户个人中心资料与密码接口
# ==========================================
@app.route('/api/user/profile/update', methods=['POST'])
def update_user_profile():
    try:
        if 'user' not in session: return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        nickname = data.get('nickname')
        bio = data.get('bio')
        current_user = session['user'].get('name')
        
        users_dir = os.path.join(BATA_DIR, 'users')
        for file in os.listdir(users_dir):
            if file.endswith('.json'):
                file_path = os.path.join(users_dir, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                if user_data.get('username') == current_user:
                    user_data['nickname'] = nickname
                    user_data['bio'] = bio
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(user_data, f, ensure_ascii=False, indent=4)
                    return jsonify({"success": True, "message": "资料更新成功"})
        return jsonify({"success": False, "message": "用户数据异常"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": "服务器错误"}), 500

@app.route('/api/user/password/update', methods=['POST'])
def update_user_password():
    try:
        if 'user' not in session: return jsonify({"success": False, "message": "请先登录"}), 401
        data = request.get_json()
        old_pw = data.get('old_password')
        new_pw = data.get('new_password')
        current_user = session['user'].get('name')
        
        users_dir = os.path.join(BATA_DIR, 'users')
        for file in os.listdir(users_dir):
            if file.endswith('.json'):
                file_path = os.path.join(users_dir, file)
                with open(file_path, 'r', encoding='utf-8') as f:
                    user_data = json.load(f)
                if user_data.get('username') == current_user:
                    if user_data.get('password') != old_pw:
                        return jsonify({"success": False, "message": "原密码错误"}), 400
                    user_data['password'] = new_pw
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(user_data, f, ensure_ascii=False, indent=4)
                    return jsonify({"success": True, "message": "密码修改成功"})
        return jsonify({"success": False, "message": "用户数据异常"}), 404
    except Exception as e:
        return jsonify({"success": False, "message": "服务器错误"}), 500

# ==========================================
# 11. 启动入口
# ==========================================
if __name__ == '__main__' or __name__ == 'api.app':
    Thread(target=run_sync_scheduler, daemon=True).start()
    print("Flask 服务已启动，请访问: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)