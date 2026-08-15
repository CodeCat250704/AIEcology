const API_BASE_URL = '/api';

class HomeController {
    constructor() { this.init(); }

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

    // 1. 轮播图
    async loadBanner() {
        const container = document.getElementById('bannerContainer');
        const data = await this.fetchData('/banner');
        if (data) {
            container.innerHTML = `
                <div class="banner-text">
                    <h2>${data.title}</h2>
                    <p>${data.description}</p>
                </div>
                <div class="banner-icon"><i class="${data.icon || 'fa-solid fa-laptop-code'}"></i></div>
            `;
        }
    }

    // 2. 快捷入口
    async loadQuickLinks() {
        const container = document.getElementById('quickLinks');
        const data = await this.fetchData('/links');
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="grid-column: 1/-1; text-align:center;color:#999;">暂无快捷入口</div>`;
            return;
        }
        data.forEach(item => {
            const a = document.createElement('a');
            a.className = 'link-card'; a.href = item.url || '#';
            a.innerHTML = `<i class="${item.icon || 'fa-solid fa-link'}"></i><span>${item.title}</span>`;
            container.appendChild(a);
        });
    }

    // 3. 时间轴 (全新的垂直流渲染逻辑)
    async loadTimeline() {
        const container = document.getElementById('timelineContainer');
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
                    <strong>${item.date}</strong>
                    <span>${item.title}</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    // 4. 论坛流
    async loadForumStream() {
        const container = document.getElementById('forumStream');
        const data = await this.fetchData('/forum');
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:#999;padding:20px;">暂无帖子</div>`;
            return;
        }
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div>
                    <h4>${item.title}</h4>
                    <div class="meta">${item.author} · ${item.date}</div>
                </div>
                <div class="stats">💬 ${item.replies || 0}</div>
            `;
            container.appendChild(div);
        });
    }

    // 5. 热门项目
    async loadHotProjects() {
        const container = document.getElementById('hotProjects');
        const data = await this.fetchData('/projects');
        container.innerHTML = '';
        if (!data || data.length === 0) {
            container.innerHTML = `<div style="text-align:center;color:#999;padding:20px;">暂无热门项目</div>`;
            return;
        }
        data.forEach(item => {
            const div = document.createElement('div');
            div.className = 'list-item';
            div.innerHTML = `
                <div>
                    <h4>${item.name}</h4>
                    <div class="meta">👁 ${item.views || 0}  ❤ ${item.likes || 0}</div>
                </div>
                <div class="stats">💬 ${item.comments || 0}</div>
            `;
            container.appendChild(div);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new HomeController());