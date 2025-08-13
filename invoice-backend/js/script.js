document.addEventListener('DOMContentLoaded', () => {
  let standardRoomCount = 201;
  let deluxeRoomCount = 101;

  const roomTypeSelect = document.getElementById('roomType');
  const addRowLink = document.getElementById('addrow');

  // Function to update order numbers for all rows.
  function updateOrderNumbers() {
    const rows = document.querySelectorAll('.item-row');
    rows.forEach((row, index) => {
      const orderSpan = row.querySelector('.order-number');
      if (orderSpan) {
        orderSpan.textContent = (index + 1) + '. ';
      }
    });
  }

  // Function that creates a new row in the desired format.
  // It uses the static text "Room 101" and cost "250000" as per your sample.
  function createNewRow() {
    return `
      <tr class="item-row">
        <td class="item-name">
          <div class="delete-wpr">
            <span class="order-number"></span>
            <textarea>Room 101</textarea>
            <a class="delete" href="javascript:;" title="Remove row">X</a>
          </div>
        </td>
        <td class="description">
          <textarea id="dateDisplay2"></textarea>
          <input type="date" class="checkin" name="checkin" oninput="calculateDifference();setTitle(2);" required pattern="\\d{4}-\\d{2}-\\d{2}" />
          <input type="date" class="checkout" name="checkout" oninput="calculateDifference();setTitle(2);" required pattern="\\d{4}-\\d{2}-\\d{2}" />
          <span class="delete-date" title="Clear date">X</span>
        </td>
        <td><textarea class="cost">250000</textarea></td>
        <td><textarea class="qty"></textarea></td>
        <td><span class="price">250000</span></td>
      </tr>
    `;
  }

  // Add event listener to the "Add a row" button.
  addRowLink.addEventListener('click', () => {
    // Create a new row element from the HTML string.
    const tempContainer = document.createElement('tbody');
    tempContainer.innerHTML = createNewRow().trim();
    const newRow = tempContainer.firstChild;

    // Insert the new row before the row with id "hiderow"
    const hiderow = document.getElementById('hiderow');
    hiderow.parentNode.insertBefore(newRow, hiderow);

    // Bind the delete event to the new row.
    newRow.querySelector('.delete').addEventListener('click', function() {
      this.closest('tr').remove();
      updateTotals();
      updateOrderNumbers();
    });

    updateTotals();
    updateOrderNumbers();
  });

  // Calculate the difference between check-in and check-out dates and update totals.
  function calculateDifference() {
    const rows = document.querySelectorAll('.item-row');
    rows.forEach((row) => {
      const checkinInput = row.querySelector('.checkin');
      const checkoutInput = row.querySelector('.checkout');
      const qtyTextarea = row.querySelector('.qty');

      if (checkinInput && checkoutInput && checkinInput.value && checkoutInput.value) {
        const checkinDate = new Date(checkinInput.value);
        const checkoutDate = new Date(checkoutInput.value);
        const timeDifference = checkoutDate - checkinDate;
        const dayDifference = timeDifference / (1000 * 3600 * 24);
        qtyTextarea.value = dayDifference > 0 ? dayDifference : 0;
      }
    });
    updateTotals();
  }

  // Update the subtotal, total, and balance due.
  function updateTotals() {
    let subtotal = 0;
    const rows = document.querySelectorAll('.item-row');

    rows.forEach(row => {
      const cost = parseFloat(row.querySelector('.cost').value);
      const qty = parseFloat(row.querySelector('.qty').value);
      const price = cost * (isNaN(qty) ? 0 : qty);
      row.querySelector('.price').textContent = price.toFixed(2);
      subtotal += price;
    });

    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('total').textContent = subtotal.toFixed(2);

    const paid = parseFloat(document.getElementById('paid').value);
    const balanceDue = subtotal - (isNaN(paid) ? 0 : paid);
    document.querySelector('.due').textContent = balanceDue.toFixed(2);
  }

  // Bind delete events for existing rows.
  document.querySelectorAll('.delete').forEach(button => {
    button.addEventListener('click', function() {
      this.closest('tr').remove();
      updateTotals();
      updateOrderNumbers();
    });
  });

  // Bind event listener for the "Amount Paid" input.
  document.getElementById('paid').addEventListener('input', updateTotals);

  // (Assumes that functions such as setTitle() exist elsewhere in your code.)
});
