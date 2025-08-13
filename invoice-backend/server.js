const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = 3000;

// --- MIDDLEWARE ---
// Enable CORS for all requests.
app.use(cors());

// Parse JSON bodies for API requests
app.use(express.json());


// --- STATIC FILE SERVING ---
// Serve files from the parent directory of 'invoice-backend'.
// This makes index.html, css/, images/, etc., accessible from the root.
const projectRoot = path.join(__dirname, '..');
app.use(express.static(projectRoot));


// --- DATABASE ---
// Path to your JSON file acting as a database
const dbPath = path.join(__dirname, 'db.json');

// Helper function to read the database
function readDb() {
    if (!fs.existsSync(dbPath)) {
        // If db.json doesn't exist, create it with an empty object
        fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
        return {};
    }
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        // Handle case where file is empty
        if (data.length === 0) {
            return {};
        }
        return JSON.parse(data);
    } catch (e) {
        console.error("Error reading or parsing db.json:", e);
        // If file is corrupt, return empty object
        return {};
    }
}

// Helper function to write to the database
function writeDb(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// --- API ROUTES ---

// API endpoint to get all invoices for history
app.get('/api/invoices', (req, res) => {
    const db = readDb();
    const invoicesArray = Object.keys(db).map(id => {
        return {
            id: id,
            customer: db[id].title || 'No Title', // Add fallback
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
    try {
        const db = readDb();
        const newInvoice = req.body;
        if (!newInvoice || typeof newInvoice !== 'object' || !newInvoice.items) {
             return res.status(400).json({ message: 'Invalid invoice data provided.' });
        }
        const invoiceId = `inv_${Date.now()}`;
        db[invoiceId] = newInvoice;
        writeDb(db);
        console.log(`Invoice ${invoiceId} saved.`);
        res.status(201).json({ message: 'Invoice saved successfully!', invoiceId: invoiceId });
    } catch (error) {
        console.error("Error saving invoice:", error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
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
    console.log(`Server is running.`);
    console.log(`CORS is now enabled for all origins.`);
    console.log(`Please open your application at: http://localhost:${PORT}`);
});