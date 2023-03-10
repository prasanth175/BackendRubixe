const express = require("express");
const path = require("path");
const cors = require('cors')
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());
app.use(cors())

module.exports = app;

const dbPath = path.join(__dirname, "userData.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3006, () => {
      console.log("Server Running at http://localhost:3006/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();


const authProfile = (req, res, next) => {
  let jwtToken;
  const authToken = req.headers["authorization"];

  if (authToken !== undefined) {
    jwtToken = authToken.split(" ")[1];
  }
  if (jwtToken === undefined) {
    res.status(401);
    res.send("Invalid JWT Token");
  } else {
    const isToken = jwt.verify(
      jwtToken,
      "PRASHANTH_KEY",
      async (error, payload) => {
        if (error) {
          res.status(401);
          res.send("Invalid JWT Token");
        } else {
          req.username = payload.username;
          next();
        }
      }
    );
  }
};

app.post("/register/", async (request, response) => {
  const { username, password, email, mobile } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectMobileQuery = `SELECT * FROM user WHERE mobile = '${mobile}'`;
  const dbMobile = await db.get(selectMobileQuery);
  if (dbMobile === undefined) {
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    console.log(dbUser)
    if(dbUser === undefined){
      console.log('hey')
      const createUserQuery = `
      INSERT INTO 
        user (username, password, email, mobile) 
      VALUES 
        ( 
          '${username}',
          '${hashedPassword}', 
          '${email}',
          '${mobile}'
        )`;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    const payload = {
      username: username,
    };
    const jwtToken = jwt.sign(payload, "PRASHANTH_KEY");
    response.send({ status_code: 200,
      error_txt: 'Account Created Successfully', jwtToken });
    }else{
      console.log('hello')
      response.send({
        status_code: 400,
        error_txt: 'Username already exists'
      });
    }
    
  } else {
    response.send({
      status_code: 400,
      error_txt: 'Mobile already exists'
    });
  }
});

app.post("/login/", async (req, res) => {
  const { username, password } = req.body;
  const forLogin = `
    SELECT * FROM user WHERE username= '${username}'
    `;
  const r1 = await db.get(forLogin);
  if (r1 === undefined) {
    res.status(400);
    res.send({status_code: 400,
      error_msg: 'Invalid User'});
  } else {
    const isCorrect = await bcrypt.compare(password, r1.password);
    if (isCorrect === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "PRASHANTH_KEY");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send({status_code: 400,
      error_msg: 'Invalid Password',
    username});
    }
  }
});

app.get('/books', async (req, res) => {
  console.log('---------------')
  const {search_by = '', category} = req.query
  let getAllBooks;
  if(category === ''){
    console.log('hi')
    getAllBooks = `
  SELECT * FROM sellBook 
  WHERE description LIKE '%${search_by}%'
  `
  }else{
    console.log(category)
    getAllBooks = `
  SELECT * FROM sellBook 
  WHERE description LIKE '%${search_by}%' AND category LIKE '${category}'
  `
  }


  const dbRes = await db.all(getAllBooks)
  res.send({dbRes})
})

app.get('/books/:id', async (req, res) => {
  const bookId = req.params.id
  const getBookDetails = `
  select * from sellBook where bookId = ${bookId}
  `

  const dbRes = await db.get(getBookDetails)
  res.send({dbRes})
})

app.get('/products/:id', async (req, res) => {
  const bookId = req.params.id
  const getBookDetails = `
  select * from sellBook where bookId = ${bookId}
  `

  const dbRes = await db.get(getBookDetails)
  res.send({dbRes})
})


app.get('/details', authProfile, async (req, res) => {
  const name = req.username
  res.send({name})
})

app.get('/products', authProfile, async (req, res) => {
  const name = req.username
  console.log(name)
  const getOwnBooks = `
  select * from sellBook where userId='${name}'
  `
  const dbResponse = await db.all(getOwnBooks)
  console.log(dbResponse)
  res.send({dbResponse})
})

app.post('/sell/',authProfile, async (request, response) => {
  const name = request.username
  console.log(name)
  const {category, title,
    author,
    description,
    publication_year,
    isbn,
    printed_price,
    selling_price, language, file} = request.body;
    const InsertData = `
    INSERT INTO sellBook (category, title, author, description,
      publication_year, isbn, printed_price, selling_price, language, userId, file) 
    VALUES (
      '${category}',
      '${title}',
      '${author}',
      '${description}',
      '${publication_year}',
      '${isbn}',
      '${printed_price}',
      '${selling_price}',
      '${language}',
      '${name}',
      '${file}'
    );
    `;

    const resData = await db.run(InsertData)
    console.log(resData)
    const bookId = resData.lastID;
    const updateData = `
    UPDATE sellBook SET bookId = ${bookId} WHERE bookId IS NULL`
    
    const anotherRes = await db.run(updateData)
    console.log(anotherRes)
    response.send({
      status_code: 200,
      bookId
    })


})

app.post('/biddetails', authProfile, async (req, res) => {
  console.log(req.username)
  const name = req.username
  const {bookId, bidAmount, mobile} = req.body

  const setData = `
  INSERT INTO biddetails (user, bookId, bidAmount, mobile) 
  VALUES (
    '${name}',
    ${bookId},
    '${bidAmount}',
    '${mobile}'
  )
  `

  const dbResponse = await db.run(setData)
  const bidId = dbResponse.lastID
  res.send({dbResponse,bidId})
})

app.post('/biddata', async (req, res) => {
  const {bookId} = req.body 
   const getBidDetails = `
   SELECT * FROM biddetails where bookId = ${bookId}
   `

   const dbRes = await db.all(getBidDetails)
   console.log(dbRes)
   res.send({dbRes})
})