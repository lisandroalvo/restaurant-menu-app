// Function to update the order status from the dashboard
function updateOrderStatus(orderKey, newStatus) {
    console.log(`Updating order ${orderKey} to status ${newStatus}`); // Debugging line
    database.ref('orders/' + orderKey).update({ status: newStatus });
}

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



// Listen for new orders and display them along with tableId
database.ref('orders').on('value', function(snapshot) {
    const ordersList = document.getElementById('orders');
    ordersList.innerHTML = ''; // Clear current list before adding new orders

    snapshot.forEach(function(orderSnapshot) {
        var orderData = orderSnapshot.val();
        var orderKey = orderSnapshot.key;

        // Create a list item to display the order details
        var li = document.createElement('li');
        li.innerHTML = `
            <strong>Order from Table ${orderData.tableId}</strong> <br>
            Items: ${orderData.order.map(item => item.item).join(', ')} <br>
            Total: $${orderData.total.toFixed(2)} <br>
            Status: ${orderData.status} <br>
            <button onclick="updateOrderStatus('${orderKey}', 'completed')">Mark as Completed</button>
        `;

        // Append the order to the list
        ordersList.appendChild(li);
    });
});

// Function to update the order status
function updateOrderStatus(orderKey, newStatus) {
    database.ref('orders/' + orderKey).update({ status: newStatus });
}

// Variable to track the number of orders
let lastSnapshotSize = 0;

// Function to play notification sound
function playNotificationSound() {
    var audio = new Audio('notification-sound.mp3');  // Ensure the file is in the same directory
    audio.play();
}

// Listen for new orders in real time
database.ref('orders').on('value', function(snapshot) {
    const ordersList = document.getElementById('orders');
    ordersList.innerHTML = ''; // Clear current list before adding new orders

    snapshot.forEach(function(orderSnapshot) {
        var orderData = orderSnapshot.val();
        var orderKey = orderSnapshot.key;

        // Create a list item to display the order details
        var li = document.createElement('li');
        li.innerHTML = `
            <strong>Order from Table ${orderData.tableId}</strong> <br>
            Items: ${orderData.order.map(item => item.item).join(', ')} <br>
            Total: $${orderData.total.toFixed(2)} <br>
            Status: ${orderData.status} <br>
            <button onclick="updateOrderStatus('${orderKey}', 'completed')">Mark as Completed</button>
        `;

        // Append the order to the list
        ordersList.appendChild(li);
    });
});
