const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 4000,
    ssl: {
        // TiDB Cloud บังคับใช้ SSL สำหรับการเชื่อมต่อแบบ Public
        rejectUnauthorized: true, 
        minVersion: 'TLSv1.2'
    },
    // การตั้งค่าสำหรับ Serverless เพื่อลดปัญหา Connection Timeout
    waitForConnections: true,
    connectionLimit: 1, // สำคัญ: บน Serverless ไม่ควรเปิด Connection ค้างไว้เยอะ
    queueLimit: 0,
    connectTimeout: 10000 // เพิ่มเวลาเชื่อมต่อเป็น 10 วินาที
});

module.exports = pool.promise();