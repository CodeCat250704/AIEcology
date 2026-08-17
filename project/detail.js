document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const container = document.getElementById('detailContainer');

    if (!id) {
        if (container) container.innerHTML = '<div style="color:#d32f2f;">错误：缺少项目ID参数</div>';
        return;
    }

    try {
        const res = await fetch(`/api/project/detail?id=${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const item = await res.json();
        if (!item || !item.id) {
            container.innerHTML = `<div style="padding:40px;color:#d32f2f;">该项目不存在或已被删除</div>`;
            return;
        }

        renderDetail(item);

    } catch (err) {
        console.error('加载失败:', err);
        container.innerHTML = `<div style="padding:40px;color:#d32f2f;">加载失败，请检查网络</div>`;
    }
});

function renderDetail(item) {
    const container = document.getElementById('detailContainer');

    // 1. 动态生成徽章与图标（严格使用 FontAwesome，不用 Emoji）
    let badgeHtml = '';
    let iconHtml = '';
    if (item.type === 'recruit') {
        badgeHtml = `<span class="badge"><i class="fa-solid fa-users"></i> 招募/组队</span>`;
        iconHtml = `<i class="fa-solid fa-users" style="font-size:4rem;color:#d0c8db;"></i>`;
    } else if (item.type === 'report') {
        badgeHtml = `<span class="badge"><i class="fa-regular fa-newspaper"></i> 项目周报</span>`;
        iconHtml = `<i class="fa-regular fa-newspaper" style="font-size:4rem;color:#d0c8db;"></i>`;
    } else if (item.type === 'collab') {
        badgeHtml = `<span class="badge"><i class="fa-solid fa-handshake"></i> 协作/资源</span>`;
        iconHtml = `<i class="fa-solid fa-handshake" style="font-size:4rem;color:#d0c8db;"></i>`;
    } else {
        badgeHtml = `<span class="badge"><i class="fa-regular fa-file-lines"></i> 项目动态</span>`;
        iconHtml = `<i class="fa-regular fa-file-lines" style="font-size:4rem;color:#d0c8db;"></i>`;
    }

    // 2. 处理换行显示
    const contentHtml = (item.content || '暂无详细内容').replace(/\n/g, '<br>');

    // 3. 渲染双栏布局
    container.innerHTML = `
        <div class="detail-body-grid" style="background:#fff; border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:30px;">
            <!-- 左侧：图标与基础信息 -->
            <div class="detail-left" style="align-items: flex-start;">
                <div class="detail-icon-lg" style="width:100px; height:100px; background:var(--bg-light-purple); border-radius:var(--radius-lg); display:flex; align-items:center; justify-content:center;">
                    ${iconHtml}
                </div>
                <div style="margin-top:10px;">
                    <h1 style="font-size:1.8rem; color:var(--primary-purple); font-weight:700; margin-bottom:10px;">${item.title}</h1>
                    ${badgeHtml}
                    <div style="margin-top:15px; color:var(--text-gray); font-size:0.9rem; line-height:1.8;">
                        <div><i class="fa-regular fa-user"></i> 发布者: ${item.author}</div>
                        <div><i class="fa-regular fa-clock"></i> 发布时间: ${item.date}</div>
                    </div>
                </div>
            </div>

            <!-- 右侧：详细内容 -->
            <div class="detail-right">
                <div style="border-bottom:1px solid var(--border-light); padding-bottom:15px; margin-bottom:15px;">
                    <h4 style="font-weight:600; color:var(--text-main); font-size:1.1rem;"><i class="fa-regular fa-message"></i> 项目详情</h4>
                </div>
                <div class="desc-text" style="font-size:1rem; line-height:1.8; color:var(--text-main);">
                    ${contentHtml}
                </div>
            </div>
        </div>
        
        <!-- 底部操作栏 -->
        <div style="margin-top:30px; display:flex; justify-content:center;">
            <a href="/project/index.html" style="color:var(--primary-purple); text-decoration:none; font-weight:500; display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-arrow-left"></i> 返回项目中心
            </a>
        </div>
    `;
}