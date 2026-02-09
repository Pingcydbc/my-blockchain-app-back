const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Consolidated all imports here at the top
const { 
    register, 
    login, 
    generateWallet, 
    transferToken, 
    getTransactions 
} = require('./auth');

const app = express();
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json()); 
app.use(cors()); 

// --- ตั้งค่าเส้นทาง (Routes) ---
app.post('/register', register); 
app.post('/login', login);      
app.post('/generate-wallet', generateWallet); 
app.post('/transfer', transferToken);         
app.get('/transactions', getTransactions); // This will now work perfectly

// --- เริ่มต้นเซิร์ฟเวอร์ ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`ระบบหลังบ้านทำงานแล้วที่พอร์ต ${PORT}`);
});

