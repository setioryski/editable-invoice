/*
    =====================================================================================
    MODIFIED SCRIPT FOR DATABASE INTERACTION
    This script replaces the original local save/load functionality with API calls
    to a backend server.
    =====================================================================================
*/

// --- Helper Functions ---

function print_today() {
  // ***********************************************
  // AUTHOR: WWW.CGISCRIPT.NET, LLC
  // URL: http://www.cgiscript.net
  // Use the script, just leave this message intact.
  // Download your FREE CGI/Perl Scripts today!
  // ( http://www.cgiscript.net/scripts.htm )
  // ***********************************************
  var now = new Date();
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var date = ((now.getDate()<10) ? "0" : "")+ now.getDate();
  function fourdigits(number) {
    return (number < 1000) ? number + 1900 : number;
  }
  var today =  months[now.getMonth()] + " " + date + ", " + (fourdigits(now.getYear()));
  return today;
}

function roundNumber(number,decimals) {
  var newString;
  decimals = Number(decimals);
  if (decimals < 1) {
    newString = (Math.round(number)).toString();
  } else {
    var numString = number.toString();
    if (numString.lastIndexOf(".") == -1) { numString += "."; }
    var cutoff = numString.lastIndexOf(".") + decimals;
    var d1 = Number(numString.substring(cutoff,cutoff+1));
    var d2 = Number(numString.substring(cutoff+1,cutoff+2));
    if (d2 >= 5) {
      if (d1 == 9 && cutoff > 0) {
        while (cutoff > 0 && (d1 == 9 || isNaN(d1))) {
          if (d1 != ".") {
            cutoff -= 1;
            d1 = Number(numString.substring(cutoff,cutoff+1));
          } else {
            cutoff -= 1;
          }
        }
      }
      d1 += 1;
    }
    if (d1 == 10) {
      numString = numString.substring(0, numString.lastIndexOf("."));
      var roundedNum = Number(numString) + 1;
      newString = roundedNum.toString() + '.';
    } else {
      newString = numString.substring(0,cutoff) + d1.toString();
    }
  }
  if (newString.lastIndexOf(".") == -1) { newString += "."; }
  var decs = (newString.substring(newString.lastIndexOf(".")+1)).length;
  for(var i=0;i<decimals-decs;i++) newString += "0";
  return newString;
}

// --- Core Invoice Logic ---

function update_price() {
  var row = $(this).parents('.item-row');
  var cost = parseFloat(row.find('.cost').val().replace(/[^0-9.-]+/g,"")) || 0;
  var qty = parseFloat(row.find('.qty').val().replace(/[^0-9.-]+/g,"")) || 0;
  var price = cost * qty;
  price = roundNumber(price,2);
  isNaN(price) ? row.find('.price').html("N/A") : row.find('.price').html(price);
  
  update_total();
}

function update_total() {
  var total = 0;
  $('.price').each(function(i){
    var price = parseFloat($(this).html().replace(/[^0-9.-]+/g,"")) || 0;
    if (!isNaN(price)) total += price;
  });

  total = roundNumber(total,2);

  $('#subtotal').html(total);
  $('#total').html(total);
  
  update_balance();
}

function update_balance() {
  var total = parseFloat($("#total").html().replace(/[^0-9.-]+/g,"")) || 0;
  var paid = parseFloat($("#paid").val().replace(/[^0-9.-]+/g,"")) || 0;
  var due = total - paid;
  due = roundNumber(due,2);
  
  if (due < 0) {
      due = 0;
  }
  
  $('.due').html(due);
}

function updateOrderNumbers() {
  $('.item-row').each(function(index) {
    $(this).find('.order-number').text((index + 1) + '. ');
  });
}

function calculateDifference() {
    let rows = document.querySelectorAll(".item-row");
    rows.forEach((row) => {
        let checkinInput = row.querySelector(".checkin");
        let checkoutInput = row.querySelector(".checkout");
        if (checkinInput.value && checkoutInput.value) {
            let checkInDate = new Date(checkinInput.value);
            let checkOutDate = new Date(checkoutInput.value);
            if (checkOutDate > checkInDate) {
                let differenceInTime = checkOutDate.getTime() - checkInDate.getTime();
                let differenceInDays = Math.ceil(differenceInTime / (1000 * 3600 * 24));
                row.querySelector(".qty").value = differenceInDays;
                update_price.call(row.querySelector(".qty"));
            } else {
                row.querySelector(".qty").value = 0;
                update_price.call(row.querySelector(".qty"));
            }
        }
    });
}

function bind() {
  $(".cost").blur(update_price);
  $(".qty").blur(update_price);
  $(".checkin").blur(calculateDifference);
  $(".checkout").blur(calculateDifference);
}

// --- NEW: Database Interaction Functions ---

// Save invoice to the database
function saveInvoices() {
    var invoiceData = {
        title: document.getElementById('customer-title').value,
        address: document.getElementById('address').value,
        date: document.getElementById('date').value,
        items: [],
        subtotal: document.getElementById('subtotal').textContent,
        total: document.getElementById('total').textContent,
        amountPaid: document.getElementById('paid').value,
        balanceDue: document.querySelector('.due').textContent
    };

    document.querySelectorAll('.item-row').forEach(row => {
        var item = {
            order: row.querySelector('.item-name textarea').value,
            checkIn: row.querySelector('.checkin').value,
            checkOut: row.querySelector('.checkout').value,
            unitCost: row.querySelector('.cost').value,
            qty: row.querySelector('.qty').value,
            price: row.querySelector('.price').textContent
        };
        invoiceData.items.push(item);
    });

    // Send the data to the backend server
    fetch('http://localhost:3000/api/invoices', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
    })
    .then(response => response.json())
    .then(data => {
        alert(`${data.message}\nYour Invoice ID is: ${data.invoiceId}`);
        console.log('Saved Invoice ID:', data.invoiceId);
    })
    .catch((error) => {
        console.error('Error:', error);
        alert('Failed to save the invoice. Please make sure the backend server is running.');
    });
}

// Load invoice from the database
function loadInvoice() {
    const invoiceId = prompt("Please enter the Invoice ID to load:");
    if (!invoiceId) return;

    fetch(`http://localhost:3000/api/invoices/${invoiceId}`)
    .then(response => {
        if (!response.ok) {
            throw new Error('Invoice not found or server error.');
        }
        return response.json();
    })
    .then(invoiceData => {
        document.getElementById('customer-title').value = invoiceData.title;
        document.getElementById('address').value = invoiceData.address;
        document.getElementById('date').value = invoiceData.date;
        document.getElementById('subtotal').textContent = invoiceData.subtotal;
        document.getElementById('total').textContent = invoiceData.total;
        document.getElementById('paid').value = invoiceData.amountPaid;
        document.querySelector('.due').textContent = invoiceData.balanceDue;

        // Clear existing item rows before loading new ones
        $('.item-row').remove();

        const beforeRow = document.getElementById('hiderow');

        // Load and render each item row from the database
        invoiceData.items.forEach(item => {
            let newRow = createNewItemRow(item);
            $(beforeRow).before(newRow);
        });
        
        // Re-bind all events, and update totals and numbering
        bind();
        updateOrderNumbers();
        update_total();
        update_balance();
    })
    .catch(error => {
        console.error('Error:', error);
        alert(error.message);
    });
}

// Helper function to create a new row from loaded invoice data
function createNewItemRow(item) {
    const orderText = item.order || 'New Item';
    const checkIn = item.checkIn || '';
    const checkOut = item.checkOut || '';
    const unitCost = item.unitCost || '0';
    const qty = item.qty || '0';
    const price = item.price || '0';

    const rowHTML = `
      <tr class="item-row">
        <td class="item-name">
          <div class="delete-wpr">
            <span class="order-number"></span>
            <textarea>${orderText}</textarea>
            <a class="delete" href="javascript:;" title="Remove row">X</a>
          </div>
        </td>
        <td class="description">
          <input type="date" class="checkin" value="${checkIn}">
          <input type="date" class="checkout" value="${checkOut}">
        </td>
        <td><textarea class="cost">${unitCost}</textarea></td>
        <td><textarea class="qty">${qty}</textarea></td>
        <td><span class="price">${price}</span></td>
      </tr>
    `;
    return rowHTML;
}


// --- Page Initialization using jQuery ---

$(document).ready(function() {

  $('input, textarea').on('click', function(){
    $(this).select();
  });

  $("#paid").blur(update_balance);
   
  $("#addrow").click(function(){
    // Using the function to add a blank row
    const blankItem = { order: "New Item", checkIn: "", checkOut: "", unitCost: "0", qty: "1", price: "0" };
    // Use :last-of-type to be more specific
    $(".item-row:last-of-type").after(createNewItemRow(blankItem));
    if ($(".delete").length > 0) $(".delete").show();
    
    bind(); // Re-bind events for new row
    updateOrderNumbers();
  });
  
  bind();
  
  // Using .on() for delegated events is the modern and correct way
  $('#items').on('click', '.delete', function(){
    $(this).parents('.item-row').remove();
    update_total();
    updateOrderNumbers();
    if ($(".delete").length < 2) $(".delete").hide();
  });
  
  // Logo functionality
  $("#cancel-logo").click(function(){ $("#logo").removeClass('edit'); });
  $("#delete-logo").click(function(){ $("#logo").remove(); });
  $("#change-logo").click(function(){
    $("#logo").addClass('edit');
    $("#imageloc").val($("#image").attr('src'));
    $("#image").select();
  });
  $("#save-logo").click(function(){
    $("#image").attr('src', $("#imageloc").val());
    $("#logo").removeClass('edit');
  });
  
  // Set the date on load
  $("#date").val(print_today());
  
  // Initial calculation and numbering
  update_total();
  updateOrderNumbers();
});