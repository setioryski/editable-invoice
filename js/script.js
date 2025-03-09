document.addEventListener('DOMContentLoaded', () => {
	let standardRoomCount = 201;
	let deluxeRoomCount = 101;

	const roomTypeSelect = document.getElementById('roomType');
	const addRowLink = document.getElementById('addrow');

	addRowLink.addEventListener('click', () => {
		const roomType = roomTypeSelect.value;
		let orderRoom, price;

		switch (roomType) {
			case 'standard':
				orderRoom = standardRoomCount++;
				price = 250000;
				break;
			case 'standard_extra':
				orderRoom = standardRoomCount++;
				price = 300000;
				break;
			case 'deluxe':
				orderRoom = deluxeRoomCount++;
				price = 300000;
				break;
			case 'deluxe_extra':
				orderRoom = deluxeRoomCount++;
				price = 350000;
				break;
			default:
				return; // Do nothing if no valid room type is selected
		}

		// Create a new row with the selected room details
		const newRow = document.createElement('tr');
		newRow.classList.add('item-row');

		newRow.innerHTML = `
			<td class="item-name">
				<div class="delete-wpr">
					<textarea>Room ${orderRoom}</textarea>
					<a class="delete" href="javascript:;" title="Remove row">X</a>
				</div>
			</td>
			<td class="description">
				<textarea></textarea>
				<input type="date" class="checkin" name="checkin" oninput="calculateDifference();" required pattern="\\d{4}-\\d{2}-\\d{2}" />
				<input type="date" class="checkout" name="checkout" oninput="calculateDifference();" required pattern="\\d{4}-\\d{2}-\\d{2}" />
				<span class="delete-date" title="Clear date">X</span>
			</td>
			<td><textarea class="cost">${price}</textarea></td>
			<td><textarea class="qty"></textarea></td>
			<td><span class="price">${price}</span></td>
		`;

		// Insert the new row before the "Add a row" link
		const hiderow = document.getElementById('hiderow');
		hiderow.parentNode.insertBefore(newRow, hiderow);

		// Add event listener for the delete button
		newRow.querySelector('.delete').addEventListener('click', function() {
			this.closest('tr').remove();
			updateTotals();
		});

		// Reset counters if they exceed room limits
		if (standardRoomCount > 208) {
			standardRoomCount = 201;
		}
		if (deluxeRoomCount > 108) {
			deluxeRoomCount = 101;
		}

		updateTotals();
	});

	// Calculate the difference between check-in and check-out dates and update the totals
	function calculateDifference() {
		const rows = document.querySelectorAll('.item-row');
		rows.forEach((row, index) => {
			const checkinInput = row.querySelector('.checkin');
			const checkoutInput = row.querySelector('.checkout');
			const qtyTextarea = row.querySelector('.qty');

			if (checkinInput.value && checkoutInput.value) {
				const checkinDate = new Date(checkinInput.value);
				const checkoutDate = new Date(checkoutInput.value);
				const timeDifference = checkoutDate - checkinDate;
				const dayDifference = timeDifference / (1000 * 3600 * 24);

				qtyTextarea.value = dayDifference > 0 ? dayDifference : 0;
			}
		});

		updateTotals();
	}

	// Update the subtotal, total, and balance due
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

	// Add event listener to the existing delete buttons
	document.querySelectorAll('.delete').forEach(button => {
		button.addEventListener('click', function() {
			this.closest('tr').remove();
			updateTotals();
		});
	});

	// Add event listener to the amount paid input
	document.getElementById('paid').addEventListener('input', updateTotals);
});
