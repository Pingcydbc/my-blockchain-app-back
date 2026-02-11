const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { register, login, generateWallet, transferToken, getTransactions } = require('./auth');

const app = express();

// --- 🟢 แก้ไข CORS ให้รองรับ Preflight Request ---
app.use(cors({
    origin: 'https://my-blockchain-app-eta.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// เช็คสถานะ API ง่ายๆ
app.get('/', (req, res) => res.send('OERC API is running...'));

// --- Routes ---
app.post('/register', register);
app.post('/login', login);
app.post('/generate-wallet', generateWallet);
app.post('/transfer', transferToken);
app.get('/transactions', getTransactions);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});