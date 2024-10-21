// Initialize Firebase
var firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    databaseURL: "your-database-url",
    projectId: "your-project-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

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

// Start a session when the QR code is scanned
function startSession() {
    const sessionStart = Date.now();
    localStorage.setItem('sessionStart', sessionStart);
}

// Check if the session is valid (e.g., within 1 hour)
function isSessionValid() {
    const sessionStart = localStorage.getItem('sessionStart');
    const sessionDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - sessionStart < sessionDuration;
}

// Restaurant's coordinates (replace with actual coordinates)
const restaurantLat = 40.712776;
const restaurantLon = -74.005974;
const maxDistance = 0.05; // 50 meters in kilometers

// Calculate distance between two points using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the Earth in kilometers
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c; // Distance in kilometers
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Check if the user is within the restaurant's proximity
function checkProximity(userLat, userLon) {
    var distance = calculateDistance(userLat, userLon, restaurantLat, restaurantLon);
    return distance <= maxDistance;
}

// Track user's location periodically to enforce proximity checks
function trackUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            if (!checkProximity(userLat, userLon)) {
                alert("You have left the restaurant area. You cannot place further orders.");
                document.getElementById('orderButton').disabled = true; // Disable the order button
            }
        }, function(error) {
            console.error("Error tracking location: ", error.message);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Call this function after scanning the QR code to start location tracking
function startLocationTracking() {
    trackUserLocation(); // Start tracking user location
}

// Corrected submitOrder function
function submitOrder() {
    if (isSessionValid()) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                if (checkProximity(userLat, userLon)) {
                    // Allow order placement
                    var newOrderRef = database.ref('orders').push();
                    var orderKey = newOrderRef.key;

                    newOrderRef.set({
                        order: cart,     // Send the current cart
                        total: total,    // Send the total amount
                        status: "pending",
                        timestamp: new Date().toLocaleString()
                    });

                    alert('Order submitted successfully!');
                    listenForOrderUpdates(orderKey); // Start listening for updates on this order

                    // Reset cart after submission
                    cart = [];
                    total = 0;
                    updateCart(); // Clear the cart display
                } else {
                    alert("You have left the restaurant area. You cannot place an order.");
                }
            }, function(error) {
                console.error("Error getting location: ", error.message);
                alert("Error retrieving your location. Please enable location services.");
            });
        } else {
            alert("Geolocation is not supported by this browser.");
        }
    } else {
        alert("Your session has expired. Please re-scan the QR code to continue ordering.");
    }
}

// Cart data
let cart = [];
let total = 0;

// Function to add an item to the cart
function addToCart(item, price) {
    cart.push({ item, price });
    total += price;
    updateCart(); // Update the cart display after adding an item
}

// Function to update the cart display in the DOM
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = ''; // Clear the current list

    // Add each item in the cart to the display
    cart.forEach(c => {
        let li = document.createElement('li');
        li.innerText = `${c.item} - $${c.price.toFixed(2)}`;
        cartItems.appendChild(li);
    });

    // Update the total price display
    document.getElementById('total-price').innerText = `Total: $${total.toFixed(2)}`;
}


// Listen for updates on a specific order
function listenForOrderUpdates(orderKey) {
    console.log(`Listening for updates on order: ${orderKey}`);
    database.ref('orders/' + orderKey + '/status').on('value', function(snapshot) {
        var newStatus = snapshot.val();
        if (newStatus) {
            alert(`Your order status has been updated: ${newStatus}`);
        }
    });
}

// Enable notifications when user clicks a button
document.getElementById('enable-sound').addEventListener('click', function() {
    alert('Notifications are enabled!');
    listenForOrderUpdates(); // Start listening for updates after button click
});
