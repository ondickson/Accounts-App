const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 3000;

// Create a connection to your MySQL database
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "accounts",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to MySQL");
});

// Enable CORS and allow JSON requests
app.use(cors());
app.use(express.json());

// Get all accounts
app.get("/accounts", (req, res) => {
  db.query("SELECT * FROM accounts.Accounts", (err, results) => {
    if (err) {
      console.error("Error fetching accounts:", err.message);
      return res.status(500).json({ error: "Failed to fetch accounts" });
    }
    res.json(results);
  });
});

// Create a new account
app.post("/accounts", (req, res) => {
  const { name, type, area_id, address, status, meter_no, meter_size } =
    req.body;

  const query = `
  INSERT INTO accounts.Accounts (name, type, area_id, address, status, meter_no, meter_size)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`;
  db.query(
    query,
    [name, type, area_id, address, status, meter_no, meter_size],
    (err, result) => {
      if (err) {
        console.error("Error adding account:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to add account", details: err.message });
      }
      const newAccount = {
        id: result.insertId,
        name,
        type,
        area_id,
        address,
        status,
        meter_no,
        meter_size,
      };
      res.status(201).json(newAccount);
    }
  );
});

// Update an account
app.put("/accounts/:id", (req, res) => {
  const { id } = req.params;
  const { name, type, area_id, address, status, meter_no, meter_size } =
    req.body;

  const query = `
  UPDATE accounts.Accounts
  SET name = ?, type = ?, area_id = ?, address = ?, status = ?, meter_no = ?, meter_size = ?
  WHERE id = ?
`;
  db.query(
    query,
    [name, type, area_id, address, status, meter_no, meter_size, id],
    (err, result) => {
      if (err) {
        console.error("Error updating account:", err.message);
        return res
          .status(500)
          .json({ error: "Failed to update account", details: err.message });
      }
      res.json({ message: "Account updated successfully" });
    }
  );
});

// Delete an account
app.delete("/accounts/:id", (req, res) => {
  const { id } = req.params;

  const query = `DELETE FROM accounts.Accounts WHERE id = ?`;
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error("Error deleting account:", err.message);
      return res.status(500).json({ error: "Failed to delete account" });
    }
    res.json({ message: "Account deleted successfully" });
  });
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
