document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();
    const container = document.getElementById('worksContainer');
    if (!container) return;

    try {
        // 请求作品列表
        console.log("正在请求 /works 接口..."); // 添加调试日志
        const res = await fetch(`${API_BASE_URL}/works`);
        
        if (!res.ok) {
            // 如果状态码不是200，直接抛出异常防止解析报错
            throw new Error(`网络请求失败，状态码: ${res.status}`);
        }

        const data = await res.json();
        console.log("获取到的数据:", data); // 打印出来给您看
        
        container.innerHTML = '';

        // === 最严谨的安全拦截 ===
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

        // 循环渲染
        data.forEach(work => {
            if (!work.title) return;
            const div = document.createElement('div');
            div.className = 'work-card';
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
                    <div class="stats-bar">
                        <span><i class="fa-regular fa-eye"></i> ${views}</span>
                        <span><i class="fa-regular fa-heart"></i> ${likes}</span>
                        <span><i class="fa-regular fa-comment-dots"></i> ${comments}</span>
                    </div>
                </div>
            `;
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                if (work.id) window.location.href = `/work/detail.html?id=${work.id}`;
            });
            container.appendChild(div);
        });

    } catch (err) {
        console.error("作品库加载报错:", err);
        container.innerHTML = `
            <div class="empty-state" style="border-color:#ffcdd2; color:#d32f2f;">
                <i class="fa-regular fa-circle-exclamation" style="color:#d32f2f;"></i>
                <h3>加载数据失败</h3>
                <p>错误信息: ${err.message || '未知错误'}</p>
            </div>
        `;
    }
});