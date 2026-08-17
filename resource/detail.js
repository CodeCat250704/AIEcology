(function() {
    'use strict';

    document.addEventListener('DOMContentLoaded', async () => {
        console.log("当前页面URL:", window.location.href);

        // 【核心修改点】采用最底层的正则安全提取，确保 ID 不被截断
        let id = null;
        const match = window.location.search.match(/[?&]id=([^&#]*)/);
        if (match) {
            id = decodeURIComponent(match[1]);
        }
        
        console.log("获取到的资源ID:", id);
        const container = document.getElementById('detailContainer');

        if (!id) {
            if (container) container.innerHTML = '<div style="padding:40px;color:#888;text-align:center;">错误：缺少资源ID参数</div>';
            return;
        }

        try {
            // 构建绝对安全的 API 地址
            const apiUrl = `/api/resource/detail?id=${id}`;
            console.log("🚀 即将请求的后端API地址:", apiUrl);

            const res = await fetch(apiUrl);
            console.log("接口响应状态码:", res.status);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status} - ${res.statusText}`);
            }

            const item = await res.json();
            console.log("获取到的 JSON 数据:", item);

            if (!item || !item.id) {
                throw new Error("返回的数据结构异常");
            }

            renderDetail(item, id);
            await loadComments(id);

        } catch (err) {
            console.error("❌ 致命错误:", err);
            const container = document.getElementById('detailContainer');
            if (container) {
                container.innerHTML = `
                    <div style="padding:40px;color:#d32f2f;text-align:center;">
                        <h3>加载失败</h3>
                        <p style="font-size:0.9rem;color:#888;margin-top:10px;">错误信息: ${err.message}</p>
                        <p style="font-size:0.85rem;color:#aaa;margin-top:5px;">请按 F12 查看控制台红色报错。</p>
                    </div>
                `;
            }
        }
    });

    function renderDetail(item, resId) {
        const container = document.getElementById('detailContainer');
        if (!container) return;

        const coverHtml = item.cover_url 
            ? `<img src="${item.cover_url}" alt="${item.title}">` 
            : `<i class="fa-regular fa-image" style="font-size:4rem;color:#d0c8db;"></i>`;
            
        let screenshotsHtml = '';
        if (item.screenshots && item.screenshots.length > 0) {
            item.screenshots.forEach(url => { screenshotsHtml += `<img src="${url}" alt="截图">`; });
        } else {
            screenshotsHtml = '<span style="color:var(--text-gray);font-size:0.9rem;">暂无应用截图</span>';
        }

        container.innerHTML = `
            <div class="detail-body-grid">
                <div class="detail-left">
                    <div class="detail-icon-lg">${coverHtml}</div>
                    <div class="detail-title-area">
                        <h1>${item.title}</h1>
                        <div class="meta">
                            <span><i class="fa-regular fa-user"></i> ${item.author}</span>
                            <span><i class="fa-regular fa-calendar"></i> ${item.date}</span>
                        </div>
                    </div>
                    <button class="btn-download-big" onclick="window.open('${item.download_url || '#'}','_blank')">
                        <i class="fa-solid fa-download"></i> 立即下载
                    </button>
                </div>

                <div class="detail-right">
                    <div class="detail-banner">${coverHtml}</div>
                    <div class="desc-text">${(item.description || '暂无详细介绍').replace(/\n/g, '<br>')}</div>
                    <div class="screenshots-section">
                        <h4>应用预览</h4>
                        <div class="screenshot-grid">${screenshotsHtml}</div>
                    </div>
                    ${item.doc_content ? `
                        <div class="doc-container">
                            <h4><i class="fa-regular fa-file-lines"></i> 详细说明文档</h4>
                            <pre>${item.doc_content}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="comment-section">
                <div class="comment-header">
                    <div class="avg-score" id="avgScoreDisplay">0.0 <span>分 (0人评价)</span></div>
                    <div class="rating-stars">
                        <input type="radio" id="star5" name="rating" value="5"><label for="star5">★</label>
                        <input type="radio" id="star4" name="rating" value="4"><label for="star4">★</label>
                        <input type="radio" id="star3" name="rating" value="3"><label for="star3">★</label>
                        <input type="radio" id="star2" name="rating" value="2"><label for="star2">★</label>
                        <input type="radio" id="star1" name="rating" value="1"><label for="star1">★</label>
                    </div>
                </div>
                <div class="comment-list" id="commentList"><p style="color:var(--text-gray);padding:10px 0;">加载评论中...</p></div>
                <div class="comment-input-wrapper">
                    <textarea id="newCommentText" placeholder="分享您对这款软件的真实使用感受或评分..."></textarea>
                    <button onclick="submitComment('${resId}')">发布评价</button>
                </div>
            </div>
        `;
    }

    async function loadComments(resId) {
        const container = document.getElementById('commentList');
        if (!container) return;
        try {
            const res = await fetch(`/api/resource/comments?resource_id=${resId}`);
            if (!res.ok) {
                container.innerHTML = `<p style="color:var(--text-gray);">评论接口暂不可用</p>`;
                return;
            }
            const data = await res.json();
            const comments = data || [];

            let avgScore = 0;
            if (comments.length > 0) {
                const total = comments.reduce((sum, c) => sum + (c.score || 0), 0);
                avgScore = (total / comments.length).toFixed(1);
            }
            const displayEl = document.getElementById('avgScoreDisplay');
            if (displayEl) displayEl.innerHTML = `${avgScore} <span>分 (${comments.length}人评价)</span>`;

            if (comments.length === 0) {
                container.innerHTML = `<p style="color:var(--text-gray);padding:10px 0;">还没有人评价，快来抢沙发吧！</p>`;
            } else {
                container.innerHTML = comments.map(c => `
                    <div class="comment-item">
                        <div class="c-header">
                            <div><strong>${c.author}</strong> <span class="c-stars">${'★'.repeat(c.score||0)}${'☆'.repeat(5-(c.score||0))}</span></div>
                            <div>${c.date}</div>
                        </div>
                        <div class="c-text">${c.content}</div>
                        <div class="reply-btn" onclick="toggleReply('${c.id}')">💬 追评</div>
                        <div class="reply-box" id="replyBox_${c.id}" style="display:none;">
                            <textarea placeholder="追评内容..."></textarea>
                            <button onclick="submitReply('${c.id}', '${resId}')">提交追评</button>
                        </div>
                        ${(c.replies && c.replies.length > 0) ? c.replies.map(r => `
                            <div class="reply-box" style="display:block;margin-top:12px;">
                                <div style="font-size:0.85rem;color:var(--text-gray);margin-bottom:4px;">${r.author} · ${r.date}</div>
                                <div style="font-size:0.95rem;">${r.content}</div>
                            </div>
                        `).join('') : ''}
                    </div>
                `).join('');
            }
        } catch (err) { 
            container.innerHTML = `<p style="color:#d32f2f;padding:10px 0;">评论加载失败</p>`;
        }
    }

    window.submitComment = async function(resId) {
        const contentEl = document.getElementById('newCommentText');
        const content = contentEl.value.trim();
        const scoreEl = document.querySelector('.rating-stars input:checked');
        const score = scoreEl ? parseInt(scoreEl.value) : 0;
        if (!content) { alert("请输入评价内容"); return; }
        if (score === 0) { alert("请先点击星星打评分！"); return; }
        try {
            const res = await fetch('/api/resource/comment', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resId, content, score })
            });
            const result = await res.json();
            if (result.success) { location.reload(); } else { alert("发布失败: " + result.message); }
        } catch(e) { alert("网络请求失败"); }
    };

    window.toggleReply = function(commentId) {
        const box = document.getElementById(`replyBox_${commentId}`);
        if(box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    };

    window.submitReply = async function(parentId, resId) {
        const box = document.getElementById(`replyBox_${parentId}`);
        if(!box) return;
        const textarea = box.querySelector('textarea');
        const content = textarea.value.trim();
        if (!content) { alert("请输入追评内容"); return; }
        try {
            const res = await fetch('/api/resource/reply', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resource_id: resId, parent_id: parentId, content })
            });
            const result = await res.json();
            if (result.success) { location.reload(); } else { alert("追评失败: " + result.message); }
        } catch(e) { alert("网络请求失败"); }
    };
})();