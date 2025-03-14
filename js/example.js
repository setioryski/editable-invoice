function print_today() {
  // ***********************************************
  // AUTHOR: WWW.CGISCRIPT.NET, LLC
  // URL: http://www.cgiscript.net
  // Use the script, just leave this message intact.
  // Download your FREE CGI/Perl Scripts today!
  // ( http://www.cgiscript.net/scripts.htm )
  // ***********************************************
  var now = new Date();
  var months = new Array('January','February','March','April','May','June','July','August','September','October','November','December');
  var date = ((now.getDate()<10) ? "0" : "")+ now.getDate();
  function fourdigits(number) {
    return (number < 1000) ? number + 1900 : number;
  }
  var today =  date + " "+ months[now.getMonth()] +" "+ (fourdigits(now.getYear()));
  return today;
  
}

//tambahan save load*

// Save invoice function
function saveInvoices() {
  var customerName = document.getElementById('customer-title').value;
  var today = new Date();
  var dateString = today.getFullYear() + '_' + (today.getMonth() + 1) + '_' + today.getDate();

  var invoiceData = {
      title: customerName,
      address: document.getElementById('address').value,
      invoiceNumber: document.getElementById('meta').querySelector('textarea').value,
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

  const dataStr = JSON.stringify(invoiceData);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

  var fileName = customerName.replace(/ /g, '_') + '_' + dateString + '_invoice.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', fileName);
  linkElement.click();
}

// Load invoice function
function loadInvoice() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.onchange = e => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
              const invoiceData = JSON.parse(e.target.result);
              document.getElementById('customer-title').value = invoiceData.title;
              document.getElementById('address').value = invoiceData.address;
              document.getElementById('meta').querySelector('textarea').value = invoiceData.invoiceNumber;
              document.getElementById('date').value = invoiceData.date;
              document.getElementById('subtotal').textContent = invoiceData.subtotal;
              document.getElementById('total').textContent = invoiceData.total;
              document.getElementById('paid').value = invoiceData.amountPaid;
              document.querySelector('.due').textContent = invoiceData.balanceDue;

              // Clear existing rows
              document.querySelectorAll('.item-row').forEach(row => row.remove());

              // Get the reference to the row before which new rows should be inserted
              const beforeRow = document.getElementById('hiderow');

              // Load and render each item row
              invoiceData.items.forEach(item => {
                  let newRow = createNewItemRow(item);
                  beforeRow.parentNode.insertBefore(newRow, beforeRow); // Insert new row before the subtotal row
              });

              update_total();
              update_balance();
          };
          reader.readAsText(file);
      }
  };
  fileInput.click();
}



// Update description function
function updateDescription(descriptionCell) {
  const checkinInput = descriptionCell.querySelector('.checkin');
  const checkoutInput = descriptionCell.querySelector('.checkout');
  const descriptionTextarea = descriptionCell.querySelector('textarea');

  // Only update if both dates are present
  if (checkinInput.value && checkoutInput.value) {
    const formattedCheckin = formatDate(checkinInput.value);
    const formattedCheckout = formatDate(checkoutInput.value);
    // Put the date range into the description textarea
    descriptionTextarea.value = `${formattedCheckin} - ${formattedCheckout}`;
    // Also update nights, price, etc. by calling calculateDifference()
    calculateDifference();
  }
}


// Calculate difference function
function calculateDifference() {
  let rows = document.querySelectorAll(".item-row");
  rows.forEach((row) => {
    let checkInDate = new Date(row.querySelector(".checkin").value);
    let checkOutDate = new Date(row.querySelector(".checkout").value);
    let differenceInTime = checkOutDate.getTime() - checkInDate.getTime();
    let differenceInDays = differenceInTime / (1000 * 3600 * 24);
    row.querySelector(".qty").value = differenceInDays;
    update_price.call(row.querySelector(".qty"));
  });
}

// Format date function
function formatDate(dateString) {
  let date = new Date(dateString);
  let options = { year: 'numeric', month: 'long', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Update price function
function update_price() {
  let row = this.closest('.item-row');
  let qty = parseFloat(row.querySelector('.qty').value);
  let cost = parseFloat(row.querySelector('.cost').value);
  let price = qty * cost;
  row.querySelector('.price').textContent = price.toFixed(2);
  update_total();
  update_balance();
}

// Update total function
function update_total() {
  let total = 0.00;
  document.querySelectorAll('.item-row').forEach(row => {
    total += parseFloat(row.querySelector('.price').textContent);
  });
  document.getElementById('subtotal').textContent = total.toFixed(2);
  document.getElementById('total').textContent = total.toFixed(2);
}

// Update balance function
function update_balance() {
  let total = parseFloat(document.getElementById('total').textContent);
  let paid = parseFloat(document.getElementById('paid').value);
  let due = total - paid;
  document.querySelector('.due').textContent = due.toFixed(2);
}

// Bind events to row function
function bindEventsToRow(row) {
  row.querySelector('.cost').addEventListener('blur', update_price);
  row.querySelector('.qty').addEventListener('blur', update_price);
  row.querySelector('.delete').addEventListener('click', function() {
      row.remove();
      update_total();
      update_balance();
  });
}

// Bind initial events
$(document).ready(function() {
  // Number the existing rows when the page loads.
  updateOrderNumbers();

  $("#addrow").click(function() {
    $(".item-row:last").after(createNewRow());
    if ($(".delete").length > 0) $(".delete").show();
    updateOrderNumbers(); // Update numbering after adding a row.
    bind();
  });

  // Existing binding for delete events.
  $(".delete").live('click', function(){
    $(this).parents('.item-row').remove();
    update_total();
    update_balance();
    updateOrderNumbers(); // Update numbering after deleting a row.
    if ($(".delete").length < 2) $(".delete").hide();
  });
  
  bind();
});


function bind() {
  document.querySelectorAll('.cost').forEach(costInput => costInput.addEventListener('blur', update_price));
  document.querySelectorAll('.qty').forEach(qtyInput => qtyInput.addEventListener('blur', update_price));
  document.querySelectorAll('.delete').forEach(deleteLink => deleteLink.addEventListener('click', function() {
      this.closest('.item-row').remove();
      update_total();
      update_balance();
  }));
}


//create new row

let standardRoomCounter = 201;
let deluxeRoomCounter = 101;

function getRoomDetails(roomType) {
  let roomNumber, price, orderText;

  if (roomType === "standard") {
    roomNumber = standardRoomCounter++;
    price = 250000;
    orderText = `Room ${roomNumber}`;
  } else if (roomType === "standard_extrabed") {
    roomNumber = standardRoomCounter++;
    price = 300000;
    orderText = `Room ${roomNumber} + extrabed`;
  } else if (roomType === "deluxe") {
    roomNumber = deluxeRoomCounter++;
    price = 300000;
    orderText = `Room ${roomNumber}`;
  } else if (roomType === "deluxe_extrabed") {
    roomNumber = deluxeRoomCounter++;
    price = 350000;
    orderText = `Room ${roomNumber} + extrabed`;
  }

  return { orderText, price };
}

function createNewRow() {
  const rowCount = document.querySelectorAll('.item-row').length + 1;
  const roomType = document.getElementById('roomType').value;
  const { orderText, price } = getRoomDetails(roomType);

  return `
    <tr class="item-row">
      <td class="item-name">
        <div class="delete-wpr">
          <span class="order-number">${rowCount}.</span>
          <input type="text" class="room-name" value="${orderText}" />
          <a class="delete" href="javascript:;" title="Remove row">X</a>
        </div>
      </td>
      <td class="description">
        <!-- We make this textarea "readonly" so user sees the date range without editing it. -->
        <textarea readonly></textarea>

        <!-- 
          The key is to call updateDescription(this.parentNode) 
          so that your "description" cell is updated with the 
          formatted date range once both dates are chosen.
        -->
        <input type="date" class="checkin" oninput="updateDescription(this.parentNode);" required />
        <input type="date" class="checkout" oninput="updateDescription(this.parentNode);" required />
        <span class="delete-date" title="Clear date">X</span>
      </td>
      <td><textarea class="cost">${price}</textarea></td>
      <td><textarea class="qty"></textarea></td>
      <td><span class="price">${price}</span></td>
    </tr>
  `;
}



function updateOrderNumbers() {
  $('.item-row').each(function(index) {
    $(this).find('.order-number').text((index + 1) + '. ');
  });
}



// $(document).ready(function() {
//   $("#addrow").click(function() {
//     $(".item-row:last").after(createNewRow());
//     if ($(".delete").length > 0) $(".delete").show();
//     bind();
//   });

//   bind();
// });



//batas create new row

function clearDate() {
  const parent = $(this).parent(".description");
  const checkinValue = parent.find(".checkin").val();
  const checkoutValue = parent.find(".checkout").val();
  
  parent.empty().html(`<textarea>${checkinValue} - ${checkoutValue}</textarea>`);
}

function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: '2-digit' };
  const formattedDate = new Date(date).toLocaleDateString('en-US', options);
  const [month, dayWithComma, year] = formattedDate.split(/,? /);
  const day = dayWithComma.replace(',', '');
  return `${day} ${month} ${year}`;
}
function updateTitle() {
  const checkinInputs = document.querySelectorAll('.checkin');
  const checkoutInputs = document.querySelectorAll('.checkout');
  const customerName = document.getElementById('customer-title').value;

  if (customerName) {
    let firstValidTitle = false;

    for (let i = 0; i < checkinInputs.length; i++) {
      const checkin = checkinInputs[i].value;
      const checkout = checkoutInputs[i].value;

      if (checkin && checkout) {
        const formattedCheckin = formatDate(checkin);
        const formattedCheckout = formatDate(checkout);

        if (!firstValidTitle) {
          document.title = `${customerName}: ${formattedCheckin} - ${formattedCheckout}`; // Set the HTML title
          firstValidTitle = true;
        }
      }
    }

    if (!firstValidTitle) {
      document.title = `${customerName}: Invoice`;
    }
  } else {
    document.title = 'Invoice'; // Reset the HTML title if customer name is not complete
  }
}

function setTitle(row) {
  const checkin = document.querySelectorAll('.checkin')[row - 1].value;
  const checkout = document.querySelectorAll('.checkout')[row - 1].value;
  const customerName = document.getElementById('customer-title').value;
  const dateDisplay = document.getElementById(`dateDisplay${row}`);

  if (checkin && checkout && customerName) {
    const formattedCheckin = formatDate(checkin);
    const formattedCheckout = formatDate(checkout);
    dateDisplay.value = `${formattedCheckin} - ${formattedCheckout}`;
    document.title = `${customerName}: ${formattedCheckin} - ${formattedCheckout}`; // Set the HTML title
  } else {
    dateDisplay.value = '';
    updateTitle();
  }
}


//batas
// from http://www.mediacollege.com/internet/javascript/number/round.html
function roundNumber(number,decimals) {
  var newString;// The new rounded number
  decimals = Number(decimals);
  if (decimals < 1) {
    newString = (Math.round(number)).toString();
  } else {
    var numString = number.toString();
    if (numString.lastIndexOf(".") == -1) {// If there is no decimal point
      numString += ".";// give it one at the end
    }
    var cutoff = numString.lastIndexOf("") + decimals;// The point at which to truncate the number
    var d1 = Number(numString.substring(cutoff,cutoff+1));// The value of the last decimal place that we'll end up with
    var d2 = Number(numString.substring(cutoff+1,cutoff+2));// The next decimal, after the last one we want
    if (d2 >= 5) {// Do we need to round up at all? If not, the string will just be truncated
      if (d1 == 9 && cutoff > 0) {// If the last digit is 9, find a new cutoff point
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
  if (newString.lastIndexOf(".") == -1) {// Do this again, to the new string
    newString += ".";
  }
  var decs = (newString.substring(newString.lastIndexOf(".")+1)).length;
  for(var i=0;i<decimals-decs;i++) newString += "0";
  //var newNumber = Number(newString);// make it a number if you like
  return newString; // Output the result to the form field (change for your purposes)
}

function update_total() {
  var total = 0;
  $('.price').each(function(i){
    price = $(this).html().replace("","");
    if (!isNaN(price)) total += Number(price);
  });

  total = roundNumber(total,2);

  $('#subtotal').html(""+total);
  $('#total').html(""+total);

  // Set the value of the "Amount Paid" field to the total.
  //$('#paid').val(""+total);
  
  update_balance();
}

function update_balance() {
  var due = $("#total").html().replace("","") - $("#paid").val().replace("","");
  due = roundNumber(due,2);
  
  // If the due is less than zero (which means overpaid), set it to 0.
  if (due < 0) due = 0;
  
  $('.due').html(""+due);
}

function update_price() {
  var row = $(this).parents('.item-row');
  var price = row.find('.cost').val().replace("","") * row.find('.qty').val();
  price = roundNumber(price,2);
  isNaN(price) ? row.find('.price').html("N/A") : row.find('.price').html(""+price);
  
  update_total();
}

function bind() {
  $(".cost").blur(update_price);
  $(".qty").blur(update_price);
  $(".delete-date").click(clearDate);
}

$(document).ready(function() {

  $('input').click(function(){
    $(this).select();
  });

  $("#paid").blur(update_balance);
   
  $("#addrow").click(function() {
    $(".item-row:last").after(createNewRow());
    if ($(".delete").length > 0) $(".delete").show();
    updateOrderNumbers(); // This updates the sequential numbers.
    bind();
  });
  
  
  bind();
  
  $(".delete").live('click', function(){
    $(this).parents('.item-row').remove();
    update_total();
    update_balance();
    updateOrderNumbers(); // Re-number remaining rows.
    if ($(".delete").length < 2) $(".delete").hide();
  });
  
  
  $("#cancel-logo").click(function(){
    $("#logo").removeClass('edit');
  });
  $("#delete-logo").click(function(){
    $("#logo").remove();
  });
  $("#change-logo").click(function(){
    $("#logo").addClass('edit');
    $("#imageloc").val($("#image").attr('src'));
    $("#image").select();
  });
  $("#save-logo").click(function(){
    $("#image").attr('src',$("#imageloc").val());
    $("#logo").removeClass('edit');
  });
  
  $("#date").val(print_today());
  
});