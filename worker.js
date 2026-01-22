/**
 * 消息重写助手 - Cloudflare Worker
 * 适用于 Cloudflare Workers + D1 数据库
 */

// JWT 配置
const JWT_SECRET = 'message-rewriter-cf-secret-2026';
const JWT_EXPIRES_IN = 7 * 24 * 60 * 60; // 7天（秒）

// ===== 工具函数 =====

/**
 * 简单的 Base64 URL 编码
 */
function base64UrlEncode(str) {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * 简单的 Base64 URL 解码
 */
function base64UrlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return atob(str);
}

/**
 * 生成简单的 JWT（使用 HMAC-SHA256）
 */
async function generateToken(payload) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const tokenPayload = { ...payload, iat: now, exp: now + JWT_EXPIRES_IN };

    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(tokenPayload));
    const message = `${headerB64}.${payloadB64}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    const signatureB64 = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

    return `${message}.${signatureB64}`;
}

/**
 * 验证 JWT
 */
async function verifyToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;
        const message = `${headerB64}.${payloadB64}`;

        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = Uint8Array.from(base64UrlDecode(signatureB64), c => c.charCodeAt(0));
        const valid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));

        if (!valid) return null;

        const payload = JSON.parse(base64UrlDecode(payloadB64));
        if (payload.exp < Math.floor(Date.now() / 1000)) return null;

        return payload;
    } catch {
        return null;
    }
}

/**
 * 简单的密码哈希（使用 SHA-256 + salt）
 */
async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
    const encoder = new TextEncoder();
    const data = encoder.encode(saltHex + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return `${saltHex}:${hashHex}`;
}

/**
 * 验证密码
 */
async function verifyPassword(password, stored) {
    const [saltHex, storedHash] = stored.split(':');
    const encoder = new TextEncoder();
    const data = encoder.encode(saltHex + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex === storedHash;
}

/**
 * JSON 响应
 */
function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
    });
}

/**
 * 从请求中获取认证用户
 */
async function getAuthUser(request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.substring(7);
    return await verifyToken(token);
}

// ===== 数据库初始化 =====
async function initDatabase(db) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login TEXT
        )
    `);
}

// ===== API 处理函数 =====

/**
 * 用户注册
 */
async function handleRegister(request, env) {
    try {
        const { username, email, password } = await request.json();

        // 验证输入
        if (!username || !email || !password) {
            return jsonResponse({ success: false, message: '请填写所有必填字段' }, 400);
        }

        if (username.length < 3 || username.length > 20) {
            return jsonResponse({ success: false, message: '用户名长度应为3-20个字符' }, 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return jsonResponse({ success: false, message: '请输入有效的邮箱地址' }, 400);
        }

        if (password.length < 6) {
            return jsonResponse({ success: false, message: '密码长度至少为6个字符' }, 400);
        }

        // 检查用户名是否已存在
        const existingUser = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first();
        if (existingUser) {
            return jsonResponse({ success: false, message: '用户名已被使用' }, 400);
        }

        // 检查邮箱是否已存在
        const existingEmail = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
        if (existingEmail) {
            return jsonResponse({ success: false, message: '邮箱已被注册' }, 400);
        }

        // 加密密码
        const hashedPassword = await hashPassword(password);

        // 插入新用户
        const result = await env.DB.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)').bind(username, email, hashedPassword).run();

        // 生成令牌
        const user = { id: result.meta.last_row_id, username, email };
        const token = await generateToken(user);

        return jsonResponse({
            success: true,
            message: '注册成功',
            user: { id: user.id, username, email },
            token
        }, 201);

    } catch (error) {
        console.error('注册错误:', error);
        return jsonResponse({ success: false, message: '服务器错误，请稍后重试' }, 500);
    }
}

/**
 * 用户登录
 */
async function handleLogin(request, env) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return jsonResponse({ success: false, message: '请输入用户名和密码' }, 400);
        }

        // 查找用户
        const user = await env.DB.prepare('SELECT * FROM users WHERE username = ? OR email = ?').bind(username, username).first();

        if (!user) {
            return jsonResponse({ success: false, message: '用户名或密码错误' }, 401);
        }

        // 验证密码
        const validPassword = await verifyPassword(password, user.password);
        if (!validPassword) {
            return jsonResponse({ success: false, message: '用户名或密码错误' }, 401);
        }

        // 更新最后登录时间
        await env.DB.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').bind(user.id).run();

        // 生成令牌
        const token = await generateToken({ id: user.id, username: user.username, email: user.email });

        return jsonResponse({
            success: true,
            message: '登录成功',
            user: { id: user.id, username: user.username, email: user.email },
            token
        });

    } catch (error) {
        console.error('登录错误:', error);
        return jsonResponse({ success: false, message: '服务器错误，请稍后重试' }, 500);
    }
}

/**
 * 获取用户信息
 */
async function handleGetMe(request, env) {
    const authUser = await getAuthUser(request);
    if (!authUser) {
        return jsonResponse({ success: false, message: '未授权' }, 401);
    }

    const user = await env.DB.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?').bind(authUser.id).first();

    if (!user) {
        return jsonResponse({ success: false, message: '用户不存在' }, 404);
    }

    return jsonResponse({ success: true, user });
}

/**
 * 验证令牌
 */
async function handleVerify(request) {
    const authUser = await getAuthUser(request);
    if (!authUser) {
        return jsonResponse({ success: false, message: '令牌无效或已过期' }, 403);
    }
    return jsonResponse({ success: true, user: authUser });
}

// ===== 主请求处理 =====
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        const method = request.method;

        // 处理 CORS 预检请求
        if (method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
                }
            });
        }

        // 初始化数据库（首次请求时）
        try {
            await initDatabase(env.DB);
        } catch (e) {
            // 表已存在，忽略错误
        }

        // API 路由
        if (path.startsWith('/api/')) {
            switch (path) {
                case '/api/register':
                    if (method === 'POST') return await handleRegister(request, env);
                    break;
                case '/api/login':
                    if (method === 'POST') return await handleLogin(request, env);
                    break;
                case '/api/me':
                    if (method === 'GET') return await handleGetMe(request, env);
                    break;
                case '/api/verify':
                    if (method === 'GET') return await handleVerify(request);
                    break;
            }
            return jsonResponse({ success: false, message: 'API端点不存在' }, 404);
        }

        // 静态文件服务
        return env.ASSETS.fetch(request);
    }
};
