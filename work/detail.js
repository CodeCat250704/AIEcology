// 1. 自我兜底式获取云端 API 地址
// 如果 home/script.js 的全局变量存在就使用它，不存在则使用默认的 (后续全局可用，确保不冲突)
//const API_BASE_URL = window.API_BASE_URL || 'https://tapavesjpfegmieqsxrt.supabase.co/functions/v1/core-api';

document.addEventListener('DOMContentLoaded', async () => {
    // 如果页面内存在父级定义的 checkLoginStatus 方法，则调用它检测登录状态
    if (typeof checkLoginStatus === 'function') {
        await checkLoginStatus();
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    const container = document.getElementById('detailContainer');

    if (!id) {
        if (container) container.innerHTML = '<div style="padding:40px;color:#888;text-align:center;">错误：缺少作品ID参数</div>';
        return;
    }

    try {
        console.log(`正在请求作品详情: ${API_BASE_URL}/works/detail?id=${id}`);
        
        // 1. 获取作品详情数据
        const res = await fetch(`${API_BASE_URL}/works/detail?id=${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const work = await res.json();
        
        if (!work || !work.id) {
            if (container) container.innerHTML = '<div style="text-align:center;color:#d32f2f;padding:40px;">作品不存在或已被删除</div>';
            return;
        }

        // 2. 【关键同步】：加载详情页时，触发观看数 +1
        await fetch(`${API_BASE_URL}/works/view`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: work.id })
        });

        // 3. 渲染页面并显示实时统计数据
        renderDetail(work);

    } catch (err) {
        console.error('加载失败:', err);
        if (container) container.innerHTML = `<div style="text-align:center;color:#d32f2f;padding:40px;">加载失败，请检查网络</div>`;
    }
});

function renderDetail(work) {
    const container = document.getElementById('detailContainer');
    if (!container) return; // 如果找不到容器，直接退出，防止报错

    const coverHtml = work.cover_url 
        ? `<img src="${work.cover_url}" alt="${work.title}">` 
        : `<i class="fa-regular fa-image" style="font-size:4rem;color:#d0c8db;"></i>`;

    // 安全提取数据 (确保不显示 undefined)
    const views = work.views || 0;
    const likes = work.likes || 0;
    const comments = work.comments || 0;
    const commentsList = work.work_comments || [];

    container.innerHTML = `
        <div class="detail-body-grid">
            <!-- 左侧：标题、作者、统计数字 -->
            <div class="detail-left">
                <div class="detail-icon-lg">${coverHtml}</div>
                <div class="detail-title-area">
                    <h1>${work.title}</h1>
                    <div class="meta">
                        <span><i class="fa-regular fa-user"></i> ${work.author}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${work.date}</span>
                    </div>
                    <div class="stats-box" style="display:flex; gap:20px; margin-top:10px; color:var(--text-gray); font-size:0.9rem;">
                        <span><i class="fa-regular fa-eye"></i> <b style="color:var(--text-main);">${views}</b></span>
                        <span><i class="fa-regular fa-heart"></i> <b style="color:var(--text-main);">${likes}</b></span>
                        <span><i class="fa-regular fa-comment-dots"></i> <b style="color:var(--text-main);">${comments}</b></span>
                    </div>
                </div>
            </div>

            <!-- 右侧：封面、描述、截图、文档 -->
            <div class="detail-right">
                <div class="detail-banner">${coverHtml}</div>
                <div class="desc-text">${(work.description || '暂无详细介绍').replace(/\n/g, '<br>')}</div>
                <div class="screenshots-section">
                    <h4>作品预览</h4>
                    <div class="screenshot-grid">
                        <span style="color:var(--text-gray);font-size:0.9rem;">当前作品暂无截图</span>
                    </div>
                </div>
                ${work.doc_content ? `
                    <div class="doc-container">
                        <h4><i class="fa-regular fa-file-lines"></i> 详细说明文档</h4>
                        <pre>${work.doc_content}</pre>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- 底部评论区 -->
        <div class="comment-section">
            <div class="comment-header">
                <div class="avg-score" style="font-size:1.2rem; color:var(--text-main);">
                    全部评论 (<b id="commentCount">${comments}</b>)
                </div>
            </div>
            <div class="comment-list" id="commentList">
                ${commentsList.length === 0 ? '<p style="color:var(--text-gray);padding:10px 0;">还没有评论，快来抢沙发吧！</p>' : 
                commentsList.map(c => `
                    <div class="comment-item">
                        <div class="c-header">
                            <div><strong>${c.author}</strong></div>
                            <div>${c.date}</div>
                        </div>
                        <div class="c-text">${c.content}</div>
                    </div>
                `).join('')}
            </div>
            
            <div class="comment-input-wrapper">
                <textarea id="newCommentText" placeholder="写下您对这款作品的评价..."></textarea>
                <button onclick="submitWorkComment('${work.id}')">发布评论</button>
            </div>
        </div>
    `;
}

// 全局函数：提交作品评论 (已修改为云端地址)
window.submitWorkComment = async function(workId) {
    const contentEl = document.getElementById('newCommentText');
    const content = contentEl.value.trim();
    if (!content) { alert("请输入评论内容"); return; }

    try {
        const res = await fetch(`${API_BASE_URL}/works/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ work_id: workId, content })
        });
        const result = await res.json();
        if (result.success) {
            // 刷新页面以显示新评论和更新总数
            location.reload(); 
        } else {
            alert("发布失败: " + result.message);
        }
    } catch(e) {
        alert("网络请求失败");
    }
};