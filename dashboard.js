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
    
    // Load history orders when switching to history tab
    if (tabId === 'order-history') {
        console.log('Switching to history tab');
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
    if (orderData.isHistory || orderData.visible === false) return; // Don't display history or hidden orders
    
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    orderElement.id = `order-${orderId}`;

    orderElement.innerHTML = `
        <div class="order-header">
            <input type="checkbox" class="order-select" data-order-id="${orderId}" onchange="updateSelectAll()">
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
        <div class="order-time">Ordered: ${orderData.orderTime}</div>
        <div class="order-actions">
            <button onclick="updateOrderStatus('${orderId}', 'preparing')">Preparing</button>
            <button onclick="updateOrderStatus('${orderId}', 'ready')">Ready</button>
            <button onclick="updateOrderStatus('${orderId}', 'delivered')">Delivered</button>
        </div>
    `;

    const ordersContainer = document.querySelector('#active-orders .orders-container');
    ordersContainer.appendChild(orderElement);
    updateSelectAll();
}

// Display bill request
function displayBillRequest(requestId, requestData) {
    const billElement = document.createElement('div');
    billElement.className = 'bill-request-card';
    billElement.id = `bill-${requestId}`;

    // Add null check for total
    const total = requestData.total || 0;

    billElement.innerHTML = `
        <div class="bill-header">
            <span class="table-number">Table ${requestData.tableId}</span>
            <span class="timestamp">${new Date(requestData.timestamp).toLocaleString()}</span>
        </div>
        <div class="bill-total">Total: $${total.toFixed(2)}</div>
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
        status: newStatus
    }).catch(error => {
        console.error('Error updating order status:', error);
        alert('Error updating order status. Please try again.');
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
    console.log('Selected orders:', selectedOrders.length);
    
    if (selectedOrders.length === 0) {
        alert('Please select orders to move to history');
        return;
    }

    selectedOrders.forEach(checkbox => {
        const orderId = checkbox.getAttribute('data-order-id');
        console.log('Processing order:', orderId);

        // Get the reference to the order
        const orderRef = database.ref(`orders/${orderId}`);
        
        // First get the current order data
        orderRef.once('value')
            .then(snapshot => {
                const orderData = snapshot.val();
                console.log('Current order data:', orderData);

                // Update the order with completed status
                const updates = {
                    ...orderData,
                    status: 'completed',
                    completedAt: Date.now()
                };

                console.log('Updating order with:', updates);
                return orderRef.update(updates);
            })
            .then(() => {
                console.log('Order updated successfully:', orderId);
                // Remove from active orders view
                const orderCard = document.getElementById(`order-${orderId}`);
                if (orderCard) {
                    orderCard.remove();
                }
            })
            .catch(error => {
                console.error('Error moving order to history:', error);
            });
    });

    // Uncheck select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-orders');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }

    // Switch to history tab and load orders
    switchTab('order-history');
}

// Load history orders
function loadHistoryOrders() {
    console.log('Loading history orders...');
    const historyContainer = document.querySelector('.history-container');
    historyContainer.innerHTML = '<p>Loading history...</p>';

    // Get all completed orders
    database.ref('orders')
        .orderByChild('status')
        .equalTo('completed')
        .once('value')
        .then(snapshot => {
            console.log('Received history data:', snapshot.val());
            
            if (!snapshot.exists()) {
                historyContainer.innerHTML = '<p>No completed orders found</p>';
                return;
            }

            const orders = [];
            snapshot.forEach(childSnapshot => {
                orders.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });

            console.log('Processed orders:', orders);

            // Sort by completion time, newest first
            orders.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));

            // Clear container
            historyContainer.innerHTML = '';

            // Display each order
            orders.forEach(order => {
                const orderElement = document.createElement('div');
                orderElement.className = 'order-card history-order';
                
                // Add null checks for items and total
                const items = order.items || [];
                const total = order.total || 0;
                
                orderElement.innerHTML = `
                    <div class="order-header">
                        <span class="table-number">Table ${order.tableId}</span>
                        <span class="status-badge status-completed">Completed</span>
                    </div>
                    <div class="order-items">
                        ${items.map(item => {
                            const itemPrice = item.price || 0;
                            return `
                                <div class="order-item">
                                    <span>${item.quantity}x ${item.name}</span>
                                    <span>$${itemPrice.toFixed(2)}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="order-total">Total: $${total.toFixed(2)}</div>
                    <div class="order-time">
                        Ordered: ${order.orderTime || 'Unknown'}<br>
                        Completed: ${order.completedAt ? new Date(order.completedAt).toLocaleString() : 'Unknown'}
                    </div>
                `;
                
                historyContainer.appendChild(orderElement);
            });
        })
        .catch(error => {
            console.error('Error loading history:', error);
            historyContainer.innerHTML = '<p>Error loading history orders. Please try again.</p>';
        });
}

// Initialize listeners
function initializeListeners() {
    // Listen for new orders
    database.ref('orders').on('child_added', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        
        if (orderData.status !== 'completed') {
            displayActiveOrder(orderId, orderData);
        }
    });
    
    // Listen for order updates
    database.ref('orders').on('child_changed', (snapshot) => {
        const orderId = snapshot.key;
        const orderData = snapshot.val();
        const orderElement = document.getElementById(`order-${orderId}`);
        
        if (orderData.status === 'completed') {
            if (orderElement) {
                orderElement.remove();
            }
        } else if (orderElement) {
            // Update status badge
            const statusBadge = orderElement.querySelector('.status-badge');
            if (statusBadge) {
                statusBadge.className = `status-badge status-${orderData.status}`;
                statusBadge.textContent = orderData.status;
            }
        } else {
            displayActiveOrder(orderId, orderData);
        }
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    initializeListeners();
});

// Toggle select all orders
function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-orders');
    const orderCheckboxes = document.querySelectorAll('.order-select');
    
    orderCheckboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Update select all checkbox state
function updateSelectAll() {
    const selectAllCheckbox = document.getElementById('select-all-orders');
    const orderCheckboxes = document.querySelectorAll('.order-select');
    const checkedCheckboxes = document.querySelectorAll('.order-select:checked');
    
    if (orderCheckboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.disabled = true;
    } else {
        selectAllCheckbox.disabled = false;
        selectAllCheckbox.checked = orderCheckboxes.length === checkedCheckboxes.length;
    }
}
