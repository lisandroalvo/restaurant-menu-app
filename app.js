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

// Get the tableId from the URL query parameters
function getTableId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tableId') || 'unknown'; // Default to 'unknown' if no tableId is found
}

// Session expiration: Set to 10 minutes (600,000 milliseconds)
const SESSION_DURATION = 10 * 60 * 1000; // 10 minutes

// Start the session and set a timer for expiration
function startSession() {
    const sessionStart = Date.now();
    localStorage.setItem('sessionStart', sessionStart.toString());  // Store sessionStart as a string
    console.log("Session started at:", new Date(sessionStart).toLocaleTimeString());
    alert('QR code scanned! You have 10 minutes to place your order.');
    
    // Enable order button at session start
    document.getElementById('orderButton').disabled = false;
}

// Check if the session is valid
function isSessionValid() {
    const sessionStart = localStorage.getItem('sessionStart');
    if (!sessionStart) {
        console.log("No sessionStart found in localStorage.");
        return false;
    }

    const currentTime = Date.now();
    const sessionDuration = currentTime - parseInt(sessionStart); // Ensure the value is correctly parsed as an integer

    console.log("Session duration in milliseconds:", sessionDuration, "Session expires after:", SESSION_DURATION);
    console.log("Session duration in minutes:", sessionDuration / (60 * 1000));  // Log in minutes for easier debugging

    return sessionDuration < SESSION_DURATION; // Return whether the session is still valid
}

// Function to disable the order button once the session expires
function checkSessionExpiration() {
    if (!isSessionValid()) {
        alert('Your session has expired. Please re-scan the QR code to place an order.');
        document.getElementById('orderButton').disabled = true;  // Disable order button
        console.log("Session expired, disabling order button.");
    }
}

// Function to periodically check session validity
function startSessionExpirationCheck() {
    console.log("Starting session expiration checks.");
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
    document.getElementById('total-price').innerText = total;
}

// Submit order to Firebase only if session is valid
function submitOrder() {
    if (isSessionValid()) {
        const tableId = getTableId(); // Get the tableId from the URL
        var newOrderRef = database.ref('orders').push();
        var orderKey = newOrderRef.key;

        newOrderRef.set({
            order: cart,
            total: total,
            tableId: tableId,  // Include tableId in the order data
            status: "pending",
            timestamp: new Date().toLocaleString()
        });

        alert(`Order submitted from Table ${tableId}!`);
        listenForOrderUpdates(orderKey);

        cart = [];
        total = 0;
        updateCart();
    } else {
        alert("Your session has expired. Please re-scan the QR code to continue ordering.");
        document.getElementById('orderButton').disabled = true; // Disable order button
        console.log("Attempted to submit order but session had expired.");
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

// When QR code is scanned, start the session and session expiration check
function onQRCodeScanned() {
    startSession();  // Start session and enable order button
    startSessionExpirationCheck();  // Start checking if session has expired
}

// Play notification sound when order updates
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
