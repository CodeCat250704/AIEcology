const API_BASE_URL = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    const btn = document.getElementById('registerBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // 阻止默认提交

        // 1. 获取表单数据
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // 2. 前端简单校验
        if (data.password !== data.password_confirm) {
            alert("两次输入的密码不一致！");
            return;
        }
        if (data.password.length < 6) {
            alert("密码长度不能少于 6 位！");
            return;
        }

        // 3. 发送请求给后端
        btn.innerText = "正在注册...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                alert("注册成功！即将前往登录页...");
                // 注册成功后，为了安全，需强制用户去登录（在登录页埋入刚才的用户名）
                window.location.href = `/gitin/index.html?username=${encodeURIComponent(data.username)}`;
            } else {
                alert(`注册失败: ${result.message || '未知错误'}`);
            }
        } catch (error) {
            console.error('注册接口请求失败:', error);
            alert("网络异常，请稍后再试");
        } finally {
            btn.innerText = "立 即 注 册";
            btn.disabled = false;
        }
    });
});