document.addEventListener('DOMContentLoaded', () => {
    // 1. 验证码点击刷新逻辑
    const captchaImg = document.getElementById('captchaImage');
    if (captchaImg) {
        captchaImg.addEventListener('click', function() {
            // 添加时间戳防止浏览器缓存图片
            this.src = '/api/auth/captcha?t=' + new Date().getTime();
        });
    }

    // 2. 标准表单提交（完全交由后端处理，JS只做前置状态检查）
    const loginForm = document.querySelector('.login-form');
    if (loginForm) {
        // 如果是AJAX登录，可解开此注释。这里我们用标准的表单提交 action="/api/auth/login"
        // loginForm.addEventListener('submit', function(e) {
        //     // 可在此处加载 Loading 状态
        // });
    }
});