const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: 4000,
    ssl: {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2'
    },
    waitForConnections: true,
    connectionLimit: 1, // เหมาะสำหรับ Serverless
    queueLimit: 0
});

module.exports = pool.promise();