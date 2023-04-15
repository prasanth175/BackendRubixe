const express = require("express");
const process = require('process');
const fetch = require('node-fetch');
const Razorpay = require("razorpay");
const nodemailer = require('nodemailer');
const path = require("path");
const cors = require('cors')
const bcrypt = require("bcryptjs");
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

app.use('/', async (req, res) => {
  res.send('welcome to server home page')
})

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
  const { username, password, email } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectEmailQuery = `SELECT * FROM user WHERE email = '${email}'`;
  const dbEmail = await db.get(selectEmailQuery);
  if (dbEmail === undefined) {
    const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if(dbUser === undefined){
      const createUserQuery = `
      INSERT INTO 
        user (username, email, password) 
      VALUES ( '${username}','${email}', '${hashedPassword}')`
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    const payload = {
      username: username,
    };
    const jwtToken = jwt.sign(payload, "PRASHANTH_KEY");
    response.send({ status_code: 200,
      error_txt: 'Account Created Successfully', jwtToken });
    }else{
      response.send({
        status_code: 400,
        error_txt: 'Username already exists'
      });
    }
  } else {
    response.send({
      status_code: 400,
      error_txt: 'Email already exists'
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
      res.send({status_code: 400,
      error_msg: 'Wrong Password',
    username});
    }
  }
});

app.get('/books', authProfile, async (req, res) => {
  try {
    const name = req.username
    const {search_by = '', category} = req.query
  let getAllBooks;
  if(category === ''){
    getAllBooks = `
  SELECT * FROM sellBook 
  WHERE description LIKE '%${search_by}%' and userId NOT LIKE '${name}'
  `
  }else{
    getAllBooks = `
  SELECT * FROM sellBook 
  WHERE description LIKE '%${search_by}%' AND category LIKE '${category}' and userId NOT LIKE '${name}'
  `
  }

  const dbRes = await db.all(getAllBooks, )
  res.send({dbRes})
  } catch (error) {
    res.status(500)
  }
})

app.get('/books/:id', async (req, res) => {
  const bookId = req.params.id
  const getBookDetails = `
  select * from sellBook where bookId = '${bookId}'
  `
  const dbRes = await db.get(getBookDetails)
  res.send({dbRes})
})

app.get('/products/:id', async (req, res) => {
  const bookId = req.params.id
  const getBookDetails = 'select * from sellBook where bookId = ?'

  const dbRes = await db.get(getBookDetails, [bookId])
  res.send({dbRes})
})

app.delete('/products/:id', async (req, res) => {
  const {id} = req.params
  const delItem = `
  DELETE FROM sellBook WHERE bookId = '${id}'
  `

  const dbRes = await db.run(delItem)
  res.send({dbRes})
})

app.get('/details', authProfile, async (req, res) => {
  const name = req.username
  res.send({name})
})

app.post('/mail-details', async (req,res) => {
  const {username} = req.body 
  const getMail = `SELECT email FROM user WHERE username = '${username}'`
  const dbRes = await db.get(getMail)
  res.send({dbRes})
})

app.get('/products', authProfile, async (req, res) => {
  try {
    const name = req.username
  const getOwnBooks = `
  select * from sellBook where userId='${name}'
  `
  const dbResponse = await db.all(getOwnBooks)
  res.send({dbResponse})
  } catch (error) {
    res.status(500)
  }
})

app.post('/sell/',authProfile, async (request, response) => {
  try {
    const name = request.username
  const {category, title,
    author,
    description,
    publication_year,
    isbn,
    printed_price,
    selling_price, language, file, bookId} = request.body;
    const getBookDetails = `SELECT * FROM sellBook WHERE isbn = '${isbn}' and userId = '${name}'`

    const dbGetData = await db.get(getBookDetails)
    if(dbGetData === undefined){
      const InsertData = `
    INSERT INTO sellBook (bookId, category, title, author, description,
      publication_year, isbn, printed_price, selling_price, language, userId, file) 
    VALUES (
      '${bookId}',
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
    response.send({
      status: 200,
      bookId,
      message: 'Book Added Successfully'
    })
    }else{
      response.send({message: 'This Book is already published by you', status: 400})
    }
  } catch (error) {
    console.log(error)
    res.send({error})
  }


})

app.post('/update-sell', async (request, response) => {
  try {
    const name = request.username
  const {category, title,
    author,
    description,
    publication_year,
    isbn,
    printed_price,
    selling_price, language, file, bookId} = request.body;
      const updateData = `
    UPDATE sellBook
    SET category = '${category}',
    title = '${title}',
    author= '${author}',
    description = '${description}',
    publication_year = '${publication_year}',
    isbn = '${isbn}',
    printed_price = '${printed_price}',
    selling_price = '${selling_price}',
    language = '${language}',
    file = '${file}'
    WHERE bookId = '${bookId}'
    `;
    const dbRes = await db.run(updateData)
    response.send({
      status: 200,
      bookId,
      message: 'Book Updated Successfully'
    })
  } catch (error) {
    res.send({error})
  }
})

app.post('/biddetails', authProfile, async (req, res) => {
  const name = req.username
  const {bookId, bidAmount, mobile, file, title, description} = req.body

  const setData = `
  INSERT INTO biddetails (user, bookId, bidAmount, mobile, title, description, file) 
  VALUES (
    '${name}',
    '${bookId}',
    '${bidAmount}',
    '${mobile}',
    '${title}',
    '${description}',
    '${file}'
  )
  `

  const dbResponse = await db.run(setData)
  const bidId = dbResponse.lastID
  res.send({dbResponse,bidId})
})

app.post('/biddata', async (req, res) => {
  const {bookId} = req.body 
   const getBidDetails = `
   SELECT * FROM biddetails where bookId = '${bookId}'
   `
   const dbRes = await db.all(getBidDetails)
   res.send({dbRes})
})

app.post('/book-bid-details', authProfile, async (req, res) => {
  const name = req.username
  const { bookId} = req.body 
  const getUserBids = `select * from  bidDetails where user = '${name}' and bookId = '${bookId}'`
  const response = await db.get(getUserBids)
  res.send({response})
})

app.get('/cart-details', authProfile, async (req, res) => {
  try {
    const name = req.username
  const getCartItems = `select * from bidDetails where user = '${name}'`
  const response = await db.all(getCartItems)
  res.send({response})
  } catch (error) {
    res.status(500)
  }
})

app.delete('/cart-details/:id', async (req, res) => {
  const {id} = req.params
  const delCartItem = `DELETE FROM bidDetails WHERE bookId = '${id}'`
  const dbRes = await db.run(delCartItem)
  res.send({dbRes})

})

app.post('/generate-otp', async (req, res) => {
  const { email } = req.body;
  const delDetails = `delete from otpDetails where email='${email}'`
  const resp = await db.run(delDetails)
  const otp = Math.floor(100000 + Math.random() * 900000); // generate 6-digit OTP
  console.log(otp)
  const InsertData = `INSERT INTO otpDetails (email, otp) VALUES (
    '${email}',
    ${otp}
  )`
  const response = await db.run(InsertData, (err) => {
    if (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  })
    // send OTP to user's email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: '1022prasanthkumar@gmail.com',
        pass: 'uwwi sogs whpa kgxm'
      }
    });
    const mailOptions = {
      from: '1022prasanthkumar@gmail.com',
      to: email,
      subject: 'OTP for registration',
      text: `Your OTP for registration is ${otp}. Please enter this OTP on the registration page
       to verify your email address.`
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      // console.log('OTP sent: ' + info.response);
      res.json({ message: 'OTP generated and sent to your email address.' });
    });
});

app.post('/verify-otp', async(req, res) => {
  const {email, otp} = req.body
  const verifyData = `Select * from otpDetails where email = '${email}'`

  const dbRes = await db.get(verifyData, (err) => {
    res.json({ message: 'Internal Server Problem', status: 400  });
  })

  if(dbRes === undefined){
    res.json({ message: 'Email Not Found', status: 401 });
  }else{
    const verifyOtp = dbRes.otp === otp
    if(!verifyOtp){
      res.json({ message: 'Invalid OTP', status: 402  });
    }else{
      res.json({ message: 'Email Verified', status: 200  });

    }
  }
})

// Integrate Razor pay Into our project

const razorpay = new Razorpay({
  key_id: "rzp_test_SUCPQkxTXgHfQb",
  key_secret: "GEUQlYKXrkQbt3Qh6IIzg5SO",
});

app.post('/create-order', async (req, res) => {
  const { amount, currency } = req.body;

  const options = {
    amount: amount,
    currency: currency,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send("Error creating order");
  }
});

app.get('/payments/:id', async (req, res) => {
  const {id} = req.params
  const getDetails = `SELECT * FROM sellBook WHERE bookId = '${id}'`
  const dbRes = await db.get(getDetails)
  res.send({dbRes})
})

app.post('/set-password', async (req,res)=> {
  try {
    const {password, email} = req.body 
  const hashedPassword = await bcrypt.hash(password, 10);
  const getEmail = `SELECT * FROM user WHERE email = '${email}'`

  const dbResponse = await db.get(getEmail)
  if(dbResponse === undefined){
    res.send({message: 'No user is registered with this Email', status: 400})
  }else{
    const updateData = `
    UPDATE user 
    SET password = '${hashedPassword}'
    WHERE email = '${email}'
    `
    const dbRes = await db.run(updateData)
    res.send({message: 'Password Successfully Updated', status: 200})
  }
  } catch (error) {
    res.send({message: error, status: 500})
  }
})

app.post('/change-password',authProfile, async (req,res)=> {
  try {
   const passDetails = req.body
   const {currentPassword, confirmPassword} = passDetails
   const name = req.username
   const getPassword = `SELECT password FROM user WHERE username = '${name}'`
   const dbRes = await db.get(getPassword)
   const isCorrect = await bcrypt.compare(dbRes.password, currentPassword)
   if(isCorrect){
    const hashedPassword = await bcrypt.hash(confirmPassword, 10)
    const updatePass = `
    UPDATE user 
    SET password = '${hashedPassword}'
    WHERE username = '${name}'
    `

    const dbResponse = await db.run(updatePass)
    res.send({
      error_msg: 'Password Updated Successfully',
      error_code: 200
    })
   }else{
    res.send({
      error_msg: 'Incorrect Password',
      error_code: 400
    })
   }
  }catch (error) {
    console.log(error)
    res.send({message: error, status: 500})
  }
})

app.post('/proxy/razorpay', async (req, res) => {
  try {
    const { url, method, headers } = req.body;
    const response = await fetch(url, {
      method,
      headers,
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.get('/userDetails', async (req, res) => {
  const getDetails = `pragma table_info(user)`
  const dbRes = await db.all(getDetails)
  res.send({dbRes})
})