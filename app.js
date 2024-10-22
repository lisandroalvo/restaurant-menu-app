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

// Extract tableId from the URL
function getTableId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('tableId') || 'unknown'; // Default to 'unknown' if tableId is not present
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
    cartItems.innerHTML = '';  // Clear previous cart display

    cart.forEach(c => {
        let li = document.createElement('li');
        li.innerText = `${c.item} - $${c.price}`;
        cartItems.appendChild(li);
    });

    document.getElementById('total-price').innerText = total.toFixed(2);
}

// Submit order to Firebase
function submitOrder() {
    var tableId = getTableId();  // Fetch tableId from URL
    var newOrderRef = database.ref('orders').push();
    var orderKey = newOrderRef.key;

    newOrderRef.set({
        order: cart,
        total: total,
        tableId: tableId, // Include tableId from URL in the order data
        status: "pending",
        timestamp: new Date().toLocaleString()
    });

    alert(`Order submitted successfully from Table ${tableId}!`);
    cart = [];
    total = 0;
    updateCart();

    listenForOrderUpdates(orderKey);  // Start listening for order status updates
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

// Enable notifications after user clicks the button
document.getElementById('enable-sound').addEventListener('click', function() {
    alert('Notifications are enabled!');
});

// Function to play notification sound when order status is updated
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
