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
    // First try from window object (set by menu.html)
    if (window.tableId) {
        return window.tableId;
    }
    
    // Fallback to URL parameter
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    
    if (table) {
        window.tableId = table; // Store for future use
        return table;
    }
    
    return null;
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

    const orderData = {
        tableId: tableId,
        items: cart,
        total: total,
        status: 'pending',
        timestamp: Date.now(),
        orderDate: new Date().toISOString().split('T')[0],
        orderTime: new Date().toLocaleTimeString()
    };

    console.log('Sending order for table:', tableId);

    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully:', ref.key);
            cart = [];
            total = 0;
            updateCart();
            alert('Order placed successfully!');
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
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

// Request bill function
function requestBill() {
    const tableId = getTableId();
    
    if (!tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }

    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(tableId)
        .once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                alert('No orders found for this table!');
                return;
            }

            let totalAmount = 0;
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                totalAmount += order.total;
            });

            const billRequest = {
                tableId: tableId,
                total: totalAmount,
                status: 'pending',
                timestamp: Date.now()
            };

            return database.ref('billRequests').push(billRequest);
        })
        .then(() => {
            alert('Bill requested! Please wait for the staff.');
        })
        .catch((error) => {
            console.error('Error requesting bill:', error);
            alert('Error requesting bill. Please try again.');
        });
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
