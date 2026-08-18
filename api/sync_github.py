import os
import json
import subprocess
import time
from supabase import create_client, Client

# 1. 配置 Supabase 连接（使用您的真实密钥）
SUPABASE_URL = "https://tapavesjpfegmieqsxrt.supabase.co"
# 请把这里换成您在前几步获取的真实 Secret Key！
SUPABASE_KEY = "sb_secret_这里替换为您真实的SecretKey"
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# 项目根目录路径
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
BATA_DIR = os.path.join(PROJECT_ROOT, 'bata')

def sync_table(table_name, local_subdir):
    """通用的同步函数：拉取 Supabase 数据 -> 写入本地 -> 提交 Git -> 清理缓存"""
    print(f"▶ 正在同步表: {table_name}")
    try:
        # 1. 计算 1 小时前的时间戳 (秒)
        one_hour_ago = time.time() - 3600

        # 2. 从 Supabase 获取过去 1 小时内的新数据
        response = supabase.table(table_name).select('*').gte('created_at', one_hour_ago).execute()
        data_list = response.data

        if data_list:
            # 3. 写入本地 bata 文件夹
            local_dir = os.path.join(BATA_DIR, local_subdir)
            if not os.path.exists(local_dir): os.makedirs(local_dir)
            
            for item in data_list:
                file_path = os.path.join(local_dir, f'{item["id"]}.json')
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(item, f, ensure_ascii=False, indent=4)
            print(f"✅ 成功写入 {len(data_list)} 条数据到本地 {local_subdir}。")
        else:
            print(f"ℹ️ {table_name} 1小时内无新增数据。")
            return # 如果没有新数据，直接跳过后续提交，节省资源

        # 4. 推送到 GitHub
        os.chdir(PROJECT_ROOT)
        subprocess.run(["git", "add", f"bata/{local_subdir}/*"], check=True)
        
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            commit_msg = f"Auto sync: {local_subdir} data {time.strftime('%Y-%m-%d %H:%M')}"
            subprocess.run(["git", "commit", "-m", commit_msg], check=True)
            subprocess.run(["git", "push", "origin", "main"], check=True)
            print(f"✅ 成功将 {local_subdir} 推送到 GitHub。")
        else:
            print(f"ℹ️ {local_subdir} 无 Git 变更，跳过 Push。")

        # 5. 清理 Supabase 中已同步的旧缓存 (释放 1GB 空间)
        supabase.table(table_name).delete().lt('created_at', one_hour_ago).execute()
        print(f"✅ 已清理 {table_name} 中超过 1 小时的缓存数据。")

    except Exception as e:
        print(f"❌ 同步表 {table_name} 失败: {e}")

def start_github_sync():
    print("\n▶ 开始执行: Supabase -> Bata -> GitHub 自动同步循环...")
    # 分别同步三个核心表
    sync_table('works_cache', 'works')
    sync_table('projects_cache', 'projects')
    sync_table('resources_cache', 'resources')
    print("▶ 本轮同步任务执行完毕。\n")

if __name__ == '__main__':
    start_github_sync()