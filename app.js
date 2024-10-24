// Firebase Configuration
var firebaseConfig = {
    apiKey: "AIzaSyD3hZhuy9c1TnpZV6rEpuJH8zJ6bIuaOTg",
    authDomain: "restaurant-x-7baa2.firebaseapp.com",
    databaseURL: "https://restaurant-x-7baa2-default-rtdb.firebaseio.com/",
    projectId: "restaurant-x-7baa2",
    storageBucket: "restaurant-x-7baa2.appspot.com",
    messagingSenderId: "33246350239",
    appId: "1:33246350239:web:2b4982f57a8fdee05c0b0a",
    measurementId: "G-9S7EBZ127P"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
var database = firebase.database();

// Cart data
let cart = [];
let total = 0;

// Add item to cart
function addToCart(item, price) {
    cart.push({ item, price });
    total += price;
    updateCart();
    enableOrderButton();  // Enable order button after adding an item to the cart
}

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';  // Clear previous cart display

    cart.forEach(c => {
        let li = document.createElement('li');
        li.innerText = `${c.item} - $${c.price}`;
        cartItems.appendChild(li);
    });

    document.getElementById('total-price').innerText = total.toFixed(2);
}

// Submit order to Firebase and notify restaurant
function submitOrder() {
    const tableId = getTableId(); // Get the tableId from the URL

    var newOrderRef = database.ref('orders').push();
    var orderKey = newOrderRef.key;

    // Save order details in Firebase
    newOrderRef.set({
        order: cart,
        total: total,
        tableId: tableId,
        status: "pending",
        timestamp: new Date().toLocaleString()
    });

    alert(`Order submitted from Table ${tableId}!`);
    cart = [];
    total = 0;
    updateCart();

    disableOrderButton();  // Disable the order button after submission
    enableRequestBillButton();  // Enable the request bill button after order submission
    listenForOrderUpdates(orderKey);  // Start listening for order status updates
}

// Enable order button if cart has items
function enableOrderButton() {
    const orderButton = document.getElementById('orderButton');
    if (cart.length > 0) {
        orderButton.disabled = false;
    }
}

// Disable order button
function disableOrderButton() {
    const orderButton = document.getElementById('orderButton');
    orderButton.disabled = true;
}

// Enable Request Bill button
function enableRequestBillButton() {
    const requestBillButton = document.getElementById('requestBillButton');
    requestBillButton.disabled = false;
}

// Disable Request Bill button
function disableRequestBillButton() {
    const requestBillButton = document.getElementById('requestBillButton');
    requestBillButton.disabled = true;
}

// Extract tableId from the URL
function getTableId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tableId') || 'unknown'; // Default to 'unknown' if tableId is not present
}

// Function to listen for updates on a specific order
function listenForOrderUpdates(orderKey) {
    database.ref('orders/' + orderKey + '/status').on('value', function(snapshot) {
        var newStatus = snapshot.val();
        if (newStatus) {
            alert(`Your order status has been updated: ${newStatus}`);
        }
    });
}

// Enable notifications after user clicks the button
document.getElementById('enable-sound').addEventListener('click', function() {
    alert('Notifications are enabled!');
});

// Play notification sound when order status is updated
function playNotificationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    fetch('notification-sound.mp3')
        .then(response => response.arrayBuffer())
        .then(buffer => audioContext.decodeAudioData(buffer))
        .then(decodedData => {
            const source = audioContext.createBufferSource();
            source.buffer = decodedData;
            source.connect(audioContext.destination);
            source.start(0);
        })
        .catch(error => {
            console.error('Error playing audio:', error);
        });
}

// Function to request bill from the restaurant
function requestBill() {
    const tableId = getTableId();  // Fetch table ID from the URL
    if (tableId !== 'unknown') {
        // Write the request to Firebase
        console.log(`Requesting bill for Table ${tableId}`);  // Debugging line
        firebase.database().ref(`/billRequests/${tableId}`).set({
            table_id: tableId,
            status: 'requesting'
        }, function(error) {
            if (error) {
                console.error('Error requesting bill:', error);
            } else {
                alert('Bill requested successfully!');
            }
        });
    } else {
        alert('Table ID is unknown. Cannot request the bill.');
    }
}

// Event listener for Request Bill button
document.getElementById('requestBillButton').addEventListener('click', function() {
    requestBill();
});

// Listen for bill updates from the restaurant and display it when it's sent
function listenForBillUpdates() {
    const tableId = getTableId();  // Ensure tableId is available
    if (tableId !== 'unknown') {
        firebase.database().ref(`/bills/${tableId}`).on('value', (snapshot) => {
            const bill = snapshot.val();
            if (bill && bill.status === 'sent') {
                displayBill(bill);  // Display bill in user app
            } else {
                console.log('No bill received yet.');
            }
        });
    }
}

// Display the bill to the user
function displayBill(bill) {
    const billDetails = `
        <h3>Your Bill</h3>
        <ul>
            ${bill.items.map(i => `<li>${i.item} - $${i.price}</li>`).join('')}
        </ul>
        <p><strong>Total:</strong> $${bill.total.toFixed(2)}</p>
    `;
    document.getElementById('bill-display').innerHTML = billDetails;  // Update bill display in the client app
    alert('Your bill has arrived!');
}

// Call the function to listen for bill updates when the page loads
document.addEventListener('DOMContentLoaded', function () {
    disableOrderButton();  // Disable the order button initially
    listenForBillUpdates();  // Start listening for bill updates
});
