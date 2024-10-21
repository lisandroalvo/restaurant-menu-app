// Firebase Configuration
var firebaseConfig = {
    apiKey: "AIzaSyD3hZhuyc1TnpZV6rEpuJH8zJ6bIuaOTg",
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

// Session expiration time: 10 minutes
const SESSION_DURATION = 10 * 60 * 1000;

// Start the session when the QR code is scanned
function startSession() {
    const sessionStart = Date.now();
    localStorage.setItem('sessionStart', sessionStart);
    alert('QR code scanned! You have 10 minutes to place your order.');
    document.getElementById('orderButton').disabled = false; // Enable order button at session start
}

// Check if session is still valid
function isSessionValid() {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) return false;

    const currentTime = Date.now();
    return currentTime - sessionStart < SESSION_DURATION;
}

// Disable order button once session expires
function checkSessionExpiration() {
    if (!isSessionValid()) {
        alert('Your session has expired. Please re-scan the QR code to place an order.');
        document.getElementById('orderButton').disabled = true;  // Disable order button
    }
}

// Start periodic session expiration check
function startSessionExpirationCheck() {
    setInterval(checkSessionExpiration, 1000);  // Check every second
}

// Cart data
let cart = [];
let total = 0;

// Add item to cart
function addToCart(item, price) {
    cart.push({ item, price });
    total += price;
    updateCart();
}

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';
    cart.forEach(c => {
        let li = document.createElement('li');
        li.innerText = `${c.item} - $${c.price}`;
        cartItems.appendChild(li);
    });
    document.getElementById('total-price').innerText = total.toFixed(2);
}

// Submit order to Firebase, only if session is valid
function submitOrder() {
    if (isSessionValid()) {
        var newOrderRef = database.ref('orders').push();
        var orderKey = newOrderRef.key;

        newOrderRef.set({
            order: cart,
            total: total,
            status: "pending",
            timestamp: new Date().toLocaleString()
        });

        alert('Order submitted successfully!');
        cart = [];
        total = 0;
        updateCart();
    } else {
        alert('Your session has expired. Please re-scan the QR code to continue ordering.');
        document.getElementById('orderButton').disabled = true; // Disable order button
    }
}

// Enable notifications after user clicks the button
document.getElementById('enable-sound').addEventListener('click', function() {
    alert('Notifications are enabled!');
});

// When QR code is scanned, start the session and check for expiration
function onQRCodeScanned() {
    startSession();  // Start the session
    startSessionExpirationCheck();  // Start checking if session expired
}
