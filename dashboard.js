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

// Initialize audio
const audio = new Audio('notification.mp3');

// Switch tabs
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabId).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');
    
    if (tabId === 'order-history') {
        loadHistoryOrders();
    }
}

// Play notification
function playNotification() {
    audio.play().catch(error => {
        console.error('Error playing notification:', error);
    });
}

// Display active order
function displayActiveOrder(orderId, orderData) {
    if (orderData.isHistory) return; // Don't display history orders in active orders
    
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    orderElement.id = `order-${orderId}`;

    orderElement.innerHTML = `
        <div class="order-header">
            <input type="checkbox" class="order-select" data-order-id="${orderId}">
            <span class="table-number">Table ${orderData.tableId}</span>
            <span class="status-badge status-${orderData.status}">${orderData.status}</span>
        </div>
        <div class="order-items">
            ${orderData.items.map(item => `
                <div class="order-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>$${item.price.toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="order-total">Total: $${orderData.total.toFixed(2)}</div>
        <div class="order-actions">
            <button onclick="updateOrderStatus('${orderId}', 'preparing')">Preparing</button>
            <button onclick="updateOrderStatus('${orderId}', 'ready')">Ready</button>
            <button onclick="updateOrderStatus('${orderId}', 'delivered')">Delivered</button>
        </div>
    `;

    document.querySelector('#active-orders .orders-container').appendChild(orderElement);
}

// Display bill request
function displayBillRequest(requestId, requestData) {
    const billElement = document.createElement('div');
    billElement.className = 'bill-request-card';
    billElement.id = `bill-${requestId}`;

    billElement.innerHTML = `
        <div class="bill-header">
            <span class="table-number">Table ${requestData.tableId}</span>
            <span class="timestamp">${new Date(requestData.timestamp).toLocaleString()}</span>
        </div>
        <div class="bill-total">Total: $${requestData.total.toFixed(2)}</div>
        <div class="bill-actions">
            <button onclick="processBill('${requestId}')">Process Bill</button>
            <button onclick="moveToHistory('${requestId}')">Complete Order</button>
        </div>
    `;

    document.querySelector('#bill-requests .bill-requests-container').appendChild(billElement);
}

// Update order status
function updateOrderStatus(orderId, newStatus) {
    database.ref(`orders/${orderId}`).update({
        status: newStatus,
        lastUpdated: Date.now()
    }).then(() => {
        const statusBadge = document.querySelector(`#order-${orderId} .status-badge`);
        if (statusBadge) {
            statusBadge.className = `status-badge status-${newStatus}`;
            statusBadge.textContent = newStatus;
        }

        if (newStatus === 'delivered') {
            // Move to history after delivery
            moveToHistory(orderId);
        }
    }).catch(error => {
        console.error('Error updating status:', error);
        alert('Error updating order status');
    });
}

// Process bill
function processBill(requestId) {
    if (confirm('Process this bill?')) {
        database.ref(`billRequests/${requestId}`).update({
            status: 'processed',
            processedAt: Date.now()
        }).then(() => {
            // Move to history
            moveToHistory(requestId);
        }).catch(error => {
            console.error('Error processing bill:', error);
            alert('Error processing bill');
        });
    }
}

// Move to history
function moveToHistory(id) {
    // Get the order or bill request
    database.ref(`orders/${id}`).once('value')
        .then(snapshot => {
            const data = snapshot.val();
            if (data) {
                // Save to history
                return database.ref(`orderHistory/${id}`).set({
                    ...data,
                    completedAt: Date.now()
                }).then(() => {
                    // Remove from active orders
                    return database.ref(`orders/${id}`).remove();
                });
            }
        })
        .catch(error => {
            console.error('Error moving to history:', error);
            alert('Error completing order');
        });
}

// Move selected orders to history
function moveSelectedToHistory() {
    const selectedOrders = document.querySelectorAll('.order-select:checked');
    
    if (selectedOrders.length === 0) {
        alert('Please select orders to move to history');
        return;
    }

    const promises = Array.from(selectedOrders).map(checkbox => {
        const orderId = checkbox.getAttribute('data-order-id');
        const orderCard = document.getElementById(`order-${orderId}`);
        
        return database.ref(`orders/${orderId}`).update({
            status: 'completed',
            completedAt: Date.now(),
            isHistory: true
        }).then(() => {
            // Remove from active orders view
            if (orderCard) {
                orderCard.remove();
            }
        });
    });

    Promise.all(promises).then(() => {
        // Switch to history tab and refresh
        switchTab('order-history');
    }).catch(error => {
        console.error('Error moving orders to history:', error);
        alert('Error moving orders to history. Please try again.');
    });
}

// Load history orders
function loadHistoryOrders() {
    const historyContainer = document.querySelector('.history-container');
    const selectedDate = document.getElementById('history-date').value;
    
    // Clear existing content
    historyContainer.innerHTML = '';
    
    database.ref('orders')
        .orderByChild('completedAt')
        .once('value')
        .then(snapshot => {
            let ordersByDate = {};
            
            // Group orders by date
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                if (order.isHistory) {
                    const date = new Date(order.completedAt).toLocaleDateString();
                    if (!ordersByDate[date]) {
                        ordersByDate[date] = [];
                    }
                    ordersByDate[date].push({
                        id: childSnapshot.key,
                        ...order
                    });
                }
            });
            
            // Filter by selected date if any
            if (selectedDate) {
                const formattedDate = new Date(selectedDate).toLocaleDateString();
                if (ordersByDate[formattedDate]) {
                    const filteredOrders = {};
                    filteredOrders[formattedDate] = ordersByDate[formattedDate];
                    ordersByDate = filteredOrders;
                } else {
                    historyContainer.innerHTML = '<p>No orders found for selected date</p>';
                    return;
                }
            }
            
            // If no orders found
            if (Object.keys(ordersByDate).length === 0) {
                historyContainer.innerHTML = '<p>No history orders found</p>';
                return;
            }
            
            // Create date groups
            Object.entries(ordersByDate)
                .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                .forEach(([date, orders]) => {
                    const dateGroup = document.createElement('div');
                    dateGroup.className = 'history-date-group';
                    
                    dateGroup.innerHTML = `
                        <div class="history-date-header">${date}</div>
                        <div class="history-orders">
                            ${orders.map(order => `
                                <div class="order-card">
                                    <div class="order-header">
                                        <span class="order-id">Order #${order.id.slice(-4)}</span>
                                        <span class="table-number">Table ${order.tableId}</span>
                                        <span class="status-badge status-completed">Completed</span>
                                    </div>
                                    <div class="order-items">
                                        ${order.items.map(item => `
                                            <div class="order-item">
                                                <span>${item.quantity}x ${item.name}</span>
                                                <span>$${item.price.toFixed(2)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                    <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                                    <div class="order-time">
                                        Ordered: ${new Date(order.orderTime).toLocaleString()}<br>
                                        Completed: ${new Date(order.completedAt).toLocaleString()}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                    
                    historyContainer.appendChild(dateGroup);
                });
        })
        .catch(error => {
            console.error('Error loading history:', error);
            historyContainer.innerHTML = '<p>Error loading history orders</p>';
        });
}

// Filter history by date
function filterHistoryByDate(date) {
    loadHistoryOrders();
}

// Initialize listeners
function initializeListeners() {
    // Listen for new orders
    database.ref('orders').on('child_added', snapshot => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        if (orderData.status !== 'completed') {
            displayActiveOrder(orderId, orderData);
            playNotification();
        }
    });

    // Listen for order updates
    database.ref('orders').on('child_changed', snapshot => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        const orderElement = document.getElementById(`order-${orderId}`);
        if (orderElement) {
            orderElement.remove();
            if (orderData.status !== 'completed') {
                displayActiveOrder(orderId, orderData);
            }
        }
    });

    // Listen for bill requests
    database.ref('billRequests').on('child_added', snapshot => {
        const requestId = snapshot.key;
        const requestData = snapshot.val();
        if (requestData.status === 'pending') {
            displayBillRequest(requestId, requestData);
            playNotification();
        }
    });

    // Listen for history updates
    database.ref('orderHistory').on('child_added', snapshot => {
        const historyId = snapshot.key;
        const historyData = snapshot.val();
        displayHistoryItem(historyId, historyData);
    });
    
    // Set default date filter to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('history-date').value = today;
    
    // Load initial data
    if (document.querySelector('.tab-content.active').id === 'order-history') {
        loadHistoryOrders();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeListeners();
});
