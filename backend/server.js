
require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const helmet = require("helmet");

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Validate required environment variables
const requiredEnv = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`${key} is missing from environment variables`);
    process.exit(1);
  }
}

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 5000
});

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173"
].filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json({ limit: "20kb" }));

// Employee input validation
function validateEmployee(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Request body must be a JSON object." };
  }

  const fields = [
    "name",
    "email",
    "department",
    "position",
    "salary",
    "status"
  ];

  const data = {};

  for (const field of fields) {
    if (partial && body[field] === undefined) continue;

    if (!partial && body[field] === undefined) {
      if (field === "status") continue;
      return { error: `${field} is required.` };
    }

    data[field] = body[field];
  }

  for (const field of ["name", "email", "department", "position"]) {
    if (data[field] !== undefined) {
      if (typeof data[field] !== "string" || !data[field].trim()) {
        return {
          error: `${field} must be a non-empty string.`
        };
      }

      data[field] = data[field].trim();
    }
  }

  if (data.email !== undefined) {
    data.email = data.email.toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { error: "Please provide a valid email address." };
    }
  }

  if (data.salary !== undefined) {
    if (
      data.salary === "" ||
      data.salary === null ||
      !Number.isFinite(Number(data.salary)) ||
      Number(data.salary) < 0
    ) {
      return {
        error: "Salary must be a non-negative number."
      };
    }

    data.salary = Number(data.salary);
  }

  if (!partial && data.status === undefined) {
    data.status = "Active";
  }

  if (
    data.status !== undefined &&
    !["Active", "Inactive"].includes(data.status)
  ) {
    return {
      error: "Status must be Active or Inactive."
    };
  }

  return { data };
}

// Centralized error handling
function handleError(res, error) {
  console.error(error);

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "An employee with this email already exists."
    });
  }

  if (
    [
      "ER_BAD_NULL_ERROR",
      "ER_DATA_TOO_LONG",
      "ER_TRUNCATED_WRONG_VALUE",
      "ER_WARN_DATA_OUT_OF_RANGE"
    ].includes(error.code)
  ) {
    return res.status(400).json({
      message: "Invalid employee data."
    });
  }

  return res.status(500).json({
    message: "Internal server error."
  });
}

// Health check
app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected"
    });
  } catch (error) {
    handleError(res, error);
  }
});

// List and search employees
app.get("/api/employees", async (req, res) => {
  try {
    const pattern = `%${String(req.query.search || "").trim()}%`;

    const [rows] = await pool.query(
      `SELECT id, name, email, department, position, salary,
              status, joining_date
       FROM employees
       WHERE name LIKE ?
          OR email LIKE ?
          OR department LIKE ?
          OR position LIKE ?
       ORDER BY id DESC`,
      [pattern, pattern, pattern, pattern]
    );

    res.json(rows);
  } catch (error) {
    handleError(res, error);
  }
});

// Get one employee
app.get("/api/employees/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({
      message: "Invalid employee ID."
    });
  }

  try {
    const [rows] = await pool.query(
      `SELECT id, name, email, department, position, salary,
              status, joining_date
       FROM employees
       WHERE id = ?`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Add employee
app.post("/api/employees", async (req, res) => {
  const validation = validateEmployee(req.body);

  if (validation.error) {
    return res.status(400).json({
      message: validation.error
    });
  }

  const {
    name,
    email,
    department,
    position,
    salary,
    status
  } = validation.data;

  try {
    const [result] = await pool.query(
      `INSERT INTO employees
       (name, email, department, position, salary, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, email, department, position, salary, status]
    );

    const [rows] = await pool.query(
      `SELECT id, name, email, department, position, salary,
              status, joining_date
       FROM employees
       WHERE id = ?`,
      [result.insertId]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Update employee
app.put("/api/employees/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({
      message: "Invalid employee ID."
    });
  }

  const validation = validateEmployee(req.body, true);

  if (validation.error) {
    return res.status(400).json({
      message: validation.error
    });
  }

  const fields = Object.keys(validation.data);

  if (!fields.length) {
    return res.status(400).json({
      message: "Provide fields to update."
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM employees WHERE id = ?",
      [req.params.id]
    );

    if (!existing.length) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    const assignments = fields
      .map(field => `${field} = ?`)
      .join(", ");

    const values = fields.map(
      field => validation.data[field]
    );

    await pool.query(
      `UPDATE employees SET ${assignments} WHERE id = ?`,
      [...values, req.params.id]
    );

    const [rows] = await pool.query(
      `SELECT id, name, email, department, position, salary,
              status, joining_date
       FROM employees
       WHERE id = ?`,
      [req.params.id]
    );

    res.json(rows[0]);
  } catch (error) {
    handleError(res, error);
  }
});

// Delete employee
app.delete("/api/employees/:id", async (req, res) => {
  if (!/^[1-9]\d*$/.test(req.params.id)) {
    return res.status(400).json({
      message: "Invalid employee ID."
    });
  }

  try {
    const [result] = await pool.query(
      "DELETE FROM employees WHERE id = ?",
      [req.params.id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        message: "Employee not found."
      });
    }

    res.json({
      message: "Employee deleted successfully."
    });
  } catch (error) {
    handleError(res, error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.message === "Origin is not allowed by CORS") {
    return res.status(403).json({
      message: "Origin is not allowed."
    });
  }

  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON body."
    });
  }

  console.error(err);

  res.status(500).json({
    message: "Internal server error."
  });
});

// Start the API only after MySQL is reachable
async function startServer() {
  try {
    await pool.query("SELECT 1");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Employee API listening on port ${PORT}`);
      console.log("MySQL connected successfully.");
    });
  } catch (error) {
    console.error("Failed to start:", error.message);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
async function shutdown() {
  try {
    await pool.end();
  } catch (error) {
    console.error("Error closing MySQL pool:", error.message);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

