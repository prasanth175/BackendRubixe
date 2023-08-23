const mysql = require('mysql2')


const db = mysql.createPool({
    host: process.env.DB_HOST || 'bhdmne1moepasceuvkxo-mysql.services.clever-cloud.com',
    user: process.env.DB_USERNAME || 'uprq8amd5ztfxzqm',
    password: process.env.DB_PASSWORD || 'GBGzFxq9f8IcwB7p5m78',
    database: process.env.DB_DBNAME || 'bhdmne1moepasceuvkxo',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


db.getConnection((err, conn) => {
    if(err) console.log(err)
    console.log("Connected successfully")
})


module.exports = db.promise()