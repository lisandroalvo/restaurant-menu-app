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
const database = firebase.database();

// Audio for notifications
const audio = new Audio('notification.mp3');

// Clear all orders function
function clearAllOrders() {
    if (confirm('Are you sure you want to clear all orders? This cannot be undone.')) {
        database.ref('orders').remove()
            .then(() => {
                console.log('All orders cleared successfully');
                document.getElementById('orders-container').innerHTML = '';
            })
            .catch((error) => {
                console.error('Error clearing orders:', error);
                alert('Error clearing orders. Please try again.');
            });
    }
}

// Display order with improved status
function displayOrder(orderId, orderData) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    orderElement.id = `order-${orderId}`;
    
    const statusClass = `status-${orderData.status.toLowerCase()}`;
    
    orderElement.innerHTML = `
        <div class="order-header">
            <h3>Table ${orderData.tableId}</h3>
            <span class="status-badge ${statusClass}">${orderData.status}</span>
        </div>
        <div class="order-items">
            ${orderData.items.map(item => `
                <div class="order-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>$${item.price.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-total">
            <strong>Total: $${orderData.total.toFixed(2)}</strong>
        </div>
        <div class="order-actions">
            <button onclick="updateStatus('${orderId}', 'preparing')">Preparing</button>
            <button onclick="updateStatus('${orderId}', 'ready')">Ready</button>
            <button onclick="updateStatus('${orderId}', 'delivered')">Delivered</button>
            <button onclick="deleteOrder('${orderId}')" class="delete-btn">Delete</button>
        </div>
    `;
    
    document.getElementById('orders-container').appendChild(orderElement);
}

// Update order status
function updateStatus(orderId, newStatus) {
    database.ref(`orders/${orderId}`).update({
        status: newStatus
    }).then(() => {
        const statusElement = document.querySelector(`#order-${orderId} .status-badge`);
        if (statusElement) {
            statusElement.className = `status-badge status-${newStatus.toLowerCase()}`;
            statusElement.textContent = newStatus;
        }
    }).catch(error => {
        console.error('Error updating status:', error);
        alert('Error updating order status');
    });
}

// Delete single order
function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        database.ref(`orders/${orderId}`).remove()
            .then(() => {
                const orderElement = document.getElementById(`order-${orderId}`);
                if (orderElement) {
                    orderElement.remove();
                }
            })
            .catch(error => {
                console.error('Error deleting order:', error);
                alert('Error deleting order');
            });
    }
}

// Initialize Firebase listeners
function initializeOrders() {
    const ordersRef = database.ref('orders');
    const billRequestsRef = database.ref('billRequests');
    
    // Listen for new orders
    ordersRef.on('child_added', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        displayOrder(orderId, orderData);
        
        // Play notification sound for new orders
        const audio = document.getElementById('notification-sound');
        if (audio) {
            audio.play().catch(e => console.log('Error playing sound:', e));
        }
    });
    
    // Listen for order updates
    ordersRef.on('child_changed', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        
        // Remove old order display and add updated one
        const oldOrder = document.getElementById(`order-${orderId}`);
        if (oldOrder) {
            oldOrder.remove();
        }
        displayOrder(orderId, orderData);
    });
    
    // Listen for order removals
    ordersRef.on('child_removed', (snapshot) => {
        const orderId = snapshot.key;
        const orderElement = document.getElementById(`order-${orderId}`);
        if (orderElement) {
            orderElement.remove();
        }
    });
    
    // Listen for bill requests
    billRequestsRef.on('child_added', (snapshot) => {
        const billRequest = snapshot.val();
        const requestId = snapshot.key;
        
        // Get all orders for this table
        database.ref('orders')
            .orderByChild('tableId')
            .equalTo(billRequest.tableId)
            .once('value')
            .then((ordersSnapshot) => {
                let totalAmount = 0;
                const orders = [];
                
                ordersSnapshot.forEach((orderSnapshot) => {
                    const order = orderSnapshot.val();
                    totalAmount += order.total;
                    orders.push(order);
                });

                displayBillRequest(requestId, billRequest, orders, totalAmount);
                playNotificationSound();
            });
    });
}

// Display bill request
function displayBillRequest(requestId, request, orders, totalAmount) {
    const billElement = document.createElement('div');
    billElement.className = 'bill-request-card';
    billElement.id = `bill-${requestId}`;
    
    billElement.innerHTML = `
        <div class="bill-header">
            <h3>Bill Request - Table ${request.tableId}</h3>
            <span class="timestamp">${request.requestDate} ${request.requestTime}</span>
        </div>
        <div class="bill-details">
            <h4>Orders:</h4>
            ${orders.map(order => `
                <div class="bill-order">
                    ${order.items.map(item => `
                        <div class="bill-item">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>$${item.price.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
            <div class="bill-total">
                <strong>Total Amount: $${totalAmount.toFixed(2)}</strong>
            </div>
        </div>
        <div class="bill-actions">
            <button onclick="processBill('${requestId}', ${totalAmount})" class="process-bill-btn">Process Bill</button>
            <button onclick="deleteBillRequest('${requestId}')" class="delete-btn">Delete Request</button>
        </div>
    `;
    
    document.getElementById('bill-requests-container').appendChild(billElement);
}

// Process bill
function processBill(requestId, totalAmount) {
    if (confirm(`Process bill for $${totalAmount.toFixed(2)}?`)) {
        database.ref(`billRequests/${requestId}`).update({
            status: 'processed',
            processedAt: Date.now()
        }).then(() => {
            const billElement = document.getElementById(`bill-${requestId}`);
            if (billElement) {
                billElement.remove();
            }
            alert('Bill processed successfully!');
        }).catch(error => {
            console.error('Error processing bill:', error);
            alert('Error processing bill');
        });
    }
}

// Delete bill request
function deleteBillRequest(requestId) {
    if (confirm('Delete this bill request?')) {
        database.ref(`billRequests/${requestId}`).remove()
            .then(() => {
                const billElement = document.getElementById(`bill-${requestId}`);
                if (billElement) {
                    billElement.remove();
                }
            })
            .catch(error => {
                console.error('Error deleting bill request:', error);
                alert('Error deleting bill request');
            });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load any existing orders
    database.ref('orders').once('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const orderId = childSnapshot.key;
            const orderData = childSnapshot.val();
            displayOrder(orderId, orderData);
        });
    });
    initializeOrders();
});
