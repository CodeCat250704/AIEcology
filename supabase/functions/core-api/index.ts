import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? 'https://tapavesjpfegmieqsxrt.supabase.co'
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? 'sb_secret_181tVRGA9ApiYH0xCWi24g_KfUY1dIB'
const supabase = createClient(supabaseUrl, supabaseKey)

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    let currentUser = "Guest"
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
        currentUser = "CodeCat250704"
    }

    try {
        // 1. 获取作品列表
        if (path.includes('/core-api/works') && method === 'GET' && !path.includes('/create') && !path.includes('/detail')) {
            const { data, error } = await supabase.from('works_cache').select('*').order('created_at', { ascending: false });
            if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
            return new Response(JSON.stringify(data || []), { headers: corsHeaders });
        }

        // 2. 获取作品详情
        if (path.includes('/core-api/works/detail') && method === 'GET') {
            const workId = url.searchParams.get('id');
            if (!workId) return new Response(JSON.stringify({ success: false, message: '缺少ID参数' }), { status: 400, headers: corsHeaders });
            const { data, error } = await supabase.from('works_cache').select('*').eq('id', workId).single();
            if (error || !data) return new Response(JSON.stringify({ success: false, message: '作品不存在' }), { status: 404, headers: corsHeaders });
            return new Response(JSON.stringify(data), { headers: corsHeaders });
        }

        // ================================
        // 3. 【核心修改】作品发布 + 图片上传
        // ================================
        if (path.includes('/core-api/works/create') && method === 'POST') {
            const formData = await req.formData()
            const title = formData.get('title')?.toString() || ''
            const category = formData.get('category')?.toString() || ''
            const description = formData.get('description')?.toString() || ''

            if (!title || !description) {
                return new Response(JSON.stringify({ success: false, message: '标题和描述不能为空' }), { status: 400, headers: corsHeaders })
            }

            // 处理封面图上传到 Supabase Storage
            let cover_url = null
            const coverFile = formData.get('cover_img')
            if (coverFile && coverFile instanceof File && coverFile.size > 0) {
                const fileExt = coverFile.name.split('.').pop()
                const fileName = `${generateUUID()}.${fileExt}`
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('images')
                    .upload(fileName, coverFile, {
                        contentType: coverFile.type,
                        upsert: false
                    })

                if (!uploadError) {
                    const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
                    cover_url = urlData.publicUrl
                } else {
                    console.error("图片上传失败:", uploadError)
                }
            }

            const newWork = {
                id: generateUUID(),
                title, category, description,
                cover_url: cover_url,
                author: currentUser,
                date: new Date().toLocaleString(),
                views: 0, likes: 0, comments: 0,
                created_at: Date.now() / 1000
            }

            const { error } = await supabase.from('works_cache').insert(newWork)
            if (error) throw new Error(error.message)
            return new Response(JSON.stringify({ success: true, message: '作品发布成功' }), { headers: corsHeaders })
        }

        // 4. 根路径
        if (path === '/functions/v1/core-api' || path === '/functions/v1/core-api/') {
            return new Response(JSON.stringify({ success: true, message: 'core-api is running' }), { headers: corsHeaders })
        }

        return new Response(JSON.stringify({ error: '404 Not Found' }), { status: 404, headers: corsHeaders })

    } catch (err: any) {
        console.error("Server Error:", err.message)
        return new Response(JSON.stringify({ success: false, message: '服务器内部错误' }), { status: 500, headers: corsHeaders })
    }
})