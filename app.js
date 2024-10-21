// Initialize Firebase
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

// Function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the Earth in kilometers
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c; // Distance in kilometers
    return distance;
}

// Convert degrees to radians
function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Check if user is within 50 meters (0.05 km) of the restaurant
function checkProximity(userLat, userLon, callback) {
    var restaurantLat = 40.712776; // Replace with your restaurant's latitude
    var restaurantLon = -74.005974; // Replace with your restaurant's longitude
    var maxDistance = 0.05; // 50 meters in kilometers

    var distance = calculateDistance(userLat, userLon, restaurantLat, restaurantLon);

    if (distance <= maxDistance) {
        console.log("User is close enough to place an order.");
        callback(true); // Allow order placement
    } else {
        console.log("User is too far to place an order.");
        alert("You must be within 50 meters of the restaurant to place an order.");
        callback(false); // Block order placement
    }
}

// Get user's location using Geolocation API before placing the order
function requestLocationForOrder(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var userLatitude = position.coords.latitude;
            var userLongitude = position.coords.longitude;

            // Log the user's current location to the console
            console.log("User's location: ", userLatitude, userLongitude);
            alert(`Your current location: Latitude: ${userLatitude}, Longitude: ${userLongitude}`); // Display location for debugging

            checkProximity(userLatitude, userLongitude, callback);
        }, function(error) {
            console.error("Error getting location: ", error.message);
            alert("Error getting location: " + error.message); // Display error to the user
            callback(false); // Block order placement if location can't be retrieved
        });
    } else {
        alert("Geolocation is not supported by this browser.");
        callback(false); // Block order placement if geolocation is not supported
    }
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

// Submit order to Firebase only if user is within 50 meters
function submitOrder() {
    requestLocationForOrder(function(isAllowed) {
        if (isAllowed) {
            var newOrderRef = database.ref('orders').push();
            var orderKey = newOrderRef.key; // Get the unique key of the newly created order

            newOrderRef.set({
                order: cart,
                total: total,
                status: "pending",  // Initial status
                timestamp: new Date().toLocaleString()
            });

            alert('Order submitted!');
            listenForOrderUpdates(orderKey); // Start listening for updates to this specific order

            // Reset cart after submission
            cart = [];
            total = 0;
            updateCart();
        } else {
            alert("You cannot place an order from your current location.");
        }
    });
}

// Function to listen for status updates on a specific order
function listenForOrderUpdates(orderKey) {
    console.log(`Listening for updates on order: ${orderKey}`);
    database.ref('orders/' + orderKey + '/status').on('value', function(snapshot) {
        var newStatus = snapshot.val();
        if (newStatus) {
            alert(`Your order status has been updated: ${newStatus}`);
        }
    });
}

// Enable notifications after the user clicks the button once
document.getElementById('enable-sound').addEventListener('click', function() {
    alert('Notifications are enabled!');
    listenForOrderUpdates(); // Start listening for updates after button click
});
