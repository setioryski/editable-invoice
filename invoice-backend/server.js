const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// Session Middleware Setup
app.use(session({
  secret: 'a-very-secret-key-that-should-be-changed',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using HTTPS
}));

// API Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    req.session.loggedIn = true;
    res.status(200).json({ message: 'Login successful' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Middleware to protect routes
const requireLogin = (req, res, next) => {
  if (req.session.loggedIn) {
    next(); // User is logged in, proceed
  } else {
    res.redirect('/'); // User is not logged in, redirect to login page
  }
};

// Protected route for the invoice page
app.get('/invoice.html', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/invoice.html'));
});

// Serve static files (CSS, client-side JS, images)
app.use(express.static(path.join(__dirname, '../frontend/dist')));


// --- DATABASE SETUP ---
const dbPath = path.join(__dirname, 'invoice_database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // Create tables if they don't exist
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
                if(err) console.error("Error creating invoices table", err.message);
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
                if(err) console.error("Error creating invoice_items table", err.message);
            });
        });
    }
});


// --- API ROUTES ---
app.get('/api/invoices', requireLogin, (req, res) => {
    const sql = `SELECT invoice_id_text as id, customer_title as customer, date, total FROM invoices ORDER BY created_at DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/invoices', requireLogin, (req, res) => {
    const { title, address, date, items, subtotal, total, amountPaid, balanceDue } = req.body;
    const invoiceIdText = `inv_${Date.now()}`;

    const invoiceSql = `INSERT INTO invoices (invoice_id_text, customer_title, address, date, subtotal, total, amount_paid, balance_due) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    const invoiceParams = [invoiceIdText, title, address, date, subtotal, total, amountPaid, balanceDue];

    db.run(invoiceSql, invoiceParams, function(err) {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        
        const invoiceDbId = this.lastID;
        const itemSql = `INSERT INTO invoice_items (invoice_id, item_order, description_type, description, check_in, check_out, unit_cost, qty, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        items.forEach(item => {
            const itemParams = [invoiceDbId, item.order, item.descriptionType, item.description, item.checkIn, item.checkOut, item.unitCost, item.qty, item.price];
            db.run(itemSql, itemParams, (itemErr) => {
                if (itemErr) {
                    console.error("Error saving an invoice item:", itemErr.message);
                }
            });
        });

        res.status(201).json({ message: 'Invoice saved successfully!', invoiceId: invoiceIdText });
    });
});

app.get('/api/invoices/:id', requireLogin, (req, res) => {
    const invoiceIdText = req.params.id;

    const invoiceSql = `SELECT * FROM invoices WHERE invoice_id_text = ?`;
    db.get(invoiceSql, [invoiceIdText], (err, invoice) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (!invoice) {
            res.status(404).json({ "message": "Invoice not found" });
            return;
        }

        const itemsSql = `SELECT item_order as "order", description_type as "descriptionType", description, check_in as "checkIn", check_out as "checkOut", unit_cost as "unitCost", qty, price FROM invoice_items WHERE invoice_id = ?`;
        db.all(itemsSql, [invoice.id], (itemErr, items) => {
            if (itemErr) {
                res.status(500).json({ "error": itemErr.message });
                return;
            }
            const response = {
                title: invoice.customer_title,
                address: invoice.address,
                date: invoice.date,
                subtotal: invoice.subtotal,
                total: invoice.total,
                amountPaid: invoice.amount_paid,
                balanceDue: invoice.balance_due,
                items: items
            };
            res.json(response);
        });
    });
});

app.delete('/api/invoices/:id', requireLogin, (req, res) => {
    const invoiceIdText = req.params.id;

    const findInvoiceSql = `SELECT id FROM invoices WHERE invoice_id_text = ?`;
    db.get(findInvoiceSql, [invoiceIdText], (err, row) => {
        if (err) {
            res.status(500).json({ "error": err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ "message": "Invoice not found" });
            return;
        }

        const invoiceDbId = row.id;
        const deleteItemsSql = `DELETE FROM invoice_items WHERE invoice_id = ?`;
        db.run(deleteItemsSql, invoiceDbId, function(err) {
            if (err) {
                res.status(500).json({ "error": err.message });
                return;
            }

            const deleteInvoiceSql = `DELETE FROM invoices WHERE id = ?`;
            db.run(deleteInvoiceSql, invoiceDbId, function(err) {
                if (err) {
                    res.status(500).json({ "error": err.message });
                    return;
                }
                res.json({ "message": "Invoice deleted successfully" });
            });
        });
    });
});

// This will serve index.html (the login page) for any other GET requests.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});


// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});