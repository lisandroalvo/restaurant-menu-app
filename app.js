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
    listenForOrderUpdates(orderKey);  // Start listening for order status updates

    // Notify restaurant that table has requested the order
    notifyRestaurant(tableId);
}

// Notify restaurant when table requests an order
function notifyRestaurant(tableId) {
    // Push a notification to the restaurant side in Firebase
    database.ref(`/billRequests/${tableId}`).set({
        table_id: tableId,
        status: 'order-requested'
    });
}

// Enable both order and request bill buttons
function enableOrderButton() {
    const orderButton = document.getElementById('orderButton');
    if (cart.length > 0) {
        orderButton.disabled = false;  // Enable the order button when cart has items
    } else {
        orderButton.disabled = true;  // Disable the order button when cart is empty
    }
}

// Disable both buttons after order is submitted or when cart is empty
function disableOrderButton() {
    const orderButton = document.getElementById('orderButton');
    orderButton.disabled = true;  // Disable the order button
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

// Always enable Request Bill button
document.getElementById('requestBillButton').disabled = false;

// Function to request bill from the restaurant
function requestBill(tableId, userId) {
    firebase.database().ref(`/billRequests/${tableId}`).set({
        user_id: userId,
        table_id: tableId,
        status: 'requesting'
    });
    alert('Bill requested successfully!');
}

// Event listener for Request Bill button
document.getElementById('requestBillButton').addEventListener('click', function() {
    const tableId = getTableId();  // Fetch table ID from the URL or elsewhere
    const userId = 'user_123';  // Example user ID (replace with real value)
    requestBill(tableId, userId);
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