document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus(); 

    const container = document.getElementById('worksContainer');
    try {
        const res = await fetch('/api/works');
        const data = await res.json();
        
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-images"></i>
                    <h3>还没有作品</h3>
                    <p>成为第一个发布作品的创作者吧！</p>
                </div>
            `;
            return;
        }

        data.forEach(work => {
            const div = document.createElement('div');
            div.className = 'work-card';
            
            // 容错处理，防止字段缺失导致 undefined
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
                        <span><i class="fa-regular fa-user"></i> ${work.author}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${work.date}</span>
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
                window.location.href = `/works/detail.html?id=${work.id}`;
            });

            container.appendChild(div);
        });
    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="empty-state" style="color:#d32f2f; border-color:#ffcdd2;">加载数据失败，请检查后端服务</div>`;
    }
});