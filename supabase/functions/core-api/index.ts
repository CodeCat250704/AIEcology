import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==========================================
// 全局变量与跨域配置
// ==========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 【核心修复1】：直接写死正确的密钥，避免环境变量读取不到崩溃
const supabaseUrl = 'https://tapavesjpfegmieqsxrt.supabase.co'
const supabaseKey = 'sb_secret_BXnL2sb34hkBrRDUYI_7QA_6Uxk3UH7'
const supabase = createClient(supabaseUrl, supabaseKey)

let CAPTCHA_STORE: string = ""

// ==========================================
// 【核心修复2】：纯JS原生UUID，彻底规避crypto.randomUUID打包崩溃
// ==========================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// 1. 工具函数：生成 SVG 验证码
// ==========================================
function generateCaptchaSVG(): { svg: string, code: string } {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    CAPTCHA_STORE = code
    const width = 120, height = 40
    let lines = ''
    for (let i = 0; i < 5; i++) {
        const x1 = Math.floor(Math.random() * width), y1 = Math.floor(Math.random() * height)
        const x2 = Math.floor(Math.random() * width), y2 = Math.floor(Math.random() * height)
        lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#d3cce6" stroke-width="1.5" />`
    }
    let dots = ''
    for (let i = 0; i < 50; i++) {
        const x = Math.floor(Math.random() * width), y = Math.floor(Math.random() * height)
        const r = Math.floor(Math.random() * 2) + 1
        dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="#e0d6ef" />`
    }
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f8f5fc" rx="4" ry="4"/>
    <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="#4a2c6d" letter-spacing="4">${code}</text>
    ${lines}
    ${dots}
</svg>`
    return { svg, code }
}

// ==========================================
// 2. 核心 Deno 服务处理
// ==========================================
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const parts = url.pathname.split('/functions/v1/core-api/');
    const path = parts.length > 1 ? parts[1] : '';
    const method = req.method

    let currentUser = "Guest"
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        currentUser = "CodeCat250704"
    }

    try {
        // ===== 根路径 =====
        if (path === '' || path === '/') {
            return new Response(JSON.stringify({ success: true, message: 'core-api is running' }), { headers: corsHeaders })
        }

        // ===== 认证模块 (Auth) =====
        if ((path === 'auth/captcha' || path === '/auth/captcha') && method === 'GET') {
            const { svg } = generateCaptchaSVG()
            return new Response(svg, {
                headers: { 'Content-Type': 'image/svg+xml', ...corsHeaders }
            })
        }

        if ((path === 'auth/login' || path === '/auth/login') && method === 'POST') {
            const body = await req.json()
            const { username, password, captcha } = body
            if (!captcha || captcha.toUpperCase() !== CAPTCHA_STORE.toUpperCase()) {
                return new Response(JSON.stringify({ success: false, message: '验证码错误' }), { status: 400, headers: corsHeaders })
            }
            const { data: users, error } = await supabase.from('users_cache').select('*').eq('username', username);
            if (error || !users || users.length === 0) {
                return new Response(JSON.stringify({ success: false, message: '用户不存在' }), { status: 400, headers: corsHeaders })
            }
            const user = users[0];
            if (user.password !== password) {
                return new Response(JSON.stringify({ success: false, message: '密码错误' }), { status: 400, headers: corsHeaders })
            }
            return new Response(JSON.stringify({ success: true, user: { id: user.id, name: user.username } }), { headers: corsHeaders })
        }

        if ((path === 'auth/me' || path === '/auth/me') && method === 'GET') {
            return new Response(JSON.stringify({ isLoggedIn: false, user: null }), { headers: corsHeaders })
        }

        if ((path === 'auth/logout' || path === '/auth/logout') && method === 'POST') {
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
        }

        if ((path === 'auth/github' || path === '/auth/github') && method === 'GET') {
            const CLIENT_ID = "Ov23lifXykyiDvGXUGiT"
            const redirectUri = "https://duckpublic.qd.je/api/auth/github/callback"
            return new Response(null, { status: 302, headers: { Location: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}`, ...corsHeaders } })
        }

        // ===== 首页通用数据 =====
        if ((path === 'banner' || path === '/banner') && method === 'GET') {
            return new Response(JSON.stringify({
                title: "AI 项目生态社区",
                description: "演示开放、设计共享，欢迎来到 AIGC 爱好者的创意世界！",
                icon: "fa-solid fa-rocket"
            }), { headers: corsHeaders });
        }

        if ((path === 'links' || path === '/links') && method === 'GET') {
            return new Response(JSON.stringify([]), { headers: corsHeaders });
        }

        if ((path === 'timeline' || path === '/timeline') && method === 'GET') {
            const demoData = [
                { date: '2026-08-15', title: '全新社区系统正式上线！' },
                { date: '2026-08-14', title: 'GitHub 数据同步机制部署完毕' }
            ];
            return new Response(JSON.stringify(demoData), { headers: corsHeaders });
        }

        // ===== 作品库 (Works) =====
        if ((path === 'works' || path === '/works') && method === 'GET') {
            const { data, error } = await supabase.from('works_cache').select('*').order('created_at', { ascending: false });
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            return new Response(JSON.stringify(data || []), { headers: corsHeaders });
        }

        if ((path === 'works/detail' || path === '/works/detail') && method === 'GET') {
            const workId = url.searchParams.get('id');
            if (!workId) return new Response(JSON.stringify({ success: false, message: '缺少ID参数' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('works_cache').select('*').eq('id', workId).single();
            if (error || !data) return new Response(JSON.stringify({ success: false, message: '作品不存在' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        if ((path === 'works/create' || path === '/works/create') && method === 'POST') {
            const formData = await req.formData()
            const title = formData.get('title')?.toString() || ''
            const category = formData.get('category')?.toString() || ''
            const description = formData.get('description')?.toString() || ''
            if (!title || !description) {
                return new Response(JSON.stringify({ success: false, message: '标题和描述不能为空' }), { status: 400, headers: corsHeaders })
            }
            const newWork = {
                id: generateUUID(),
                title, category, description,
                author: currentUser,
                date: new Date().toLocaleString(),
                views: 0, likes: 0, comments: 0,
                created_at: Date.now() / 1000
            }
            const { error } = await supabase.from('works_cache').insert(newWork)
            if (error) {
                console.error("Database Insert Error:", error);
                return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders })
            }
            return new Response(JSON.stringify({ success: true, message: '作品发布成功' }), { headers: corsHeaders })
        }

        if ((path === 'works/view' || path === '/works/view') && method === 'POST') {
            const body = await req.json();
            const workId = body.id;
            if (!workId) return new Response(JSON.stringify({ success: false, message: '缺少ID' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('works_cache').select('views').eq('id', workId).single();
            if (error || !data) throw new Error('找不到作品');
            await supabase.from('works_cache').update({ views: (data.views || 0) + 1 }).eq('id', workId);
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // ===== 项目中心 (Projects) =====
        if ((path === 'project/list' || path === '/project/list') && method === 'GET') {
            const filterType = url.searchParams.get('type') || 'all';
            let query = supabase.from('projects_cache').select('*');
            if (filterType !== 'all') query = query.eq('type', filterType);
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            return new Response(JSON.stringify(data || []), { headers: corsHeaders });
        }

        if ((path === 'project/detail' || path === '/project/detail') && method === 'GET') {
            const postId = url.searchParams.get('id');
            if (!postId) return new Response(JSON.stringify({ success: false, message: '缺少ID参数' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('projects_cache').select('*').eq('id', postId).single();
            if (error || !data) return new Response(JSON.stringify({ success: false, message: '项目不存在' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        if ((path === 'project/create' || path === '/project/create') && method === 'POST') {
            const formData = await req.formData();
            const p_type = formData.get('type')?.toString() || 'recruit';
            const title = formData.get('title')?.toString() || '';
            const content = formData.get('content')?.toString() || '';
            if (!title) return new Response(JSON.stringify({ success: false, message: '标题不能为空' }), { status: 400, headers: corsHeaders });
            const newPost = {
                id: generateUUID(), type: p_type, title, content,
                author: currentUser, date: new Date().toLocaleString(),
                replies: 0, created_at: Date.now() / 1000
            };
            const { error } = await supabase.from('projects_cache').insert(newPost);
            if (error) throw new Error(error.message);
            return new Response(JSON.stringify({ success: true, message: '发布成功' }), { headers: corsHeaders });
        }

        // ===== 资源中心 (Resources) =====
        if ((path === 'resource/list' || path === '/resource/list') && method === 'GET') {
            const { data, error } = await supabase.from('resources_cache').select('*').order('created_at', { ascending: false });
            if (error) throw new Error(error.message);
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        if ((path === 'resource/detail' || path === '/resource/detail') && method === 'GET') {
            const resId = url.searchParams.get('id');
            if (!resId) return new Response(JSON.stringify({ error: 'Missing ID' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('resources_cache').select('*').eq('id', resId).single();
            if (error || !data) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        if ((path === 'resource/create' || path === '/resource/create') && method === 'POST') {
            const formData = await req.formData();
            const title = formData.get('title')?.toString() || '';
            const category = formData.get('category')?.toString() || '';
            const description = formData.get('description')?.toString() || '';
            const download_url = formData.get('download_url')?.toString() || '';
            if (!title || !download_url) return new Response(JSON.stringify({ success: false, message: '标题和下载地址不能为空' }), { status: 400, headers: corsHeaders });
            const newRes = {
                id: generateUUID(), title, category, description, download_url,
                author: currentUser, date: new Date().toLocaleString(), created_at: Date.now() / 1000
            };
            const { error } = await supabase.from('resources_cache').insert(newRes);
            if (error) throw new Error(error.message);
            return new Response(JSON.stringify({ success: true, message: '资源发布成功' }), { headers: corsHeaders });
        }

        // ===== 个人中心统计 =====
        if ((path === 'user/stats' || path === '/user/stats') && method === 'GET') {
            const { data: works } = await supabase.from('works_cache').select('*').eq('author', currentUser);
            const { data: projects } = await supabase.from('projects_cache').select('*').eq('author', currentUser);
            const { data: resources } = await supabase.from('resources_cache').select('*').eq('author', currentUser);
            return new Response(JSON.stringify({
                works: works?.length || 0,
                projects: projects?.length || 0,
                resources: resources?.length || 0
            }), { headers: corsHeaders });
        }

        // ===== 默认 404 =====
        return new Response(JSON.stringify({ error: '404 Not Found' }), { status: 404, headers: corsHeaders })

    } catch (err: any) {
        console.error("Server Error:", err.message)
        return new Response(JSON.stringify({ success: false, message: '服务器内部错误' }), { status: 500, headers: corsHeaders })
    }
})