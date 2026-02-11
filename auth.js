const { ethers } = require('ethers');
const bcrypt = require('bcrypt');
const db = require('./db');
const axios = require('axios'); // สำหรับดึงข้อมูลจาก Etherscan

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

        res.json({
            success: true,
            address: wallet.address,
            message: "สร้างกระเป๋าสำเร็จ!"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- 4. โอนเหรียญ (Transfer Token) ---
const transferToken = async (req, res) => {
    const { fromUsername, toAddress, amount } = req.body;
    try {
        // ดึง Private Key ของผู้ส่งจากฐานข้อมูล
        const [users] = await db.execute('SELECT private_key FROM users WHERE username = ?', [fromUsername]);
        if (users.length === 0 || !users[0].private_key) {
            return res.status(404).json({ error: "ไม่พบกระเป๋าเงินของผู้ส่ง" });
        }

        const privateKey = users[0].private_key;
        const provider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
        const wallet = new ethers.Wallet(privateKey, provider);

        // ABI สำหรับฟังก์ชัน transfer ของ ERC-20
        const abi = ["function transfer(address to, uint256 amount) returns (bool)"];
        const contractAddress = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        // ทำการโอน (18 decimals)
        const tx = await contract.transfer(toAddress, ethers.utils.parseUnits(amount, 18));
        await tx.wait(); // รอยืนยันธุรกรรม

        res.json({ success: true, hash: tx.hash });
    } catch (error) {
        res.status(500).json({ error: "โอนไม่สำเร็จ: " + error.message });
    }
};

// --- 5. ดึงประวัติธุรกรรม (Get Transactions) - ปรับปรุงเพื่อความชัวร์ ---
const getTransactions = async (req, res) => {
    const { address } = req.query;
    if (!address) return res.status(400).json({ error: "No address" });

    try {
        // วาง Key ตรงๆ เพื่อทดสอบ (Hardcode)
        const apiKey = "Y5SJ2VW5F9UGQJG537JQMUZ8DEQRPY6STI"; 
        const contractAddress = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4";
        
        // ใช้ URL V2 ที่ระบุ chainid เสมอ
        const url = `https://api-sepolia.etherscan.io/api?chainid=11155111&module=account&action=tokentx&contractaddress=${contractAddress}&address=${address}&page=1&offset=100&sort=desc&apikey=${apiKey}`;
        
        console.log("Requesting URL:", url); // เพิ่ม Log เพื่อดูใน Vercel

        const response = await axios.get(url);
        
        if (response.data.status === "1") {
            res.json({ success: true, transactions: response.data.result || [] });
        } else {
            // ถ้า Etherscan ตอบกลับมาเป็นอย่างอื่น ให้ส่ง Message ไปดูด้วย
            res.json({ success: true, transactions: [], message: response.data.message, result: response.data.result });
        }
    } catch (error) {
        console.error("API Error:", error.message);
        res.status(500).json({ success: false, transactions: [] });
    }
};
// ส่งออกฟังก์ชันทั้งหมด (ตอนนี้ครบทุกชื่อแล้ว)
module.exports = { register, login, generateWallet, transferToken, getTransactions };