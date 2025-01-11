const mysql = require('mysql2');

// Create a database connection
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234', // Add your MySQL password
    database: 'lms'
});

module.exports = pool.promise();
