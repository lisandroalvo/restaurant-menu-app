// Firebase Configuration
const firebaseConfig = {
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

// Global variables
let cart = [];
let total = 0;

// Get table ID
function getTableId() {
    return window.tableId || null;
}

// Add to cart function
function addToCart(item) {
    cart.push(item);
    total += item.price;
    updateCart();
    showNotification('Item added to cart');
    updateCartCounter();
}

// Update cart display
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    
    if (cartItems) {
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
            </div>
        `).join('');
    }
    
    if (totalElement) {
        totalElement.textContent = total.toFixed(2);
    }
}

// Place order function
function placeOrder() {
    const tableId = getTableId();
    
    if (!tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }
    
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    showSpinner();

    const orderData = {
        tableId: tableId,
        items: cart,
        total: total,
        status: 'pending',
        timestamp: Date.now(),
        orderDate: new Date().toISOString().split('T')[0],
        orderTime: new Date().toLocaleTimeString()
    };

    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully:', ref.key);
            cart = [];
            total = 0;
            updateCart();
            hideSpinner();
            showNotification('Order placed successfully!');
            openTab('orders');
            updateCartCounter();
            loadOrders(); // Reload orders after placing new order
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            hideSpinner();
            alert('Error placing order. Please try again.');
        });
}

// Request bill function
function requestBill() {
    const tableId = getTableId();
    
    if (!tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }

    showSpinner();

    // Get all completed orders for this table
    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(tableId)
        .once('value')
        .then((snapshot) => {
            let completedOrders = [];
            let totalBill = 0;

            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                if (order.status === 'completed') {
                    completedOrders.push({
                        orderId: childSnapshot.key,
                        ...order
                    });
                    totalBill += order.total;
                }
            });

            if (completedOrders.length === 0) {
                throw new Error('No completed orders to bill');
            }

            const billRequest = {
                tableId: tableId,
                orders: completedOrders,
                total: totalBill,
                status: 'pending',
                timestamp: Date.now()
            };

            return database.ref('billRequests').push(billRequest);
        })
        .then(() => {
            hideSpinner();
            showNotification('Bill requested! Please wait for the staff.');
            // Update all completed orders to billed status
            return Promise.all(completedOrders.map(order => 
                database.ref('orders').child(order.orderId).update({ status: 'billed' })
            ));
        })
        .catch((error) => {
            console.error('Error requesting bill:', error);
            hideSpinner();
            alert(error.message || 'Error requesting bill. Please try again.');
        });
}

// Update cart counter
function updateCartCounter() {
    const counter = document.getElementById('cart-counter');
    if (!counter) return;

    const cartItemCount = cart.length;
    counter.textContent = cartItemCount;
    counter.style.display = cartItemCount > 0 ? 'flex' : 'none';
}

// Show notification
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Helper functions for spinner
function showSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'flex';
}

function hideSpinner() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'none';
}

// Load orders function
function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    const requestBillBtn = document.querySelector('.request-bill');
    if (!window.tableId || !ordersContainer) return;

    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(window.tableId)
        .on('value', function(snapshot) {
            ordersContainer.innerHTML = '';
            let hasCompletedOrders = false;
            
            if (!snapshot.exists()) {
                ordersContainer.innerHTML = '<div class="no-orders">No orders found</div>';
                if (requestBillBtn) requestBillBtn.disabled = true;
                return;
            }

            snapshot.forEach(function(childSnapshot) {
                const order = childSnapshot.val();
                const orderElement = document.createElement('div');
                orderElement.className = 'order-card';
                
                if (order.status === 'completed') {
                    hasCompletedOrders = true;
                }

                const items = order.items.map(item => 
                    `<div class="order-item">
                        <span>${item.name}</span>
                        <span>$${item.price.toFixed(2)}</span>
                    </div>`
                ).join('');

                const statusClass = `status-${order.status}`;
                orderElement.innerHTML = `
                    <div class="order-header">
                        <span class="order-id">Order #${childSnapshot.key.slice(-4)}</span>
                        <span class="order-status ${statusClass}">${order.status}</span>
                    </div>
                    <div class="order-progress">
                        <div class="progress-bar" style="width: ${getProgressWidth(order.status)}"></div>
                    </div>
                    <div class="order-items">${items}</div>
                    <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                    <div class="order-time">Ordered at: ${order.orderTime}</div>
                `;
                
                ordersContainer.appendChild(orderElement);
            });

            // Enable/disable request bill button based on completed orders
            if (requestBillBtn) {
                requestBillBtn.disabled = !hasCompletedOrders;
            }
        });
}

// Helper function to get progress bar width
function getProgressWidth(status) {
    switch(status) {
        case 'pending': return '25%';
        case 'preparing': return '50%';
        case 'completed': return '75%';
        case 'billed': return '100%';
        default: return '0%';
    }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table');
    
    if (table) {
        document.getElementById('table-number').textContent = table;
        window.tableId = table;
        console.log('Table ID set:', table);
        loadOrders();
    } else {
        console.error('No table ID in URL');
        alert('Error: No table ID found. Please scan the QR code again.');
    }
});

// Tab switching
function openTab(tabName) {
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    const tabButtons = document.getElementsByClassName('tab-button');
    for (let button of tabButtons) {
        button.classList.remove('active');
    }

    document.getElementById(tabName).classList.add('active');
    
    // Add active class to the clicked button
    event.currentTarget.classList.add('active');

    if (tabName === 'orders') {
        loadOrders();
    }
}

// Listen for order status changes
database.ref('orders').on('child_changed', function(snapshot) {
    const order = snapshot.val();
    if (order.tableId === getTableId()) {
        // Refresh orders display
        loadOrders();
        // Show notification for status change
        showNotification(`Order #${snapshot.key.slice(-4)} ${order.status}`);
    }
});

// When page loads or QR is scanned
window.onload = function() {
    // Get table ID from URL
    const params = new URLSearchParams(window.location.search);
    const id = params.get('table');
    
    if (!id) {
        alert('No table ID provided! Please scan the QR code again.');
        return;
    }

    // Initialize table and display table number
    document.getElementById('table-number').textContent = id;
}
