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

// Function to play notification sound
function playNotificationSound() {
    var audio = new Audio('notification.wav'); // Make sure the path is correct and matches the file name
    audio.play().catch(error => {
        console.error('Error playing audio:', error);
    });
}

// Function to listen for order updates on the client side
function listenForOrderUpdates() {
    database.ref('orders').on('child_changed', function(snapshot) {
        var updatedOrder = snapshot.val();
        console.log(`Order updated: ${updatedOrder.status}`); // Check if this logs in the console

        // Play the notification sound when the order status is updated
        playNotificationSound();
    });
}

// Ensure the user interacts with the page first to allow audio playback
document.getElementById('enable-sound').addEventListener('click', function() {
    listenForOrderUpdates();
    alert('Notifications are enabled!');
});


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

// Submit order to Firebase and start listening for updates
function submitOrder() {
    var newOrderRef = database.ref('orders').push();
    var orderKey = newOrderRef.key; // Get the unique key of the newly created order

    newOrderRef.set({
        order: cart,
        total: total,
        status: "pending",  // Initial status
        timestamp: new Date().toLocaleString()
    });

    alert('Order submitted!');
    
    // Start listening for updates to this specific order
    listenForOrderUpdates(orderKey);

    // Reset cart after submission
    cart = [];
    total = 0;
    updateCart();
}

// Function to listen for status updates on a specific order
function listenForOrderUpdates(orderKey) {
    console.log(`Listening for updates on order: ${orderKey}`);
    database.ref('orders/' + orderKey + '/status').on('value', function(snapshot) {
        console.log('Snapshot value:', snapshot.val());
        var newStatus = snapshot.val();
        if (newStatus) {
            alert(`Your order status has been updated: ${newStatus}`);
        }
    });
}

