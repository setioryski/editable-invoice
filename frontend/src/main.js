import './style.css';

// ============================================================
// AUTH GUARD — redirect to login if not authenticated
// ============================================================
(async function checkAuth() {
  try {
    const res = await fetch('/api/check-auth');
    if (!res.ok) {
      // Not logged in — redirect to login page
      window.location.replace('/index.html');
    }
  } catch (err) {
    // Backend unreachable — redirect to login
    window.location.replace('/index.html');
  }
})();

// --- Helper Functions ---

/**
 * Formats a number into a currency string (e.g., 1000000 -> "1.000.000").
 * @param {number} num The number to format.
 * @returns {string} The formatted currency string.
 */
function formatCurrency(num) {
    if (isNaN(num)) num = 0;
    return new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

/**
 * Parses a formatted currency string back into a number (e.g., "1.000.000,00" -> 1000000).
 * @param {string} str The formatted string to parse.
 * @returns {number} The parsed number.
 */
function parseFormattedNumber(str) {
    if (typeof str !== 'string') {
        return parseFloat(str) || 0;
    }
    // Remove thousand separators (.) and replace decimal comma (,) with a dot (.)
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
    return date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
}

function getRoomDetails(roomType) {
    // Load prices from localStorage or use defaults
    const savedPrices = JSON.parse(localStorage.getItem('roomPrices')) || {};
    const roomPrices = {
        standard: { price: savedPrices.standard || 250000, text: 'Standard Room' },
        standard_extrabed: { price: savedPrices.standard_extrabed || 300000, text: 'Standard Room + Extra Bed' },
        deluxe: { price: savedPrices.deluxe || 300000, text: 'Deluxe Room' },
        deluxe_extrabed: { price: savedPrices.deluxe_extrabed || 350000, text: 'Deluxe Room + Extra Bed' },
    };
    const details = roomPrices[roomType] || roomPrices.standard;
    return { orderText: details.text, price: details.price };
}

// --- Core Invoice Logic ---
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

    // Add event listeners for formatting editable currency fields
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

    // --- Auto-resize logic for Item Name textarea ---
    const itemNameTextarea = newRow.querySelector('.item-name textarea');
    
    // Function to adjust textarea height based on content
    const autoResize = (el) => {
        el.style.height = 'auto'; // Reset height to recalculate
        el.style.height = (el.scrollHeight) + 'px'; // Set height to content height
    };

    // Add event listener to resize on input
    itemNameTextarea.addEventListener('input', () => autoResize(itemNameTextarea));
    
    // Initial resize after the element is added to the DOM
    setTimeout(() => autoResize(itemNameTextarea), 0);


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

// --- Settings Modal Logic ---
function openSettingsModal() {
    const savedPrices = JSON.parse(localStorage.getItem('roomPrices')) || {};
    document.getElementById('price-standard').value = savedPrices.standard || '250000';
    document.getElementById('price-standard-extrabed').value = savedPrices.standard_extrabed || '300000';
    document.getElementById('price-deluxe').value = savedPrices.deluxe || '300000';
    document.getElementById('price-deluxe-extrabed').value = savedPrices.deluxe_extrabed || '350000';
    document.getElementById('settingsModal').style.display = 'block';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings(e) {
    e.preventDefault();
    const newPrices = {
        standard: parseFormattedNumber(document.getElementById('price-standard').value),
        standard_extrabed: parseFormattedNumber(document.getElementById('price-standard-extrabed').value),
        deluxe: parseFormattedNumber(document.getElementById('price-deluxe').value),
        deluxe_extrabed: parseFormattedNumber(document.getElementById('price-deluxe-extrabed').value),
    };
    localStorage.setItem('roomPrices', JSON.stringify(newPrices));
    alert('Prices saved!');
    closeSettingsModal();
}


// --- Event Listeners Setup ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('date').value = printToday();

    // --- Address textarea auto-resize ---
    const addressTextarea = document.getElementById('address');
    const autoResizeAddress = () => {
        addressTextarea.style.height = 'auto';
        addressTextarea.style.height = (addressTextarea.scrollHeight) + 'px';
    };
    addressTextarea.addEventListener('input', autoResizeAddress);
    setTimeout(autoResizeAddress, 0);

    document.getElementById('save-btn').addEventListener('click', saveInvoice);
    document.getElementById('history-btn').addEventListener('click', showHistory);
    document.getElementById('settings-btn').addEventListener('click', openSettingsModal);

    // --- Document Type Dropdown (Invoice / Quotation) ---
    const doctypeSelect = document.getElementById('doctype-select');
    const headerEl = document.getElementById('header');

    // Update header text when dropdown changes
    doctypeSelect.addEventListener('change', () => {
        const val = doctypeSelect.value;
        headerEl.textContent = val;
        // Update the print button text to reflect current doctype
        document.getElementById('print-btn').textContent = `Print ${val.charAt(0) + val.slice(1).toLowerCase()}`;
    });

    // --- Font Size Control Logic ---
    const customerTitle = document.getElementById('customer-title');
    const increaseFontBtn = document.getElementById('font-size-increase');
    const decreaseFontBtn = document.getElementById('font-size-decrease');
    
    // Function to apply font size and save it
    const applyFontSize = (size) => {
        // Ensure font size doesn't go below a readable limit
        if (size < 10) size = 10; 
        customerTitle.style.fontSize = `${size}px`;
        localStorage.setItem('customerTitleFontSize', size);
    };

    // Load initial font size from localStorage or use default
    let currentFontSize = parseInt(localStorage.getItem('customerTitleFontSize')) || 20;
    applyFontSize(currentFontSize);

    // Event listeners for buttons
    increaseFontBtn.addEventListener('click', () => {
        currentFontSize += 1;
        applyFontSize(currentFontSize);
    });

    decreaseFontBtn.addEventListener('click', () => {
        currentFontSize -= 1;
        applyFontSize(currentFontSize);
    });

    // --- Print Handling ---
    const originalTitle = document.title;

    // Restore the original title after printing is done or cancelled
    window.addEventListener('afterprint', () => {
        document.title = originalTitle;
    });

    // Setup print button click
    document.getElementById('print-btn').addEventListener('click', () => {
        const docType = document.getElementById('header').textContent; // "INVOICE" or "QUOTATION"
        let newTitle = docType.charAt(0) + docType.slice(1).toLowerCase(); // "Invoice" or "Quotation"

        // Get customer name and replace spaces with underscores
        const customerName = document.getElementById('customer-title').value.trim().replace(/\s+/g, '_');

        // Find all checkin and checkout dates
        const allCheckinDates = [...document.querySelectorAll('.item-row .checkin')]
            .map(input => input.value)
            .filter(val => val) // Filter out empty strings
            .map(dateStr => new Date(dateStr)); // Convert to Date objects

        const allCheckoutDates = [...document.querySelectorAll('.item-row .checkout')]
            .map(input => input.value)
            .filter(val => val) // Filter out empty strings
            .map(dateStr => new Date(dateStr)); // Convert to Date objects

        if (allCheckinDates.length > 0 && allCheckoutDates.length > 0) {
            // Find the earliest check-in and latest check-out
            const earliestCheckin = new Date(Math.min.apply(null, allCheckinDates));
            const latestCheckout = new Date(Math.max.apply(null, allCheckoutDates));

            // Helper to format date object to DD-MM
            const formatDate = (dateObj) => {
                const day = String(dateObj.getDate()).padStart(2, '0');
                const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
                return `${day}-${month}`;
            };

            const checkinStr = formatDate(earliestCheckin);
            const checkoutStr = formatDate(latestCheckout);
            const year = earliestCheckin.getFullYear();

            newTitle = `${customerName}_${checkinStr}-${checkoutStr}_${year}`;
        } else if (customerName) {
            newTitle = `${customerName}_${docType.charAt(0) + docType.slice(1).toLowerCase()}`;
        }

        // Set the new title before calling print
        document.title = newTitle;

        // Use a short timeout. This gives mobile browsers a moment to process
        // the title change before the print dialog is triggered.
        setTimeout(() => {
            window.print();
        }, 100);
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
    
    // Settings Modal Listeners
    document.querySelector('#settingsModal .close-button').addEventListener('click', closeSettingsModal);
    document.getElementById('settings-form').addEventListener('submit', saveSettings);
    
    // History Modal Listeners
    document.querySelector('#historyModal .close-button').addEventListener('click', () => {
        document.getElementById('historyModal').style.display = 'none';
    });

    // Close modals if user clicks outside of them
    window.addEventListener('click', (event) => {
        if (event.target == document.getElementById('historyModal')) {
            document.getElementById('historyModal').style.display = 'none';
        }
        if (event.target == document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    });

    const initialRow = createNewItemRow({ order: 'Standard Room', unitCost: 250000, qty: 1 });
    updatePrice(initialRow);
    updateItemNumbers();
    paidInput.value = formatCurrency(0); // Format initial paid amount
});

