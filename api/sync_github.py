import os
import subprocess

BATA_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'bata'))

def start_github_sync():
    """ 
    核心逻辑：
    1. 从 Supabase 获取新数据写入 bata 文件夹（文件操作）。
    2. 使用 git 命令将 bata 文件夹的变化推送到 GitHub。
    """
    print("开始执行: Supabase -> Bata(File) -> GitHub 的同步任务")
    
    try:
        # 模拟：这里可以写 Python 代码从 Supabase 查询增量数据并写入 `./bata/xxx.json`
        print("-> 正在写入 bata 文件夹...")
        
        # Git 操作 (前提是环境里已配置好 git remote origin)
        os.chdir(os.path.dirname(BATA_PATH)) # 切换到项目根目录
        
        # 此处是命令行实时代码。实际部署时建议使用 `GitPython` 库管理
        subprocess.run(["git", "add", "bata/*"], check=True)
        subprocess.run(["git", "commit", "-m", "Auto sync: data from Supabase cache"], check=True)
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("-> 成功推送到 GitHub 仓库")
        
        # 模拟：清理 Supabase 1小时前的数据
        print("-> Supabase 缓存清理完成")
        
    except Exception as e:
        print(f"GitHub 同步失败: {e}")