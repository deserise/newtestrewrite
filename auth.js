/**
 * 消息重写助手 - 认证服务
 * 处理用户登录、注册、令牌管理
 */

// API 基础地址（使用相对路径，自动适配本地和线上环境）
const API_BASE = '/api';

// 本地存储键名
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

// ===== 认证服务 =====
const AuthService = {
    /**
     * 获取存储的令牌
     */
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    /**
     * 获取存储的用户信息
     */
    getUser() {
        const userStr = localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * 保存认证信息
     */
    saveAuth(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    /**
     * 清除认证信息
     */
    clearAuth() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    },

    /**
     * 检查是否已登录
     */
    isLoggedIn() {
        return !!this.getToken();
    },

    /**
     * 获取认证请求头
     */
    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

// ===== UI 辅助函数 =====

/**
 * 显示错误信息
 */
function showError(message) {
    const errorEl = document.getElementById('errorMsg');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
        setTimeout(() => errorEl.classList.remove('show'), 5000);
    }
}

/**
 * 设置加载状态
 */
function setLoading(isLoading) {
    const btn = document.getElementById('submitBtn');
    if (btn) {
        btn.disabled = isLoading;
        btn.classList.toggle('loading', isLoading);
    }
}

// ===== 认证处理函数 =====

/**
 * 处理登录
 */
async function handleLogin(username, password) {
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            AuthService.saveAuth(data.token, data.user);
            window.location.href = 'index.html';
        } else {
            showError(data.message || '登录失败');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showError('无法连接到服务器，请确保后端服务正在运行');
    } finally {
        setLoading(false);
    }
}

/**
 * 处理注册
 */
async function handleRegister(username, email, password) {
    setLoading(true);

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            AuthService.saveAuth(data.token, data.user);
            window.location.href = 'index.html';
        } else {
            showError(data.message || '注册失败');
        }
    } catch (error) {
        console.error('注册错误:', error);
        showError('无法连接到服务器，请确保后端服务正在运行');
    } finally {
        setLoading(false);
    }
}

/**
 * 处理登出
 */
function handleLogout() {
    AuthService.clearAuth();
    window.location.href = 'login.html';
}

/**
 * 验证令牌有效性
 */
async function verifyToken() {
    const token = AuthService.getToken();
    if (!token) return false;

    try {
        const response = await fetch(`${API_BASE}/verify`, {
            headers: AuthService.getAuthHeaders()
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * 渲染用户信息栏（用于主页面）
 */
function renderUserBar(container) {
    const user = AuthService.getUser();

    if (user) {
        // 已登录状态
        const initial = user.username.charAt(0).toUpperCase();
        container.innerHTML = `
            <div class="user-bar">
                <div class="user-info">
                    <div class="user-avatar">${initial}</div>
                    <div class="user-details">
                        <span class="user-name">${user.username}</span>
                        <span class="user-email">${user.email}</span>
                    </div>
                </div>
                <button class="logout-btn" onclick="handleLogout()">退出登录</button>
            </div>
        `;
    } else {
        // 未登录状态
        container.innerHTML = `
            <div class="guest-bar">
                <a href="login.html" class="guest-btn login">登录</a>
                <a href="register.html" class="guest-btn register">注册</a>
            </div>
        `;
    }
}

// 导出服务（如果需要模块化）
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthService, handleLogin, handleRegister, handleLogout };
}
