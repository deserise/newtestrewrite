/**
 * 消息重写助手 - 后端服务
 * 功能：用户注册、登录、JWT认证
 */

const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

// ===== 配置 =====
const PORT = 3000;
const JWT_SECRET = 'message-rewriter-secret-key-2026'; // 生产环境应使用环境变量
const JWT_EXPIRES_IN = '7d';

// ===== 初始化 Express =====
const app = express();
app.use(cors());
app.use(express.json());

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname)));

// ===== 初始化数据库 =====
const db = new Database(path.join(__dirname, 'users.db'));

// 创建用户表
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
    )
`);

console.log('✅ 数据库初始化完成');

// ===== 辅助函数 =====

/**
 * 生成JWT令牌
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * 验证JWT中间件
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '未提供认证令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '令牌无效或已过期' });
        }
        req.user = user;
        next();
    });
}

// ===== API 路由 =====

/**
 * 用户注册
 * POST /api/register
 */
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '请填写所有必填字段'
            });
        }

        // 验证用户名长度
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                success: false,
                message: '用户名长度应为3-20个字符'
            });
        }

        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '请输入有效的邮箱地址'
            });
        }

        // 验证密码长度
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: '密码长度至少为6个字符'
            });
        }

        // 检查用户名是否已存在
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '用户名已被使用'
            });
        }

        // 检查邮箱是否已存在
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: '邮箱已被注册'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入新用户
        const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
        const result = stmt.run(username, email, hashedPassword);

        // 生成令牌
        const user = { id: result.lastInsertRowid, username, email };
        const token = generateToken(user);

        console.log(`✅ 新用户注册: ${username}`);

        res.status(201).json({
            success: true,
            message: '注册成功',
            user: { id: user.id, username, email },
            token
        });

    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

/**
 * 用户登录
 * POST /api/login
 */
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: '请输入用户名和密码'
            });
        }

        // 查找用户（支持用户名或邮箱登录）
        const user = db.prepare(
            'SELECT * FROM users WHERE username = ? OR email = ?'
        ).get(username, username);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 更新最后登录时间
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

        // 生成令牌
        const token = generateToken(user);

        console.log(`✅ 用户登录: ${user.username}`);

        res.json({
            success: true,
            message: '登录成功',
            user: { id: user.id, username: user.username, email: user.email },
            token
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误，请稍后重试'
        });
    }
});

/**
 * 获取当前用户信息（需要认证）
 * GET /api/me
 */
app.get('/api/me', authenticateToken, (req, res) => {
    const user = db.prepare('SELECT id, username, email, created_at, last_login FROM users WHERE id = ?').get(req.user.id);

    if (!user) {
        return res.status(404).json({
            success: false,
            message: '用户不存在'
        });
    }

    res.json({
        success: true,
        user
    });
});

/**
 * 验证令牌有效性
 * GET /api/verify
 */
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});

/**
 * 获取用户统计（需要认证）
 * GET /api/stats
 */
app.get('/api/stats', authenticateToken, (req, res) => {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    res.json({
        success: true,
        stats: {
            totalUsers
        }
    });
});

// ===== 启动服务器 =====
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║    消息重写助手 - 后端服务已启动       ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  🌐 地址: http://localhost:${PORT}         ║`);
    console.log('║  📝 API 端点:                          ║');
    console.log('║     POST /api/register - 用户注册      ║');
    console.log('║     POST /api/login    - 用户登录      ║');
    console.log('║     GET  /api/me       - 用户信息      ║');
    console.log('║     GET  /api/verify   - 验证令牌      ║');
    console.log('╚════════════════════════════════════════╝');
    console.log('');
});
