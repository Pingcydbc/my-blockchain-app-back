const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { register, login, generateWallet, transferToken, getTransactions } = require('./auth');

const app = express();

// ตั้งค่า CORS ครั้งเดียวให้ครอบคลุม
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

// --- Routes ---
app.post('/register', register);
app.post('/login', login);
app.post('/generate-wallet', generateWallet); // เผื่อไว้สำหรับคนยังไม่มีกระเป๋า
app.post('/transfer', transferToken);
app.get('/transactions', getTransactions);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});