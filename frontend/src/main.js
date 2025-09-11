import './style.css';

// --- Global Data ---
let roomPriceData = {}; 

const roomTypeDetails = {
    standard: { text: 'Standard Room' },
    standard_extrabed: { text: 'Standard Room + Extra Bed' },
    deluxe: { text: 'Deluxe Room' },
    deluxe_extrabed: { text: 'Deluxe Room + Extra Bed' }
};

// --- Helper Functions ---
function formatCurrency(num) {
    if (isNaN(num)) num = 0;
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

function parseFormattedNumber(str) {
    if (typeof str !== 'string') {
        return parseFloat(str) || 0;
    }
    const raw = str.replace(/\./g, '').replace(/,/g, '.');
    return parseFloat(raw) || 0;
}

function printToday() {
    const date = new Date();
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function dateToYMD(dateString) {
    const date = new Date(dateString);
    if (isNaN(date)) return '';
    return date.toLocaleDateString('en-CA');
}

// --- Settings Logic ---
function loadRoomPrices() {
    const savedPrices = localStorage.getItem('roomPrices');
    if (savedPrices) {
        roomPriceData = JSON.parse(savedPrices);
    } else {
        // Default prices
        roomPriceData = {
            standard: 250000,
            standard_extrabed: 300000,
            deluxe: 300000,
            deluxe_extrabed: 350000
        };
        saveRoomPrices(); // Save defaults for next time
    }
}

function saveRoomPrices() {
    localStorage.setItem('roomPrices', JSON.stringify(roomPriceData));
}

function openSettingsModal() {
    document.getElementById('price-standard').value = formatCurrency(roomPriceData.standard);
    document.getElementById('price-standard_extrabed').value = formatCurrency(roomPriceData.standard_extrabed);
    document.getElementById('price-deluxe').value = formatCurrency(roomPriceData.deluxe);
    document.getElementById('price-deluxe_extrabed').value = formatCurrency(roomPriceData.deluxe_extrabed);
    document.getElementById('settingsModal').style.display = 'block';
}

function handleSaveSettings() {
    roomPriceData.standard = parseFormattedNumber(document.getElementById('price-standard').value);
    roomPriceData.standard_extrabed = parseFormattedNumber(document.getElementById('price-standard_extrabed').value);
    roomPriceData.deluxe = parseFormattedNumber(document.getElementById('price-deluxe').value);
    roomPriceData.deluxe_extrabed = parseFormattedNumber(document.getElementById('price-deluxe_extrabed').value);

    saveRoomPrices();
    alert('Prices updated successfully!');
    document.getElementById('settingsModal').style.display = 'none';
}


// --- Core Invoice Logic ---
function getRoomDetails(roomType) {
    const details = roomTypeDetails[roomType] || roomTypeDetails.standard;
    const price = roomPriceData[roomType] || roomPriceData.standard;
    return { orderText: details.text, price: price };
}

function updatePrice(row, eventSource) {
    const cost = parseFormattedNumber(row.querySelector('.cost').value);
    let qty = 0;
    const useText = row.querySelector('.desc-type-toggle').checked;

    if (useText) {
        qty = parseFloat(row.querySelector('.qty').value) || 0;
    } else {
        const checkin = row.querySelector('.checkin').value;
        const checkout = row.querySelector('.checkout').value;
        if ((eventSource === 'checkin' || eventSource === 'checkout') && checkin && checkout) {
             const timeDiff = new Date(checkout) - new Date(checkin);
             const dayDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
             qty = dayDiff > 0 ? dayDiff : 0;
             row.querySelector('.qty').value = qty;
        } else {
            qty = parseFloat(row.querySelector('.qty').value) || 0;
        }
    }
    
    const price = cost * qty;
    row.querySelector('.price').textContent = formatCurrency(price);
    updateTotal();
}


function updateTotal() {
    let subtotal = 0;
    document.querySelectorAll('#items tbody tr.item-row').forEach(row => {
        subtotal += parseFormattedNumber(row.querySelector('.price').textContent);
    });
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('total').textContent = formatCurrency(subtotal);
    updateBalance();
}

function updateBalance() {
    const total = parseFormattedNumber(document.getElementById('total').textContent);
    const paid = parseFormattedNumber(document.getElementById('paid').value);
    let due = total - paid;
    if (due < 0) due = 0;
    document.querySelector('.due').textContent = formatCurrency(due);
}

function updateItemNumbers() {
    document.querySelectorAll('#items tbody tr.item-row').forEach((row, index) => {
        const itemNumberSpan = row.querySelector('.item-number');
        if (itemNumberSpan) {
            itemNumberSpan.textContent = `${index + 1}.`;
        }
    });
}

function createNewItemRow(item = {}) {
    const itemsTbody = document.querySelector('#items tbody');
    const newRow = document.createElement('tr');
    newRow.classList.add('item-row');

    const useDates = item.descriptionType === 'dates' || !item.descriptionType;
    const initialCost = item.unitCost || 0;
    const initialPrice = item.price || 0;

    newRow.innerHTML = `
        <td class="item-name">
            <div class="delete-wpr">
                <a href="#" class="delete" title="Remove row">X</a>
                <span class="item-number"></span>
                <textarea>${item.order || 'New Item'}</textarea>
            </div>
        </td>
        <td class="description">
            <div class="desc-toggle">
                <label>
                    <input type="checkbox" class="desc-type-toggle" ${useDates ? '' : 'checked'}> Use Text
                </label>
            </div>
            <textarea class="item-description" placeholder="Additional description" style="display: ${useDates ? 'none' : 'block'};">${item.description || ''}</textarea>
            <div class="date-inputs" style="display: ${useDates ? 'flex' : 'none'};">
                <input type="date" class="checkin" value="${dateToYMD(item.checkIn || new Date())}">
                <span class="date-separator"> - </span>
                <input type="date" class="checkout" value="${dateToYMD(item.checkOut || '')}">
            </div>
        </td>
        <td class="text-center cost-col"><textarea class="cost">${formatCurrency(initialCost)}</textarea></td>
        <td class="text-center qty-col"><textarea class="qty">${item.qty || 1}</textarea></td>
        <td class="text-center price-col"><span class="price">${formatCurrency(initialPrice)}</span></td>
    `;

    const costInput = newRow.querySelector('.cost');
    costInput.addEventListener('blur', (e) => {
        e.target.value = formatCurrency(parseFormattedNumber(e.target.value));
    });
    
    newRow.querySelector('.delete').addEventListener('click', (e) => {
        e.preventDefault();
        newRow.remove();
        updateTotal();
        updateItemNumbers();
    });
    
    costInput.addEventListener('input', () => updatePrice(newRow, 'cost'));
    newRow.querySelector('.qty').addEventListener('input', () => updatePrice(newRow, 'qty'));
    newRow.querySelector('.checkin').addEventListener('input', () => updatePrice(newRow, 'checkin'));
    newRow.querySelector('.checkout').addEventListener('input', () => updatePrice(newRow, 'checkout'));

    const descToggle = newRow.querySelector('.desc-type-toggle');
    const descText = newRow.querySelector('.item-description');
    const dateInputs = newRow.querySelector('.date-inputs');

    descToggle.addEventListener('change', () => {
        if (descToggle.checked) {
            descText.style.display = 'block';
            dateInputs.style.display = 'none';
        } else {
            descText.style.display = 'none';
            dateInputs.style.display = 'flex';
        }
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
        subtotal: parseFormattedNumber(document.getElementById('subtotal').textContent),
        total: parseFormattedNumber(document.getElementById('total').textContent),
        amountPaid: parseFormattedNumber(document.getElementById('paid').value),
        balanceDue: parseFormattedNumber(document.querySelector('.due').textContent)
    };

    document.querySelectorAll('#items .item-row').forEach(row => {
        const useText = row.querySelector('.desc-type-toggle').checked;
        invoiceData.items.push({
            order: row.querySelector('.item-name textarea').value,
            descriptionType: useText ? 'text' : 'dates',
            description: useText ? row.querySelector('.item-description').value : '',
            checkIn: useText ? '' : row.querySelector('.checkin').value,
            checkOut: useText ? '' : row.querySelector('.checkout').value,
            unitCost: parseFormattedNumber(row.querySelector('.cost').value),
            qty: row.querySelector('.qty').value,
            price: parseFormattedNumber(row.querySelector('.price').textContent)
        });
    });

    try {
        const response = await fetch(`/api/invoices`, {
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
        const response = await fetch(`/api/invoices/${invoiceId}`);
        if (!response.ok) throw new Error('Invoice not found');
        
        const data = await response.json();
        
        document.getElementById('customer-title').value = data.title;
        document.getElementById('address').value = data.address;
        document.getElementById('date').value = data.date;
        document.getElementById('paid').value = formatCurrency(data.amountPaid);

        document.querySelector('#items tbody').innerHTML = '';
        data.items.forEach(item => {
            const row = createNewItemRow(item);
            updatePrice(row);
        });
        
        updateTotal();
        updateItemNumbers();
        document.getElementById('historyModal').style.display = 'none';

    } catch (error) {
        alert(error.message);
    }
}

async function showHistory() {
    try {
        const response = await fetch(`/api/invoices`);
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
                    <div class="invoice-info">
                        <span class="customer">${invoice.customer || 'No Title'}</span>
                        <span>Date: ${invoice.date}</span>
                        <span>Total: ${formatCurrency(invoice.total)}</span>
                    </div>
                    <button class="delete-invoice-btn">Delete</button>
                `;
                li.querySelector('.invoice-info').addEventListener('click', () => loadInvoiceById(invoice.id));
                li.querySelector('.delete-invoice-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    deleteInvoice(invoice.id);
                });
                list.appendChild(li);
            });
        }
        document.getElementById('historyModal').style.display = 'block';
    } catch (error) {
        alert('Could not fetch invoice history.');
    }
}

async function deleteInvoice(invoiceId) {
    if (!confirm('Are you sure you want to delete this invoice?')) {
        return;
    }
    try {
        const response = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to delete.');
        alert(data.message);
        showHistory();
    } catch (error) {
        alert('Failed to delete invoice.\n' + error.message);
    }
}

// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    loadRoomPrices();
    document.getElementById('date').value = printToday();

    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);
    document.getElementById('save-btn').addEventListener('click', saveInvoice);
    document.getElementById('history-btn').addEventListener('click', showHistory);

    const originalTitle = document.title;
    document.getElementById('print-btn').addEventListener('click', () => {
        let newTitle = "Invoice";
        const customerName = document.getElementById('customer-title').value.trim().replace(/\s+/g, '_');
        const firstItemRow = document.querySelector('.item-row');
        
        if (firstItemRow) {
            const checkinInput = firstItemRow.querySelector('.checkin');
            const checkoutInput = firstItemRow.querySelector('.checkout');

            if (checkinInput && checkinInput.value && checkoutInput && checkoutInput.value) {
                const formatDate = (dateString) => {
                    const parts = dateString.split('-');
                    return `${parts[2]}-${parts[1]}`;
                };
                const checkinStr = formatDate(checkinInput.value);
                const checkoutStr = formatDate(checkoutInput.value);
                const year = checkinInput.value.split('-')[0];
                newTitle = `${customerName}_${checkinStr}-${checkoutStr}_${year}`;
            } else if (customerName) {
                 newTitle = `${customerName}_Invoice`;
            }
        } else if (customerName) {
            newTitle = `${customerName}_Invoice`;
        }
        document.title = newTitle;
        window.print();
        setTimeout(() => {
            document.title = originalTitle;
        }, 1000);
    });

    document.getElementById('addrow').addEventListener('click', (e) => {
        e.preventDefault();
        const roomType = document.getElementById('roomType').value;
        const details = getRoomDetails(roomType);
        const newRow = createNewItemRow({ order: details.orderText, unitCost: details.price, qty: 1 });
        updatePrice(newRow);
        updateItemNumbers();
    });

    const paidInput = document.getElementById('paid');
    paidInput.addEventListener('blur', (e) => {
        e.target.value = formatCurrency(parseFormattedNumber(e.target.value));
        updateBalance();
    });
    paidInput.addEventListener('input', updateBalance);
    
    document.querySelector('#historyModal .close-button').addEventListener('click', () => {
        document.getElementById('historyModal').style.display = 'none';
    });
    document.querySelector('#settingsModal .close-button').addEventListener('click', () => {
        document.getElementById('settingsModal').style.display = 'none';
    });
    document.getElementById('save-settings-btn').addEventListener('click', handleSaveSettings);

    window.addEventListener('click', (event) => {
        if (event.target == document.getElementById('historyModal')) {
            document.getElementById('historyModal').style.display = 'none';
        }
        if (event.target == document.getElementById('settingsModal')) {
            document.getElementById('settingsModal').style.display = 'none';
        }
    });

    const initialRow = createNewItemRow({ order: 'Standard Room', unitCost: 250000, qty: 1 });
    updatePrice(initialRow);
    updateItemNumbers();
    paidInput.value = formatCurrency(0);
});
