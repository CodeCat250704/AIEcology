document.addEventListener('DOMContentLoaded', async () => {
    // 检查登录状态（全局函数，由 home/script.js 提供）
    if (typeof checkLoginStatus === 'function') {
        await checkLoginStatus(); 
    }

    const container = document.getElementById('worksContainer');
    if (!container) return; // 如果找不到容器，直接退出

    try {
        // 注意：这里不定义 API_BASE_URL，直接使用 home/script.js 中定义的全局变量
        const res = await fetch(`${API_BASE_URL}/works`);
        
        // 如果接口请求不成功（比如返回404、500），直接抛出错误
        if (!res.ok) {
            throw new Error(`网络请求失败 (状态码: ${res.status})`);
        }

        const data = await res.json();
        
        container.innerHTML = '';

        // === 【核心安全拦截】 ===
        // 如果 data 不是数组，或者数组长度为0，直接显示空状态
        // 这能 100% 解决 "data.forEach is not a function" 这种低级报错
        if (!data || !Array.isArray(data) || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-images"></i>
                    <h3>还没有作品</h3>
                    <p>成为第一个发布作品的创作者吧！</p>
                </div>
            `;
            return;
        }

        // 循环渲染作品卡片
        data.forEach(work => {
            // 如果某条数据连标题都没有，直接跳过，防止大面积渲染错误
            if (!work.title) return;

            const div = document.createElement('div');
            div.className = 'work-card';
            
            // 容错处理，防止缺失字段导致页面出现 "undefined"
            const views = work.views || 0;
            const likes = work.likes || 0;
            const comments = work.comments || 0;

            const imgHtml = work.cover_url 
                ? `<img src="${work.cover_url}" alt="${work.title}">` 
                : `<i class="fa-regular fa-image no-img"></i>`;

            div.innerHTML = `
                <div class="work-cover">${imgHtml}</div>
                <div class="work-info">
                    <h3>${work.title}</h3>
                    <div class="meta">
                        <span><i class="fa-regular fa-user"></i> ${work.author || '匿名'}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${work.date || '未知时间'}</span>
                    </div>
                    <div class="stats-bar" style="margin-top:12px; font-size:0.85rem; color:var(--text-gray); display:flex; gap:15px; border-top:1px solid var(--border-light); padding-top:10px;">
                        <span><i class="fa-regular fa-eye"></i> ${views}</span>
                        <span><i class="fa-regular fa-heart"></i> ${likes}</span>
                        <span><i class="fa-regular fa-comment-dots"></i> ${comments}</span>
                    </div>
                </div>
            `;
            
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                if (work.id) {
                    window.location.href = `/works/detail.html?id=${work.id}`;
                }
            });

            container.appendChild(div);
        });

    } catch (err) {
        // 捕获所有错误（包括网络错误、JSON解析错误）
        console.error('作品库加载失败:', err);
        
        // 为了避免用户看到令人沮丧的大红字，我们在界面上展示一个更温和的提示
        container.innerHTML = `
            <div class="empty-state" style="border-color:#ffcdd2; color:#d32f2f;">
                <i class="fa-regular fa-circle-exclamation" style="color:#d32f2f;"></i>
                <h3>加载遇到了点小问题</h3>
                <p>如果您是第一次访问，请尝试发布第一个作品。</p>
            </div>
        `;
    }
});