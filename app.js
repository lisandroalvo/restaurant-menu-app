// Your Firebase configuration
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

// Set session expiration to 1 minute (60,000 milliseconds)
const SESSION_DURATION = 60 * 1000; // 1 minute

// Start the session and set a timer for expiration
function startSession() {
    const sessionStart = Date.now();
    localStorage.setItem('sessionStart', sessionStart);
    alert('QR code scanned! You have 1 minute to place your order.');

    // Set a timeout to expire session after 1 minute
    setTimeout(function () {
        alert('Your session has expired. Please re-scan the QR code to place an order.');
        document.getElementById('orderButton').disabled = true; // Disable order button
    }, SESSION_DURATION);
}

// Check if the session is valid
function isSessionValid() {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) return false;

    const currentTime = Date.now();
    return currentTime - sessionStart < SESSION_DURATION;
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
    document.getElementById('total-price').innerText = total;
}

// Submit order to Firebase only if session is valid
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

        alert('Order submitted!');
        listenForOrderUpdates(orderKey);

        cart = [];
        total = 0;
        updateCart();
    } else {
        alert("Your session has expired. Please re-scan the QR code to continue ordering.");
    }
}

// Function to listen for updates on a specific order
function listenForOrderUpdates(orderKey) {
    console.log(`Listening for updates on order: ${orderKey}`);
    database.ref('orders/' + orderKey + '/status').on('value', function(snapshot) {
        var newStatus = snapshot.val();
        if (newStatus) {
            alert(`Your order status has been updated: ${newStatus}`);
        }
    });
}

// When QR code is scanned, start the session and timer
function onQRCodeScanned() {
    startSession();
    document.getElementById('orderButton').disabled = false;  // Enable order button
}
