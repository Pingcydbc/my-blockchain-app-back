const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const axios = require('axios'); // สำหรับดึงข้อมูลจาก Etherscan API
const db = require('./db');
require('dotenv').config();

// 1. ฟังก์ชันสมัครสมาชิก
const register = async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        res.status(201).json({ message: "สมัครสมาชิกสำเร็จ!" });
    } catch (error) {
        res.status(500).json({ error: "สมัครไม่สำเร็จ: " + error.message });
    }
};

// 2. ฟังก์ชันเข้าสู่ระบบ
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

// 3. ฟังก์ชันสร้าง Wallet ใหม่ในระบบ
const generateWallet = async (req, res) => {
    const { username } = req.body;
    try {
        const wallet = ethers.Wallet.createRandom();
        await db.execute(
            'UPDATE users SET wallet_address = ?, private_key = ? WHERE username = ?',
            [wallet.address, wallet.privateKey, username]
        );
        res.json({ message: "สร้างกระเป๋าสำเร็จ!", address: wallet.address });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 4. ฟังก์ชันโอนเหรียญ (หัก Gas จากกระเป๋าในระบบ)
const transferToken = async (req, res) => {
    const { fromUsername, toAddress, amount } = req.body; 

    try {
        const [users] = await db.execute('SELECT private_key FROM users WHERE username = ?', [fromUsername]);
        if (users.length === 0 || !users[0].private_key) {
            return res.status(404).json({ message: "ไม่พบกระเป๋าในระบบ" });
        }
        
        const senderPrivateKey = users[0].private_key;
        // ใช้ 1RPC หรือ RPC ที่เสถียร
        const provider = new ethers.providers.JsonRpcProvider("https://1rpc.io/sepolia");
        const wallet = new ethers.Wallet(senderPrivateKey, provider);

        const contractAddress = "0x718dF080ddCB27Ee16B482c638f9Ed4b11e7Daf4"; 
        const abi = ["function transfer(address to, uint256 amount) public returns (bool)"];
        const contract = new ethers.Contract(contractAddress, abi, wallet);

        // ดึงราคา Gas ปัจจุบันและเพิ่มขึ้น 20% เพื่อความรวดเร็ว
        const gasPrice = await provider.getGasPrice();
        
        const tx = await contract.transfer(
            toAddress, 
            ethers.utils.parseUnits(amount.toString(), 18),
            {
                gasLimit: 80000,
                gasPrice: gasPrice.mul(12).div(10)
            }
        );

        const receipt = await tx.wait(); 
        console.log("Transaction Receipt:", receipt);

        res.json({ 
            success: true, 
            message: "โอนสำเร็จ!", 
            hash: receipt.transactionHash 
        });

    } catch (error) {
        console.error("Transfer Error:", error);
        let msg = error.message;
        if (msg.includes("insufficient funds")) msg = "ค่า Gas (ETH) ในกระเป๋าไม่พอ";
        res.status(500).json({ error: msg });
    }
};
// 5. ฟังก์ชันดึงประวัติการโอนจาก Etherscan API
const getTransactions = async (req, res) => {
    const { address } = req.query;
    const apiKey = process.env.ETHERSCAN_API_KEY;

    try {
        const ethUrl = `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=txlist&address=${address}&sort=desc&apikey=${apiKey}`;
        const tokenUrl = `https://api.etherscan.io/v2/api?chainid=11155111&module=account&action=tokentx&address=${address}&sort=desc&apikey=${apiKey}`;

        const [ethRes, tokenRes] = await Promise.all([
            axios.get(ethUrl),
            axios.get(tokenUrl)
        ]);

        const ethData = ethRes.data.status === "1" ? ethRes.data.result : [];
        const tokenData = tokenRes.data.status === "1" ? tokenRes.data.result : [];

        // 1. จัดการข้อมูล ETH: กรองค่า gas (0 value) และใส่สัญลักษณ์ "ETH"
        const formattedEth = ethData
            .filter(tx => tx.value !== "0")
            .map(tx => ({
                ...tx,
                coinSymbol: "ETH", // เรากำหนดเองว่าเป็น ETH
                coinDecimal: "18",
                isToken: false
            }));

        // 2. จัดการข้อมูล Token: ใช้ค่าจาก API ได้เลย (เช่น OERC, USDT)
        const formattedToken = tokenData.map(tx => ({
            ...tx,
            coinSymbol: tx.tokenSymbol, // ใช้ชื่อเหรียญจาก API (เช่น OERC)
            coinDecimal: tx.tokenDecimal,
            isToken: true
        }));

        // 3. รวมและเรียงลำดับตามเวลา
        const allTransactions = [...formattedEth, ...formattedToken].sort((a, b) => {
            return parseInt(b.timeStamp) - parseInt(a.timeStamp);
        });

        res.json({ success: true, transactions: allTransactions });

    } catch (error) {
        console.error("History Error:", error);
        res.status(500).json({ error: "ดึงข้อมูลประวัติล้มเหลว" });
    }
};
// ส่งออกฟังก์ชันทั้งหมดเพื่อใช้งานใน index.js
module.exports = { register, login, generateWallet, transferToken, getTransactions };