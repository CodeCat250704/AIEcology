document.addEventListener('DOMContentLoaded', async () => {
    if (typeof checkLoginStatus === 'function') await checkLoginStatus();
    const id = new URLSearchParams(window.location.search).get('id');
    const container = document.getElementById('detailContainer');
    if (!id) { if (container) container.innerHTML = '<div style="padding:40px;color:#888;text-align:center;">错误：缺少作品ID参数</div>'; return; }
    try {
        const res = await fetch(`${API_BASE_URL}/works/detail?id=${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const work = await res.json();
        if (!work || !work.id) { if (container) container.innerHTML = '<div style="text-align:center;color:#d32f2f;padding:40px;">作品不存在或已被删除</div>'; return; }
        await fetch(`${API_BASE_URL}/works/view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: work.id }) });
        renderDetail(work);
    } catch (err) { console.error(err); if (container) container.innerHTML = `<div style="text-align:center;color:#d32f2f;padding:40px;">加载失败，请检查网络</div>`; }
});

function renderDetail(work) {
    const container = document.getElementById('detailContainer');
    if (!container) return;
    const coverHtml = work.cover_url ? `<img src="${work.cover_url}" alt="${work.title}">` : `<i class="fa-regular fa-image" style="font-size:4rem;color:#d0c8db;"></i>`;
    const commentsList = work.work_comments || [];
    container.innerHTML = `
        <div class="detail-body-grid">
            <div class="detail-left">
                <div class="detail-icon-lg">${coverHtml}</div>
                <div class="detail-title-area">
                    <h1>${work.title}</h1>
                    <div class="meta">
                        <span><i class="fa-regular fa-user"></i> ${work.author}</span>
                        <span><i class="fa-regular fa-calendar"></i> ${work.date}</span>
                    </div>
                    <div class="stats-box">
                        <span><i class="fa-regular fa-eye"></i> <b>${work.views || 0}</b></span>
                        <span><i class="fa-regular fa-heart"></i> <b>${work.likes || 0}</b></span>
                        <span><i class="fa-regular fa-comment-dots"></i> <b>${work.comments || 0}</b></span>
                    </div>
                </div>
            </div>
            <div class="detail-right">
                <div class="detail-banner">${coverHtml}</div>
                <div class="desc-text">${(work.description || '暂无详细介绍').replace(/\n/g, '<br>')}</div>
                ${work.doc_content ? `<div class="doc-container"><pre>${work.doc_content}</pre></div>` : ''}
            </div>
        </div>
        <div class="comment-section">
            <div class="comment-list" id="commentList">
                ${commentsList.length === 0 ? '<p style="color:var(--text-gray);padding:10px 0;">还没有评论，快来抢沙发吧！</p>' : commentsList.map(c => `<div class="comment-item"><div class="c-header"><strong>${c.author}</strong><span>${c.date}</span></div><div class="c-text">${c.content}</div></div>`).join('')}
            </div>
            <div class="comment-input-wrapper">
                <textarea id="newCommentText" placeholder="写下您对这款作品的评价..."></textarea>
                <button onclick="submitWorkComment('${work.id}')">发布评论</button>
            </div>
        </div>
    `;
}

window.submitWorkComment = async function(workId) {
    const content = document.getElementById('newCommentText').value.trim();
    if (!content) { alert("请输入评论内容"); return; }
    try {
        const res = await fetch(`${API_BASE_URL}/works/comment`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ work_id: workId, content }) });
        const result = await res.json();
        if (result.success) location.reload(); else alert("发布失败: " + result.message);
    } catch(e) { alert("网络请求失败"); }
};