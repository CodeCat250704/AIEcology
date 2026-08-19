const API_BASE_URL = 'https://tapavesjpfegmieqsxrt.supabase.co/functions/v1/core-api';

class HomeController {
    constructor() { 
        this.checkLoginStatus(); 
        this.init(); 
    }

    // ================== 登录状态检测与跳转 ==================
    async checkLoginStatus() {
        try {
            const res = await fetch(`${API_BASE_URL}/auth/me`);
            const data = await res.json();
            
            const loginBtn = document.getElementById('loginBtn');
            const userDropdown = document.getElementById('userDropdown');
            const userNameDisplay = document.getElementById('userNameDisplay');
            const userNameLink = document.getElementById('userNameLink');

            if (data.isLoggedIn && data.user) {
                if(loginBtn) loginBtn.style.display = 'none';
                if(userDropdown) userDropdown.style.display = 'flex';
                if(userNameDisplay) userNameDisplay.innerText = data.user.name || '用户';
                if(userNameLink) userNameLink.href = '/user/index.html'; // 指向个人中心

                const logoutBtn = document.getElementById('logoutBtn');
                if(logoutBtn) {
                    logoutBtn.addEventListener('click', async (e) => {
                        e.preventDefault();
                        // 注意：云端必须也实现 /auth/logout 接口，否则这里会 404
                        await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
                        window.location.reload();
                    });
                }
            } else {
                if(loginBtn) loginBtn.style.display = 'inline-block';
                if(userDropdown) userDropdown.style.display = 'none';
            }
        } catch (error) {
            console.warn("获取用户状态失败", error);
        }
    }

    // ================== 初始化页面模块 ==================
    async init() {
        await Promise.all([
            this.loadBanner(),
            this.loadQuickLinks(),
            this.loadTimeline(),
            this.loadForumStream(),
            this.loadHotProjects()
        ]);
    }

    async fetchData(endpoint) {
        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`);
            if (!res.ok) throw new Error(`API Error: ${res.status}`);
            return await res.json();
        } catch (err) {
            console.warn(`接口 ${endpoint} 请求失败`, err);
            return null;
        }
    }

    // ================== 轮播图 ==================
    async loadBanner() {
        const container = document.getElementById('bannerContainer');
        if (!container) return;
        const data = await this.fetchData('/banner');
        if (data) {
            container.innerHTML = `
                <div class="banner-text">
                    <h2>${data.title || 'AI 项目生态社区'}</h2>
                    <p>${data.description || '欢迎来到 AIGC 爱好者的创意世界！'}</p>
                </div>
                <div class="banner-icon"><i class="${data.icon || 'fa-solid fa-rocket'}"></i></div>
            `;
        }
    }

    // ================== 快捷入口 (支持图片) ==================
    async loadQuickLinks() {
        const container = document.getElementById('quickLinks');
        if (!container) return;
        const data = await this.fetchData('/links');
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center;color:#999;padding:20px;">暂无快捷入口</div>`;
            return;
        }
        data.forEach(item => {
            const a = document.createElement('a');
            a.className = 'link-card'; 
            a.href = item.url || '#';
            
            const imgHtml = item.img_src 
                ? `<img src="${item.img_src}" alt="${item.img_alt || item.title}" style="width:48px; height:48px; object-fit:contain; margin-bottom:8px; display:block; margin-left:auto; margin-right:auto;">` 
                : `<div style="width:48px; height:48px; background:#e0d6ef; border-radius:8px; margin:0 auto 8px auto;"></div>`;

            a.innerHTML = `
                ${imgHtml}
                <span>${item.title || '未知入口'}</span>
            `;
            container.appendChild(a);
        });
    }

    // ================== 时间轴 ==================
    async loadTimeline() {
        const container = document.getElementById('timelineContainer');
        if (!container) return; 
        const data = await this.fetchData('/timeline');
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<p style="color:#999;font-size:0.9rem;padding:20px;">暂无动态</p>`;
            return;
        }
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-content">
                    <strong>${item.date || '未知日期'}</strong>
                    <span>${item.title || '未知事件'}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // ================== 论坛流 (数据源: 项目中心 /project/list) ==================
    async loadForumStream() {
        const container = document.getElementById('forumStream');
        if (!container) return;
        
        const data = await this.fetchData('/project/list');
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:#999;padding:20px;">暂无活跃项目</div>`;
            return;
        }

        // 按评论数（活跃度）排序
        const sortedData = [...data].sort((a, b) => (b.replies || 0) - (a.replies || 0));

        sortedData.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            
            const title = item.title || '未命名项目';
            const author = item.author || '匿名';
            const date = item.date || '';
            const replies = item.replies || 0;
            const id = item.id;

            div.innerHTML = `
                <div>
                    <h4>${title}</h4>
                    <div class="meta"><i class="fa-regular fa-user"></i> ${author} · ${date}</div>
                </div>
                <div class="stats"><i class="fa-regular fa-message"></i> ${replies}</div>
            `;
            
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                if(id) {
                    window.location.href = `/project/detail.html?id=${id}`;
                } else {
                    alert("该项目暂未关联详情页面");
                }
            });
            container.appendChild(div);
        });
    }

    // ================== 热门项目 (数据源: 作品库 /works) ==================
    async loadHotProjects() {
        const container = document.getElementById('hotProjects');
        if (!container) return;
        
        const data = await this.fetchData('/works'); 
        container.innerHTML = '';
        
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:#999;padding:20px;">暂无热门项目</div>`;
            return;
        }

        // 取前 5 个
        const topProjects = data.slice(0, 5);

        topProjects.forEach(item => {
            if (!item.title) return;

            const div = document.createElement('div');
            div.className = 'list-item';
            
            const projTitle = item.title || '未命名项目';
            const projViews = item.views || 0;
            const projLikes = item.likes || 0;
            const projComments = item.comments || 0;
            const projId = item.id;

            div.innerHTML = `
                <div>
                    <h4>${projTitle}</h4>
                    <div class="meta">
                        <i class="fa-regular fa-eye"></i> ${projViews}  
                        <i class="fa-regular fa-heart" style="margin-left:8px;"></i> ${projLikes}
                    </div>
                </div>
                <div class="stats"><i class="fa-regular fa-comment-dots"></i> ${projComments}</div>
            `;
            
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                if(projId) {
                    window.location.href = `/works/detail.html?id=${projId}`;
                } else {
                    alert("该热门项目暂未关联详情页面");
                }
            });

            container.appendChild(div);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new HomeController());