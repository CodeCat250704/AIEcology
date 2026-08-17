const API_BASE = '/api/project';

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();
    loadProjects('all');
});

// 分类切换事件
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadProjects(this.dataset.type);
    });
});

// 加载数据
async function loadProjects(type) {
    const container = document.getElementById('projectList');
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">加载中...</div>';
    try {
        const res = await fetch(`${API_BASE}/list?type=${type}`);
        const data = await res.json();

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="fa-regular fa-folder-open"></i><p>当前分类下暂无项目</p></div>`;
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'project-card';
            
            // 【替换点】：将 Emoji 替换为 FontAwesome 图标
            let badgeHtml = '';
            if (item.type === 'recruit') {
                badgeHtml = `<span class="badge"><i class="fa-solid fa-users"></i> 组队</span>`;
            } else if (item.type === 'report') {
                badgeHtml = `<span class="badge"><i class="fa-regular fa-newspaper"></i> 周报</span>`;
            } else if (item.type === 'collab') {
                badgeHtml = `<span class="badge"><i class="fa-solid fa-handshake"></i> 协作</span>`;
            } else {
                badgeHtml = `<span class="badge"><i class="fa-regular fa-file-lines"></i> 动态</span>`;
            }
            
            div.innerHTML = `
                ${badgeHtml}
                <h3>${item.title}</h3>
                <p>${item.description || item.content || '暂无描述'}</p>
                <div class="card-meta">
                    <span><i class="fa-regular fa-user"></i> ${item.author}</span>
                    <span><i class="fa-regular fa-clock"></i> ${item.date}</span>
                </div>
            `;
            div.addEventListener('click', () => window.location.href = `/project/detail.html?id=${item.id}`);
            container.appendChild(div);
        });

        // 模拟刷新统计数据 (后端预留接口)
        document.getElementById('recruitNum').innerText = data.filter(i => i.type === 'recruit').length;
        document.getElementById('reportNum').innerText = data.filter(i => i.type === 'report').length;

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state" style="color:#d32f2f;">加载失败，请检查网络</div>`;
    }
}