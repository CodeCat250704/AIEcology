// supabase/functions/api-main/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 直接写在文件里，不用去外面引用了！
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://tapavesjpfegmieqsxrt.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

let CAPTCHA_STORE: string = ""

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
// 2. 核心路由处理
// ==========================================
Deno.serve(async (req: Request) => {
    // 处理 CORS 预检请求
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const path = url.pathname.replace('/functions/v1/api-main', '')
    const method = req.method

    let currentUser = "Guest"
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        currentUser = "CodeCat250704" 
    }

    try {
        // ===== 验证码接口 =====
        if (path === '/auth/captcha' && method === 'GET') {
            const { svg } = generateCaptchaSVG()
            return new Response(svg, {
                headers: { 'Content-Type': 'image/svg+xml', ...corsHeaders }
            })
        }

        // ===== 登录接口 =====
        if (path === '/auth/login' && method === 'POST') {
            const body = await req.json()
            const { username, password, captcha } = body
            
            if (!captcha || captcha.toUpperCase() !== CAPTCHA_STORE.toUpperCase()) {
                return new Response(JSON.stringify({ success: false, message: '验证码错误' }), { status: 400, headers: corsHeaders })
            }

            const { data: users, error } = await supabase
                .from('users_cache')
                .select('*')
                .eq('username', username)

            if (error || !users || users.length === 0) {
                return new Response(JSON.stringify({ success: false, message: '用户不存在' }), { status: 400, headers: corsHeaders })
            }

            const user = users[0]
            if (user.password !== password) {
                return new Response(JSON.stringify({ success: false, message: '密码错误' }), { status: 400, headers: corsHeaders })
            }

            return new Response(JSON.stringify({ success: true, user: { id: user.id, name: user.username } }), { headers: corsHeaders })
        }

        // ===== GitHub OAuth 跳转 =====
        if (path === '/auth/github' && method === 'GET') {
            const CLIENT_ID = "Ov23lifXykyiDvGXUGiT"
            const redirectUri = "https://你的域名.com/api/auth/github/callback"
            const githubUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirectUri}`
            return new Response(null, { status: 302, headers: { Location: githubUrl, ...corsHeaders } })
        }
        
        // ===== GitHub Callback (占位) =====
        if (path === '/auth/github/callback' && method === 'GET') {
            return new Response("GitHub Callback received. Please implement token exchange logic here.", { headers: corsHeaders })
        }

        // ===== 作品库列表 =====
        if (path === '/works/list' && method === 'GET') {
            const { data, error } = await supabase.from('works_cache').select('*').order('created_at', { ascending: false })
            if (error) throw new Error(error.message)
            return new Response(JSON.stringify(data), { headers: corsHeaders })
        }

        // ===== 发布作品 =====
        if (path === '/works/create' && method === 'POST') {
            const formData = await req.formData()
            const title = formData.get('title')?.toString() || ''
            const category = formData.get('category')?.toString() || ''
            const description = formData.get('description')?.toString() || ''
            
            if (!title || !description) {
                return new Response(JSON.stringify({ success: false, message: '标题和描述不能为空' }), { status: 400, headers: corsHeaders })
            }

            const newWork = {
                id: crypto.randomUUID(),
                title, category, description,
                author: currentUser,
                date: new Date().toLocaleString(),
                views: 0, likes: 0, comments: 0,
                created_at: Date.now() / 1000
            }

            const { error } = await supabase.from('works_cache').insert(newWork)
            if (error) throw new Error(error.message)

            return new Response(JSON.stringify({ success: true, message: '作品发布成功' }), { headers: corsHeaders })
        }

        // ===== 默认 404 =====
        return new Response(JSON.stringify({ error: '404 Not Found' }), { status: 404, headers: corsHeaders })

    } catch (err: any) {
        console.error("Server Error:", err.message)
        return new Response(JSON.stringify({ success: false, message: '服务器内部错误' }), { status: 500, headers: corsHeaders })
    }
})