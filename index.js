const express = require('express');
const {open} = require('sqlite');
const sqlite3 = require('sqlite3');
const cors = require('cors')
const app = express();

app.use(express.json())
app.use(cors())

module.exports = app;

let db = null
const initializeDBAndServer = async () => {
    try {
      db = await open({
        filename: './userData.db',
        driver: sqlite3.Database,
      });
      app.listen(3005, () => {
        console.log("Server Running at http://localhost:3005/");
      });
    } catch (e) {
      console.log(`DB Error: ${e.message}`);
      process.exit(1);
    }
  };
  
  initializeDBAndServer();



  app.post("/register/", async (req, res) => {
    const { name, email, mobile, gender } = req.body;
    const check = `SELECT * FROM user WHERE email = '${email}'`;
    const getResult = await db.get(check);
    console.log(getResult);
    if (getResult === undefined) {
      const createOne = `
              INSERT INTO user (name, email, mobile, gender) 
              VALUES (
                  '${name}',
                  '${email}',
                  '${mobile}',
                  '${gender}'
              )
              `;
  
      const dbRes = await db.run(createOne);
      res.status(200);
      res.send(dbRes);
    } else {
      res.status(400);
      res.send("User already exists with the given Email ID");
    }
  });
  
  app.get('/', async (req, res) => {
    const showData = `
    SELECT * FROM user
    `
    const dbResult = await db.all(showData);
    res.send(dbResult)
  })