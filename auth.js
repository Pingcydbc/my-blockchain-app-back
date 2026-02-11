const { ethers } = require('ethers');
const bcrypt = require('bcrypt');
const db = require('./db');

// --- 1. สมัครสมาชิก (ยังไม่มีกระเป๋า) ---
const register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        res.status(201).json({ success: true, message: "สมัครสมาชิกสำเร็จ!" });
    } catch (error) {
        res.status(500).json({ error: "สมัครไม่สำเร็จ: " + error.message });
    }
};

// --- 2. เข้าสู่ระบบ ---
const login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.status(404).json({ message: "ไม่พบผู้ใช้" });

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.json({ 
                id: user.id,
                username: user.username,
                wallet_address: user.wallet_address 
            });
        } else {
            res.status(400).json({ message: "รหัสผ่านไม่ถูกต้อง" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 3. สร้างกระเป๋าใหม่ (Generate Wallet) ---
const generateWallet = async (req, res) => {
    const { username } = req.body;
    try {
        const wallet = ethers.Wallet.createRandom();
        await db.execute(
            'UPDATE users SET wallet_address = ?, private_key = ? WHERE username = ?',
            [wallet.address, wallet.privateKey, username]
        );
        
        // ส่งทั้ง success และ address กลับไป
        res.json({ 
            success: true, 
            address: wallet.address, 
            message: "สร้างกระเป๋าสำเร็จ!" 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { register, login, generateWallet, transferToken, getTransactions };