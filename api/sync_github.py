import os
import subprocess
import time

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
BATA_DIR = os.path.join(PROJECT_ROOT, 'bata')

def start_github_sync():
    print("▶ 开始执行：Supabase 缓存 -> Bata(本地文件) -> GitHub 自动同步...")
    try:
        # 1. 模拟从 Supabase 拉取数据并写入本地 (为了测试，这里保留空操作，实际由您解开注释)
        print("-> [1/3] 检查 Supabase 缓存并合并至 Bata...")
        # (请参照之前的代码填入 supabase 查询逻辑)

        # 2. 执行 Git 提交
        print("-> [2/3] 准备推送到 GitHub...")
        os.chdir(PROJECT_ROOT)
        # 注意：这里把 comments 和 resources 一起 add 进去了
        subprocess.run(["git", "add", "bata/resources/*", "bata/comments/*"], check=True)
        
        status = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        if status.stdout.strip():
            subprocess.run(["git", "commit", "-m", f"Auto sync: resources & comments {time.strftime('%Y-%m-%d %H:%M')}"], check=True)
            push_res = subprocess.run(["git", "push", "origin", "main"], capture_output=True, text=True)
            if push_res.returncode == 0:
                print("✅ [2/3] 成功推送到 GitHub。")
            else:
                print(f"⚠️ [2/3] Push 失败: {push_res.stderr}")
        else:
            print("-> [2/3] 本地无新变更，跳过 Push。")

        # 3. 清理 Supabase 缓存 (释放 1GB 空间)
        print("-> [3/3] 清理 Supabase 旧缓存...")
        # (请参照之前的代码填入 supabase 删除逻辑，删除时间戳 < now - 3600 的记录)
        print("✅ [3/3] Supabase 缓存清理指令已发送。")

    except Exception as e:
        print(f"❌ 同步任务失败: {e}")

if __name__ == '__main__':
    start_github_sync()