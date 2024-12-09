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

// Listen for new orders
database.ref('orders').on('child_added', function(snapshot) {
    const order = snapshot.val();
    const orderKey = snapshot.key;
    
    if (order.status !== 'archived') {
        displayOrder(order, orderKey);
        playNotificationSound();
    }
});

function playNotificationSound() {
    try {
        audio.play().catch(error => console.log('Error playing sound:', error));
    } catch (error) {
        console.log('Error with audio:', error);
    }
}

// Display order in the orders container
function displayOrder(order, orderKey) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'order-card';
    orderDiv.id = `order-${orderKey}`;
    
    const itemsList = order.items.map(item => 
        `<li>${item.item} - $${item.price.toFixed(2)}</li>`
    ).join('');
    
    orderDiv.innerHTML = `
        <div class="order-header">
            <input type="checkbox" class="order-checkbox" data-order-key="${orderKey}">
            <div class="order-info">
                <h3>Order #${orderKey.slice(-4)}</h3>
                <span class="table-number">Table #${order.tableId}</span>
                <span class="order-time">${order.orderDate} ${order.orderTime}</span>
                <span class="order-status">Status: ${order.status}</span>
            </div>
        </div>
        <div class="order-items">
            <ul>${itemsList}</ul>
        </div>
        <div class="order-total">
            <strong>Total: $${order.total.toFixed(2)}</strong>
        </div>
        <div class="order-actions">
            <select onchange="updateOrderStatus('${orderKey}', this.value)" class="status-select">
                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                <option value="ready" ${order.status === 'ready' ? 'selected' : ''}>Ready</option>
                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
            </select>
            <button onclick="archiveOrder('${orderKey}')" class="archive-btn">Archive Order</button>
            <button onclick="deleteOrder('${orderKey}')" class="delete-btn">Delete Order</button>
        </div>
    `;
    
    document.getElementById('orders-container').prepend(orderDiv);
}

// Update order status
function updateOrderStatus(orderKey, newStatus) {
    database.ref(`orders/${orderKey}`).update({
        status: newStatus
    }).then(() => {
        console.log(`Order ${orderKey} status updated to ${newStatus}`);
    }).catch(error => {
        console.error('Error updating order status:', error);
        alert('Error updating order status');
    });
}

// Select all orders
function selectAllOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const selectAllCheckbox = document.getElementById('select-all-orders');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
}

// Archive selected orders
function archiveSelectedOrders() {
    const selectedOrders = document.querySelectorAll('.order-checkbox:checked');
    if (selectedOrders.length === 0) {
        alert('Please select orders to archive');
        return;
    }

    if (confirm(`Archive ${selectedOrders.length} selected orders?`)) {
        selectedOrders.forEach(checkbox => {
            const orderKey = checkbox.getAttribute('data-order-key');
            archiveOrder(orderKey, false);
        });
        alert('Selected orders archived successfully');
    }
}

// Delete selected orders
function deleteSelectedOrders() {
    const selectedOrders = document.querySelectorAll('.order-checkbox:checked');
    if (selectedOrders.length === 0) {
        alert('Please select orders to delete');
        return;
    }

    if (confirm(`Delete ${selectedOrders.length} selected orders? This cannot be undone!`)) {
        selectedOrders.forEach(checkbox => {
            const orderKey = checkbox.getAttribute('data-order-key');
            deleteOrder(orderKey, false);
        });
        alert('Selected orders deleted successfully');
    }
}

// Archive order
function archiveOrder(orderKey, showConfirmation = true) {
    if (showConfirmation && !confirm('Archive this order? It will be moved to historical orders.')) {
        return;
    }

    database.ref(`orders/${orderKey}`).once('value')
        .then((snapshot) => {
            const order = snapshot.val();
            if (!order) return;

            // Move to archived orders with date organization
            return database.ref(`archivedOrders/${order.orderDate}/${orderKey}`).set({
                ...order,
                status: 'archived',
                archivedAt: firebase.database.ServerValue.TIMESTAMP
            }).then(() => {
                return database.ref(`orders/${orderKey}`).remove();
            });
        })
        .then(() => {
            const orderElement = document.getElementById(`order-${orderKey}`);
            if (orderElement) {
                orderElement.remove();
            }
            if (showConfirmation) {
                alert('Order archived successfully');
            }
        })
        .catch(error => {
            console.error('Error archiving order:', error);
            if (showConfirmation) {
                alert('Error archiving order');
            }
        });
}

// Delete order
function deleteOrder(orderKey, showConfirmation = true) {
    if (showConfirmation && !confirm('Are you sure you want to delete this order? This action cannot be undone!')) {
        return;
    }

    database.ref(`orders/${orderKey}`).remove()
        .then(() => {
            const orderElement = document.getElementById(`order-${orderKey}`);
            if (orderElement) {
                orderElement.remove();
            }
            if (showConfirmation) {
                alert('Order deleted successfully');
            }
        })
        .catch(error => {
            console.error('Error deleting order:', error);
            if (showConfirmation) {
                alert('Error deleting order');
            }
        });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Load any existing orders
    database.ref('orders').once('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            const order = childSnapshot.val();
            if (order.status !== 'archived') {
                displayOrder(order, childSnapshot.key);
            }
        });
    });
});
