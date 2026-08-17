document.getElementById('createForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerText = "发布中..."; btn.disabled = true;

    const formData = new FormData(e.target);
    try {
        const res = await fetch('/api/project/create', {
            method: 'POST',
            body: formData // 前端用 FormData 传输
        });
        const result = await res.json();
        if(result.success) {
            alert('发布成功！');
            window.location.href = '/project/index.html';
        } else {
            alert('发布失败: ' + result.message);
        }
    } catch (err) {
        alert('网络错误');
    } finally {
        btn.innerText = "发布动态"; btn.disabled = false;
    }
});