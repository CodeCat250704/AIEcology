document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "正在发布..."; btn.disabled = true;
    const formData = new FormData(e.target);
    try {
        const res = await fetch('/api/resource/create', { method: 'POST', body: formData });
        const result = await res.json();
        if (result.success) { alert('🎉 发布成功！'); window.location.href = '/resource/index.html'; } 
        else { alert('发布失败: ' + result.message); }
    } catch(err) { alert('网络错误'); }
    finally { btn.innerText = "立即发布"; btn.disabled = false; }
});