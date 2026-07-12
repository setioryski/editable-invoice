// ============================================================
// Editable Invoice — Backend Server (Secure)
// ============================================================

// --- Load environment variables FIRST ---
require('dotenv').config();

const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// 1. SECURITY HEADERS (Helmet)
// ============================================================
app.use(helmet({
  contentSecurityPolicy: false, // allow inline scripts/styles for the invoice app
}));

// ============================================================
// 2. CORS
// ============================================================
app.use(cors());

// ============================================================
// 3. BODY PARSING
// ============================================================
app.use(express.json({ limit: '1mb' })); // limit payload size

// ============================================================
// 4. RATE LIMITING — brute-force protection
// ============================================================

// Global rate limiter: 100 requests per 15 min per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

// Strict rate limiter for login: 5 attempts per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
});

// ============================================================
// 5. SESSION MANAGEMENT
// ============================================================

// Validate session secret exists
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET || SESSION_SECRET === 'your_random_64_byte_hex_string_here') {
  console.error('ERROR: SESSION_SECRET is not set in .env file!');
  console.error('Generate one: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // only save session when something is stored
  cookie: {
    httpOnly: true,           // not accessible via JavaScript
    sameSite: 'lax',          // CSRF protection
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    secure: false,            // set to true if using HTTPS
  },
}));

// ============================================================
// 6. INPUT VALIDATION HELPERS
// ============================================================
function isValidString(value, maxLength = 255) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

function sanitize(str) {
  return String(str).trim();
}

// ============================================================
// 7. LOGIN ENDPOINT — bcrypt verification + rate limiting
// ============================================================

// Validate admin credentials exist in env
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!ADMIN_USERNAME || !ADMIN_PASSWORD_HASH) {
  console.error('ERROR: ADMIN_USERNAME or ADMIN_PASSWORD_HASH not set in .env file!');
  process.exit(1);
}

app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    // --- Input validation ---
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input type.' });
    }

    if (username.length > 100 || password.length > 128) {
      return res.status(400).json({ message: 'Invalid input length.' });
    }

    const cleanUsername = sanitize(username);

    // --- Username check (constant-time comparison not needed for username) ---
    if (cleanUsername !== ADMIN_USERNAME) {
      // Use same delay as failed password to prevent timing attacks
      await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // --- Password check with bcrypt ---
    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    // --- Success: create session ---
    req.session.loggedIn = true;
    req.session.username = cleanUsername;

    // Regenerate session ID to prevent session fixation
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err.message);
        return res.status(500).json({ message: 'Login failed. Please try again.' });
      }
      req.session.loggedIn = true;
      req.session.username = cleanUsername;
      res.status(200).json({ message: 'Login successful' });
    });

  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'An internal error occurred.' });
  }
});

// ============================================================
// 8. AUTH MIDDLEWARE
// ============================================================
const requireLogin = (req, res, next) => {
  if (req.session && req.session.loggedIn) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized. Please login first.' });
};

// ============================================================
// 9. CHECK AUTH — client-side verification
// ============================================================
app.get('/api/check-auth', (req, res) => {
  if (req.session && req.session.loggedIn) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.status(401).json({ authenticated: false });
});

// ============================================================
// 10. LOGOUT ENDPOINT
// ============================================================
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Logout failed.' });
    }
    res.clearCookie('connect.sid');
    res.status(200).json({ message: 'Logged out successfully.' });
  });
});

// ============================================================
// 11. STATIC FILES & PROTECTED ROUTES
// ============================================================

// Protected route for the invoice page
app.get('/invoice.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/invoice.html'));
});

// Serve static files (CSS, client-side JS, images)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ============================================================
// 12. DATABASE SETUP (SQLite)
// ============================================================
const dbPath = path.join(__dirname, 'invoice_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
    process.exit(1);
  }
  console.log('Connected to the SQLite database.');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id_text TEXT UNIQUE,
      customer_title TEXT,
      address TEXT,
      date TEXT,
      subtotal REAL,
      total REAL,
      amount_paid REAL,
      balance_due REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) console.error('Error creating invoices table', err.message);
    });

    db.run(`CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      item_order TEXT,
      description_type TEXT,
      description TEXT,
      check_in TEXT,
      check_out TEXT,
      unit_cost REAL,
      qty INTEGER,
      price REAL,
      FOREIGN KEY(invoice_id) REFERENCES invoices(id)
    )`, (err) => {
      if (err) console.error('Error creating invoice_items table', err.message);
    });
  });
});

// ============================================================
// 13. INVOICE API ROUTES (all protected)
// ============================================================
app.get('/api/invoices', requireLogin, (req, res) => {
  const sql = `SELECT invoice_id_text as id, customer_title as customer, date, total FROM invoices ORDER BY created_at DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('Error fetching invoices:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoices.' });
    }
    res.json(rows);
  });
});

app.post('/api/invoices', requireLogin, (req, res) => {
  const { title, address, date, items, subtotal, total, amountPaid, balanceDue } = req.body;

  // Basic validation
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Invoice must have at least one item.' });
  }

  const invoiceIdText = `inv_${Date.now()}`;
  const invoiceSql = `INSERT INTO invoices (invoice_id_text, customer_title, address, date, subtotal, total, amount_paid, balance_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const invoiceParams = [invoiceIdText, title, address, date, subtotal, total, amountPaid, balanceDue];

  db.run(invoiceSql, invoiceParams, function (err) {
    if (err) {
      console.error('Error saving invoice:', err.message);
      return res.status(500).json({ error: 'Failed to save invoice.' });
    }

    const invoiceDbId = this.lastID;
    const itemSql = `INSERT INTO invoice_items (invoice_id, item_order, description_type, description, check_in, check_out, unit_cost, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    let itemErrors = 0;
    items.forEach((item) => {
      const itemParams = [
        invoiceDbId,
        item.order,
        item.descriptionType,
        item.description,
        item.checkIn,
        item.checkOut,
        item.unitCost,
        item.qty,
        item.price,
      ];
      db.run(itemSql, itemParams, (itemErr) => {
        if (itemErr) {
          console.error('Error saving invoice item:', itemErr.message);
          itemErrors++;
        }
      });
    });

    if (itemErrors > 0) {
      return res.status(201).json({
        message: 'Invoice saved with some item errors.',
        invoiceId: invoiceIdText,
        itemErrors,
      });
    }

    res.status(201).json({ message: 'Invoice saved successfully!', invoiceId: invoiceIdText });
  });
});

app.get('/api/invoices/:id', requireLogin, (req, res) => {
  const invoiceIdText = req.params.id;

  // Validate ID format
  if (!/^inv_\d+$/.test(invoiceIdText)) {
    return res.status(400).json({ error: 'Invalid invoice ID format.' });
  }

  const invoiceSql = `SELECT * FROM invoices WHERE invoice_id_text = ?`;
  db.get(invoiceSql, [invoiceIdText], (err, invoice) => {
    if (err) {
      console.error('Error fetching invoice:', err.message);
      return res.status(500).json({ error: 'Failed to fetch invoice.' });
    }
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    const itemsSql = `SELECT item_order as "order", description_type as "descriptionType", description, check_in as "checkIn", check_out as "checkOut", unit_cost as "unitCost", qty, price FROM invoice_items WHERE invoice_id = ?`;
    db.all(itemsSql, [invoice.id], (itemErr, items) => {
      if (itemErr) {
        console.error('Error fetching invoice items:', itemErr.message);
        return res.status(500).json({ error: 'Failed to fetch invoice items.' });
      }
      res.json({
        title: invoice.customer_title,
        address: invoice.address,
        date: invoice.date,
        subtotal: invoice.subtotal,
        total: invoice.total,
        amountPaid: invoice.amount_paid,
        balanceDue: invoice.balance_due,
        items,
      });
    });
  });
});

app.delete('/api/invoices/:id', requireLogin, (req, res) => {
  const invoiceIdText = req.params.id;

  // Validate ID format
  if (!/^inv_\d+$/.test(invoiceIdText)) {
    return res.status(400).json({ error: 'Invalid invoice ID format.' });
  }

  const findInvoiceSql = `SELECT id FROM invoices WHERE invoice_id_text = ?`;
  db.get(findInvoiceSql, [invoiceIdText], (err, row) => {
    if (err) {
      console.error('Error finding invoice:', err.message);
      return res.status(500).json({ error: 'Failed to find invoice.' });
    }
    if (!row) {
      return res.status(404).json({ message: 'Invoice not found.' });
    }

    const invoiceDbId = row.id;
    const deleteItemsSql = `DELETE FROM invoice_items WHERE invoice_id = ?`;
    db.run(deleteItemsSql, invoiceDbId, function (err) {
      if (err) {
        console.error('Error deleting invoice items:', err.message);
        return res.status(500).json({ error: 'Failed to delete invoice items.' });
      }

      const deleteInvoiceSql = `DELETE FROM invoices WHERE id = ?`;
      db.run(deleteInvoiceSql, invoiceDbId, function (err) {
        if (err) {
          console.error('Error deleting invoice:', err.message);
          return res.status(500).json({ error: 'Failed to delete invoice.' });
        }
        res.json({ message: 'Invoice deleted successfully.' });
      });
    });
  });
});

// ============================================================
// 14. FALLBACK — serve login page for all other GET requests
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// ============================================================
// 15. GLOBAL ERROR HANDLER
// ============================================================
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'An internal server error occurred.' });
});

// ============================================================
// 16. START SERVER
// ============================================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
