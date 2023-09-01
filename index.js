const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const port = process.env.PORT || 8000;
const cors = require("cors");
const { JsonWebTokenError } = require("jsonwebtoken");
app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const jwt = require("jsonwebtoken");

mongoose
  .connect("mongodb+srv://jdayo:jdayo123@cluster0.ubut3eb.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to mongodb");
  })
  .catch((err) => {
    console.log("Error connecting to Mongodb: ", err);
  });

app.listen(port, () => {
  console.log("server is running on port ", port);
});

const User = require("./models/user");
const Order = require("./models/order");

// function to send verification token
const sendVerificationEmail = async (email, verificationToken) => {
  //create nodemailer transport
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "jdayo2012@gmail.com",
      pass: "cemyyathgtqyspca",
    },
  });
  // compose email message
  const mailOptions = {
    from: "Dayo's Store",
    to: email,
    subject: "Email Verification",
    text: `Please click the following link to verify your email: http://localhost:8000/verify/${verificationToken}`,
  };
  // send tne email
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending verification email ", error);
  }
};

// endpoint to register an app
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // check if email is registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // create new user
    const newUser = new User({ name, email, password });

    //generate and store verification token
    newUser.verificationToken = crypto.randomBytes(20).toString("hex");

    //save the user to db
    await newUser.save();
    console.log("New User Registered:", newUser);

    // send verification email
    sendVerificationEmail(newUser.email, newUser.verificationToken);
    res.status(201).json({
      message:
        "Registration successful. Please check your email for verification.",
    });
  } catch (error) {
    console.log("Error registering user ", error);
    res.status(500).json({ message: "Registration failed" });
  }
});

// endpoint to verify the email
app.get("/verify/:token", async (req, res) => {
  try {
    const token = req.params.token;

    // find the user with the given token
    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(404).json({ message: "Invalid verification token" });
    }
    // mark the user as verified
    user.verified = true;
    user.verificationToken = undefined;

    await user.save();

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Email verification failed" });
  }
});

const generateSecretKey = () => {
  const secretKey = crypto.randomBytes(32).toString("hex");
  return secretKey;
};

const secretKey = generateSecretKey();

// Login endpoint
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    // does user exist
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    // check if password is correct
    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }
    // generate a token
    const token = jwt.sign({ userId: user._id }, secretKey);
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: "Login Failed" });
  }
});
