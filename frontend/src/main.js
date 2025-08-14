import './style.css';

// --- Configuration ---
const API_BASE_URL = import.meta.env.VITE_API_URL;

// --- Helper Functions ---
function printToday() {
    const date = new Date();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function dateToYMD(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

function roundNumber(num, decimals = 2) {
    const p = Math.pow(10, decimals);
    return (Math.round(num * p) / p).toFixed(decimals);
}

function getRoomDetails(roomType) {
    const roomPrices = {
        standard: { price: 250000, text: 'Standard Room' },
        standard_extrabed: { price: 300000, text: 'Standard Room + Extra Bed' },
        deluxe: { price: 300000, text: 'Deluxe Room' },
        deluxe_extrabed: { price: 350000, text: 'Deluxe Room + Extra Bed' },
    };
    const details = roomPrices[roomType] || roomPrices.standard;
    return { orderText: details.text, price: details.price };
}

// --- Core Invoice Logic ---
function updatePrice(row) {
    const cost = parseFloat(row.querySelector('.cost').value) || 0;
    let qty = 0;

    const checkin = row.querySelector('.checkin').value;
    const checkout = row.querySelector('.checkout').value;

    if (checkin && checkout) {
        const timeDiff = new Date(checkout) - new Date(checkin);
        const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        qty = dayDiff > 0 ? dayDiff : 0;
        row.querySelector('.qty').value = qty;
    } else {
        qty = parseFloat(row.querySelector('.qty').value) || 0;
    }
    
    const price = cost * qty;
    row.querySelector('.price').textContent = roundNumber(price);
    updateTotal();
}

function updateTotal() {
    let subtotal = 0;
    document.querySelectorAll('#items tbody tr.item-row').forEach(row => {
        subtotal += parseFloat(row.querySelector('.price').textContent) || 0;
    });
    document.getElementById('subtotal').textContent = roundNumber(subtotal);
    document.getElementById('total').textContent = roundNumber(subtotal);
    updateBalance();
}

function updateBalance() {
    const total = parseFloat(document.getElementById('total').textContent) || 0;
    const paid = parseFloat(document.getElementById('paid').value) || 0;
    let due = total - paid;
    if (due < 0) due = 0;
    document.querySelector('.due').textContent = roundNumber(due);
}

function createNewItemRow(item = {}) {
    const itemsTbody = document.querySelector('#items tbody');
    const newRow = document.createElement('tr');
    newRow.classList.add('item-row');

    newRow.innerHTML = `
        <td class="item-name">
            <div class="delete-wpr">
                <a href="#" class="delete" title="Remove row">X</a>
                <textarea>${item.order || 'New Item'}</textarea>
            </div>
        </td>
        <td class="description">
            <input type="date" class="checkin" value="${dateToYMD(item.checkIn || new Date())}" style="width: 48%;">
            <input type="date" class="checkout" value="${dateToYMD(item.checkOut || '')}" style="width: 48%;">
        </td>
        <td class="text-right"><textarea class="cost">${item.unitCost || 0}</textarea></td>
        <td class="text-right"><textarea class="qty">${item.qty || 1}</textarea></td>
        <td class="text-right"><span class="price">${roundNumber(item.price || 0)}</span></td>
    `;

    newRow.querySelector('.delete').addEventListener('click', (e) => {
        e.preventDefault();
        newRow.remove();
        updateTotal();
    });
    
    newRow.querySelectorAll('.cost, .qty, .checkin, .checkout').forEach(input => {
        input.addEventListener('input', () => updatePrice(newRow));
    });

    itemsTbody.appendChild(newRow);
    return newRow;
}

// --- API Interaction ---
async function saveInvoice() {
    const invoiceData = {
        title: document.getElementById('customer-title').value,
        address: document.getElementById('address').value,
        date: document.getElementById('date').value,
        items: [],
        subtotal: document.getElementById('subtotal').textContent,
        total: document.getElementById('total').textContent,
        amountPaid: document.getElementById('paid').value,
        balanceDue: document.querySelector('.due').textContent
    };

    document.querySelectorAll('#items .item-row').forEach(row => {
        invoiceData.items.push({
            order: row.querySelector('.item-name textarea').value,
            checkIn: row.querySelector('.checkin').value,
            checkOut: row.querySelector('.checkout').value,
            unitCost: row.querySelector('.cost').value,
            qty: row.querySelector('.qty').value,
            price: row.querySelector('.price').textContent
        });
    });

    try {
        const response = await fetch(`${API_BASE_URL}/api/invoices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save.');
        alert(`${data.message}\nYour Invoice ID is: ${data.invoiceId}`);
    } catch (error) {
        alert('Failed to save invoice. Is the backend server running?\n' + error.message);
    }
}

async function loadInvoiceById(invoiceId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/invoices/${invoiceId}`);
        if (!response.ok) throw new Error('Invoice not found');
        
        const data = await response.json();
        
        document.getElementById('customer-title').value = data.title;
        document.getElementById('address').value = data.address;
        document.getElementById('date').value = data.date;
        document.getElementById('paid').value = data.amountPaid;

        document.querySelector('#items tbody').innerHTML = '';
        data.items.forEach(item => {
            const row = createNewItemRow(item);
            updatePrice(row);
        });
        
        updateTotal();
        document.getElementById('historyModal').style.display = 'none';

    } catch (error) {
        alert(error.message);
    }
}

async function showHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/invoices`);
        const invoices = await response.json();
        const list = document.getElementById('invoice-list');
        list.innerHTML = '';

        if (invoices.length === 0) {
            list.innerHTML = '<li>No saved invoices found.</li>';
        } else {
            invoices.forEach(invoice => {
                const li = document.createElement('li');
                li.dataset.id = invoice.id;
                li.innerHTML = `
                    <span class="customer">${invoice.customer || 'No Title'}</span>
                    <span>Date: ${invoice.date}</span>
                    <span>Total: ${roundNumber(invoice.total)}</span>
                `;
                li.addEventListener('click', () => loadInvoiceById(invoice.id));
                list.appendChild(li);
            });
        }
        document.getElementById('historyModal').style.display = 'block';
    } catch (error) {
        alert('Could not fetch invoice history.');
    }
}


// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').value = printToday();

    document.getElementById('save-btn').addEventListener('click', saveInvoice);
    document.getElementById('print-btn').addEventListener('click', () => window.print());
    document.getElementById('history-btn').addEventListener('click', showHistory);
    document.getElementById('load-btn').addEventListener('click', () => {
        const id = prompt("Please enter the Invoice ID to load:");
        if (id) loadInvoiceById(id);
    });

    document.getElementById('addrow').addEventListener('click', (e) => {
        e.preventDefault();
        const roomType = document.getElementById('roomType').value;
        const details = getRoomDetails(roomType);
        const newRow = createNewItemRow({ order: details.orderText, unitCost: details.price, qty: 1 });
        updatePrice(newRow);
    });

    document.getElementById('paid').addEventListener('input', updateBalance);

    document.querySelector('.close-button').addEventListener('click', () => {
        document.getElementById('historyModal').style.display = 'none';
    });
    window.addEventListener('click', (event) => {
        if (event.target == document.getElementById('historyModal')) {
            document.getElementById('historyModal').style.display = 'none';
        }
    });

    const initialRow = createNewItemRow({ order: 'Standard Room', unitCost: 250000, qty: 1 });
    updatePrice(initialRow);
});