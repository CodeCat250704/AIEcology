import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ==========================================
// 全局变量与跨域配置
// ==========================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 直接写死真实密钥，绝不让打包失败！
const supabaseUrl = 'https://tapavesjpfegmieqsxrt.supabase.co'
const supabaseKey = 'sb_secret_BXnL2sb34hkBrRDUYI_7QA_6Uxk3UH7'
const supabase = createClient(supabaseUrl, supabaseKey)

let CAPTCHA_STORE: string = ""

// ==========================================
// 纯 JS 原生 UUID 生成 (防止 Deno 打包崩溃)
// ==========================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ==========================================
// 生成 SVG 验证码
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
// 核心 Deno 服务处理 (绝对路径匹配，拒绝截取失败)
// ==========================================
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const fullPath = url.pathname // 直接获取完整路径，避免截取错误
    const method = req.method

    let currentUser = "Guest"
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        currentUser = "CodeCat250704"
    }

    try {
        // ===== 【最优先】：获取作品列表 =====
        if (fullPath === '/functions/v1/core-api/works' && method === 'GET') {
            console.log("正在读取作品库数据...");
            const { data, error } = await supabase.from('works_cache').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error("数据库读取错误:", error);
                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            }
            return new Response(JSON.stringify(data || []), { headers: corsHeaders });
        }

        // ===== 【最优先】：获取作品详情 =====
        if (fullPath === '/functions/v1/core-api/works/detail' && method === 'GET') {
            const workId = url.searchParams.get('id');
            if (!workId) return new Response(JSON.stringify({ success: false, message: '缺少ID参数' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('works_cache').select('*').eq('id', workId).single();
            if (error || !data) return new Response(JSON.stringify({ success: false, message: '作品不存在' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        // ===== 根路径 =====
        if (fullPath === '/functions/v1/core-api' || fullPath === '/functions/v1/core-api/') {
            return new Response(JSON.stringify({ success: true, message: 'core-api is running' }), { headers: corsHeaders })
        }

        // ===== 其他简单接口 =====
        if (fullPath === '/functions/v1/core-api/banner' && method === 'GET') {
            return new Response(JSON.stringify({
                title: "AI 项目生态社区",
                description: "演示开放、设计共享，欢迎来到 AIGC 爱好者的创意世界！",
                icon: "fa-solid fa-rocket"
            }), { headers: corsHeaders });
        }

        // ===== 作品发布接口 =====
        if (fullPath === '/functions/v1/core-api/works/create' && method === 'POST') {
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
                console.error("写入错误:", error)
                return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers: corsHeaders })
            }
            return new Response(JSON.stringify({ success: true, message: '作品发布成功' }), { headers: corsHeaders })
        }

        // ===== 默认 404 =====
        console.warn("未匹配到路由:", fullPath);
        return new Response(JSON.stringify({ error: '404 Not Found' }), { status: 404, headers: corsHeaders })

    } catch (err: any) {
        console.error("Server Error:", err.message)
        return new Response(JSON.stringify({ success: false, message: '服务器内部错误' }), { status: 500, headers: corsHeaders })
    }
})