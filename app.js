const express = require("express");
const mysql = require("mysql");
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

const db = mysql.createConnection({
  host: "localhost",
  user: "admin",
  password: "admin",
  database: "mathsem",
});

db.connect((e) => {
  if (e) {
    throw e;
  }
  console.log("db ok");
});

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  db.query("SELECT * FROM users2", (e, result) => {
    if (e) {
      throw e;
    }
    res.render("index", {
      data: result,
      title: "Главная",
      user: req.session.user,
    });
  });
});

app.get("/register", (req, res) => {
  res.render("registration");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const sql = "INSERT INTO users (username, password) VALUES (?, ?)";

  db.query(sql, [username, hashedPassword], (e) => {
    if (e) {
      throw e;
    }
    res.redirect("/login");
  });
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const sql = "SELECT * FROM users WHERE username = ?";

  db.query(sql, [username], async (e, result) => {
    if (e) {
      throw e;
    }
    if (result.length > 0) {
      const user = result[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (isMatch) {
        req.session.user = user;
        return res.redirect("/");
      }
    }
    res.redirect("/login");
  });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  const { name, NAME_FILE } = req.body;
  const fileName = req.file.filename;
  const sql = "INSERT INTO users2(NAME, NAME_FILE, FILE) VALUES(?, ?, ?)";

  db.query(sql, [name, NAME_FILE, fileName], (e) => {
    if (e) {
      throw e;
    }
    res.redirect("/");
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy((e) => {
    if (e) {
      throw e;
    }
    res.redirect("/");
  });
});

const port = process.env.PORT || 3000;

app.listen(port, () => console.log(`ok port ${port}`));
