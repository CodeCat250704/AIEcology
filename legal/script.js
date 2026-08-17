document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();
    await loadLegalDocs();
});

async function loadLegalDocs() {
    const container = document.getElementById('legalGrid');
    if (!container) return;

    try {
        const res = await fetch('/api/legal/list');
        if (!res.ok) throw new Error('获取失败');
        const data = await res.json();

        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--text-gray);">当前没有配置任何规范文档，请向 /bata/legal/ 添加 JSON 文件。</div>`;
            return;
        }

        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'legal-card';
            div.innerHTML = `
                <div class="card-title">
                    <i class="${item.icon || 'fa-regular fa-file'}"></i>
                    ${item.title}
                </div>
                <div class="card-desc">点击展开查阅详细内容...</div>
                <div class="legal-detail-box" id="detail_${item.id}">
                    <pre>${item.content || '暂无详细内容'}</pre>
                </div>
            `;

            div.addEventListener('click', () => {
                const box = div.querySelector('.legal-detail-box');
                if (box) {
                    if (box.classList.contains('active')) {
                        box.classList.remove('active');
                    } else {
                        document.querySelectorAll('.legal-detail-box.active').forEach(el => el.classList.remove('active'));
                        box.classList.add('active');
                    }
                }
            });
            container.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#d32f2f;">加载失败，请检查后端接口</div>`;
    }
}