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


// Function to start a session when the QR code is scanned
function startSession() {
    const sessionStart = Date.now();
    localStorage.setItem('sessionStart', sessionStart);
}

// Function to check if the session is valid (e.g., 1-hour limit)
function isSessionValid() {
    const sessionStart = localStorage.getItem('sessionStart');
    const sessionDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - sessionStart < sessionDuration;
}

// Function to submit the order, only if the session is valid
function submitOrder() {
    if (isSessionValid()) {
        // Allow order placement
        alert("Order placed successfully.");
        // Call Firebase order submission logic here
    } else {
        alert("Your session has expired. Please re-scan the QR code to continue ordering.");
    }
}

// Restaurant's coordinates (replace with the actual coordinates of the restaurant)
const restaurantLat = 40.712776; 
const restaurantLon = -74.005974; 
const maxDistance = 0.05; // 50 meters in kilometers

// Function to calculate the distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the Earth in kilometers
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var distance = R * c; // Distance in kilometers
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

// Function to check if the user is still within the restaurant's proximity
function checkProximity(userLat, userLon) {
    var distance = calculateDistance(userLat, userLon, restaurantLat, restaurantLon);
    return distance <= maxDistance;
}

// Function to track the user's location periodically
function trackUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function(position) {
            const userLat = position.coords.latitude;
            const userLon = position.coords.longitude;

            if (!checkProximity(userLat, userLon)) {
                alert("You have left the restaurant area. You cannot place further orders.");
                // Disable order button
                document.getElementById('orderButton').disabled = true;
            }
        }, function(error) {
            console.error("Error tracking location: ", error.message);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

// Call this function after scanning the QR code
function startLocationTracking() {
    trackUserLocation(); // Start tracking user location
}

function submitOrder() {
    if (isSessionValid()) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                if (checkProximity(userLat, userLon)) {
                    // Allow order placement
                    alert("Order placed successfully.");
                    // Call Firebase order submission logic here
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
