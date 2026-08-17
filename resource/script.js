document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();
    loadResources();
});

async function loadResources() {
    const container = document.getElementById('resourceList');
    container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-gray);">加载资源中...</div>';
    try {
        const res = await fetch('/api/resource/list');
        const data = await res.json();
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-gray);border:2px dashed var(--border-light);border-radius:16px;">暂无资源，欢迎上传第一个！</div>`;
            return;
        }
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'app-card';
            const cover = item.cover_url ? `<img src="${item.cover_url}">` : `<i class="fa-regular fa-circle-question" style="color:var(--light-purple);"></i>`;
            div.innerHTML = `
                <div class="app-cover">${cover}</div>
                <div class="app-info">
                    <h3>${item.title}</h3>
                    <div class="desc">${item.description || '暂无描述'}</div>
                    <div class="app-meta">
                        <span><i class="fa-regular fa-user"></i> ${item.author}</span>
                        <button class="btn-download-card" onclick="event.stopPropagation(); window.open('${item.download_url}','_blank');">下载</button>
                    </div>
                </div>
            `;
            div.addEventListener('click', () => window.location.href = `/resource/detail.html?id=${item.id}`);
            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#d32f2f;padding:60px;">加载失败</div>`;
    }
}