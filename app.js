// Firebase Configuration
const firebaseConfig = {
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
const database = firebase.database();

// Global variables
let cart = [];
let total = 0;

// Get table ID
function getTableId() {
    return window.tableId || null;
}

// Add to cart function
function addToCart(item) {
    cart.push(item);
    total += item.price;
    updateCart();
}

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    
    if (cartItems) {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Place order function
function placeOrder() {
    const tableId = getTableId();
    
    if (!tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Show loading spinner
    showSpinner();

    const orderData = {
        tableId: tableId,
        items: cart,
        total: total,
        status: 'pending',
        timestamp: Date.now(),
        orderDate: new Date().toISOString().split('T')[0],
        orderTime: new Date().toLocaleTimeString()
    };

    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully:', ref.key);
            cart = [];
            total = 0;
            updateCart();
            hideSpinner();
            alert('Order placed successfully!');
            // Switch to orders tab
            openTab('orders');
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            hideSpinner();
            alert('Error placing order. Please try again.');
        });
}

// Request bill function
function requestBill(orderId) {
    const tableId = getTableId();
    
    if (!tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }

    showSpinner();

    // First check if the order is completed
    database.ref('orders').child(orderId).once('value')
        .then((snapshot) => {
            const order = snapshot.val();
            if (!order) {
                throw new Error('Order not found');
            }
            if (order.status !== 'completed') {
                throw new Error('Cannot request bill until order is completed');
            }

            const billRequest = {
                orderId: orderId,
                tableId: tableId,
                total: order.total,
                status: 'pending',
                timestamp: Date.now()
            };

            return database.ref('billRequests').push(billRequest);
        })
        .then(() => {
            hideSpinner();
            alert('Bill requested! Please wait for the staff.');
            // Update order status to billed
            return database.ref('orders').child(orderId).update({ status: 'billed' });
        })
        .catch((error) => {
            console.error('Error requesting bill:', error);
            hideSpinner();
            alert(error.message || 'Error requesting bill. Please try again.');
        });
}

// Helper functions for spinner
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

// When page loads or QR is scanned
window.onload = function() {
    // Get table ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('table');
    
    if (!id) {
        alert('No table ID provided! Please scan the QR code again.');
        return;
    }

    // Initialize table and display table number
    document.getElementById('table-number').textContent = id;
}
