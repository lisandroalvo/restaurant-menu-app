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

// Function to update the order status from the dashboard
function updateOrderStatus(orderKey, newStatus) {
    console.log(`Updating order ${orderKey} to status ${newStatus}`); // Debugging line
    database.ref('orders/' + orderKey).update({ status: newStatus });
}

// Variable to track the number of orders for notification purposes
let lastSnapshotSize = 0;

// Function to play notification sound for new orders
function playNotificationSound() {
    var audio = new Audio('notification-sound.mp3');  // Ensure the file is in the same directory
    audio.play();
}

// Listen for new orders and play notification if there are new ones
database.ref('orders').on('value', function(snapshot) {
    const ordersList = document.getElementById('orders');
    ordersList.innerHTML = ''; // Clear the current list of orders before adding new ones

    console.log("Snapshot received with " + snapshot.numChildren() + " orders.");

    if (snapshot.numChildren() > lastSnapshotSize) {
        console.log("New order detected");
        playNotificationSound();  // Play sound if a new order is detected
    }

    // Update the last snapshot size
    lastSnapshotSize = snapshot.numChildren();

    snapshot.forEach(function(orderSnapshot) {
        var order = orderSnapshot.val();
        var orderKey = orderSnapshot.key;

        // Check if the 'order' field exists and is an array before calling .map()
        let itemsList = order.order && Array.isArray(order.order) ? order.order.map(i => i.item).join(', ') : 'No items available';

        // Create the list item for the order
        var li = document.createElement('li');
        li.innerHTML = `
            <strong>Order at ${order.timestamp}</strong>: ${itemsList} - Total: $${order.total}
            <br>
            <select onchange="updateOrderStatus('${orderKey}', this.value)">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Completed</option>
            </select>
        `;

        ordersList.appendChild(li);
    });
});

// Function to handle bill requests ---------------------------------------------------

// Listen for bill requests in real-time
database.ref('/billRequests').on('value', (snapshot) => {
    const billRequests = snapshot.val();
    displayRequests(billRequests); // Function to show the requests on the dashboard
});

function displayRequests(requests) {
    const requestsList = document.getElementById('bill-requests'); // A new HTML section for bill requests
    requestsList.innerHTML = '';  // Clear existing requests

    // Display a notification or a popup for each requested table
    for (const table in requests) {
        if (requests[table].status === 'requesting') {
            // Create an item to display the bill request
            let listItem = document.createElement('li');
            listItem.innerHTML = `
                Table ${table} has requested the bill. 
                <button onclick="viewBillDetails('${table}')">View Bill</button>
            `;
            requestsList.appendChild(listItem);
        }
    }
}

// Function to view the bill details
function viewBillDetails(tableId) {
    // Retrieve all orders for the given tableId
    firebase.database().ref(`/orders`).orderByChild('tableId').equalTo(tableId).once('value', function(snapshot) {
        if (snapshot.exists()) {
            let total = 0;
            let orderDetails = [];

            snapshot.forEach(function(orderSnapshot) {
                const order = orderSnapshot.val();
                orderDetails = orderDetails.concat(order.order); // Collect all items
                total += order.total; // Add up the total for all orders
            });

            // Show the bill details to the restaurant staff
            const billDetails = `
                <h3>Bill for Table ${tableId}</h3>
                Items: ${orderDetails.map(i => `${i.item} - $${i.price}`).join(', ')}
                <br>Total: $${total}
                <button onclick="sendFinalBill('${tableId}', ${total}, ${JSON.stringify(orderDetails)})">Send Bill to Client</button>
            `;
            document.getElementById('bill-details').innerHTML = billDetails;
        } else {
            alert('No orders found for this table.');
        }
    });
}

// Function to send the final bill to the client
function sendFinalBill(tableId, total, orderDetails) {
    // Send the bill to the client's app
    const bill = {
        items: orderDetails,
        total: total,
        date: new Date().toISOString(),
        status: 'sent'
    };

    // Save the bill in Firebase under the "bills" node
    firebase.database().ref(`/bills/${tableId}`).set(bill);
    
    // Update the bill request status to 'sent' to mark it as completed
    firebase.database().ref(`/billRequests/${tableId}`).update({ status: 'sent' });

    alert(`Bill sent to Table ${tableId}`);
}

// Utility function to calculate the total amount of the bill
function calculateTotal(orderDetails) {
    return orderDetails.reduce((total, item) => total + item.price, 0);
}

// Example function to show a popup (you can replace this with your own implementation)
function showPopup(message) {
    alert(message);
}
