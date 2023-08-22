const mysql = require('mysql2')

const db = mysql.createPool({
    host: 'bhdmne1moepasceuvkxo-mysql.services.clever-cloud.com', 
    user: 'uprq8amd5ztfxzqm', 
    password: "GBGzFxq9f8IcwB7p5m78",
    database: "bhdmne1moepasceuvkxo",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});


db.getConnection((err, conn) => {
    if(err) console.log(err)
    console.log("Connected successfully")
})


module.exports = db.promise()