const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // <-- ADD THIS LINE
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
app.use(cors()); // <-- ADD THIS LINE to enable all CORS requests
app.use(express.json());

// Path to your JSON file acting as a database
const dbPath = path.join(__dirname, 'db.json');

// Helper function to read the database
function readDb() {
    if (!fs.existsSync(dbPath)) {
        return {};
    }
    const data = fs.readFileSync(dbPath, 'utf8');
    if (data.length === 0) {
        return {};
    }
    return JSON.parse(data);
}

// Helper function to write to the database
function writeDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- API ROUTES ---

// NEW: API endpoint to get all invoices for history
app.get('/api/invoices', (req, res) => {
    const db = readDb();
    // Transform the db object into an array for easier use on the frontend
    const invoicesArray = Object.keys(db).map(id => {
        return {
            id: id,
            customer: db[id].title,
            date: db[id].date,
            total: db[id].total
        };
    });
    // Sort by date, newest first
    invoicesArray.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(invoicesArray);
});

// API endpoint to save an invoice
app.post('/api/invoices', (req, res) => {
    const db = readDb();
    const newInvoice = req.body;
    const invoiceId = `inv_${Date.now()}`;
    db[invoiceId] = newInvoice;
    writeDb(db);
    console.log(`Invoice ${invoiceId} saved.`);
    res.status(201).json({ message: 'Invoice saved successfully!', invoiceId: invoiceId });
});

// API endpoint to load an invoice by its ID
app.get('/api/invoices/:id', (req, res) => {
    const db = readDb();
    const invoice = db[req.params.id];
    if (invoice) {
        res.json(invoice);
    } else {
        res.status(404).json({ message: 'Invoice not found' });
    }
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('CORS is now enabled.');
});
