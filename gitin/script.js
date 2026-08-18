// ==========================================
// 1. 翻转动效控制
// ==========================================
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const container = document.getElementById('container');

signUpButton.addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

signInButton.addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});

// ==========================================
// 2. 前端对接后端 API
// ==========================================
const API_BASE_URL = '/api';

// 处理登录
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // 获取验证码图片对应的真实后端文本值（实际上依赖后端Session校验，前端只需发送）
    const btn = form.querySelector('button');
    btn.innerText = "登录中..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            window.location.href = '/home/index.html';
        } else {
            alert('登录失败: ' + result.message);
            // 刷新验证码
            document.getElementById('captchaImg').src = `/api/auth/captcha?t=${new Date().getTime()}`;
        }
    } catch (err) {
        alert('网络异常，请稍后重试');
    } finally {
        btn.innerText = "登 录"; btn.disabled = false;
    }
});

// 处理注册 (实际注册逻辑在 api/app.py 的 /api/auth/register)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    const btn = form.querySelector('button');
    btn.innerText = "注册中..."; btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            alert('注册成功！请登录');
            // 注册成功后，自动切回登录页面，并填入用户名
            container.classList.remove('right-panel-active');
            document.getElementById('loginUsername').value = data.username;
        } else {
            alert('注册失败: ' + result.message);
        }
    } catch (err) {
        alert('网络异常，请稍后重试');
    } finally {
        btn.innerText = "立即注册"; btn.disabled = false;
    }
});