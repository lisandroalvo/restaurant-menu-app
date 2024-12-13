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

let selectedOrders = new Set();

function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    const historyContainer = document.getElementById('history-container');
    
    if (!ordersContainer || !historyContainer) return;

    database.ref('orders').on('value', function(snapshot) {
        ordersContainer.innerHTML = '';
        historyContainer.innerHTML = '';
        selectedOrders.clear();
        
        if (!snapshot.exists()) {
            ordersContainer.innerHTML = '<p>No orders</p>';
            historyContainer.innerHTML = '<p>No orders in history</p>';
            return;
        }

        const activeOrders = [];
        const historyOrders = [];

        snapshot.forEach(childSnapshot => {
            const order = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            
            if (order.status === 'completed') {
                historyOrders.push(order);
            } else {
                activeOrders.push(order);
            }
        });

        // Sort orders by timestamp, newest first
        activeOrders.sort((a, b) => b.timestamp - a.timestamp);
        historyOrders.sort((a, b) => b.timestamp - a.timestamp);

        // Display active orders
        if (activeOrders.length === 0) {
            ordersContainer.innerHTML = '<p>No active orders</p>';
        } else {
            activeOrders.forEach(order => {
                ordersContainer.appendChild(createOrderElement(order, false));
            });
        }

        // Display history orders
        if (historyOrders.length === 0) {
            historyContainer.innerHTML = '<p>No orders in history</p>';
        } else {
            historyOrders.forEach(order => {
                historyContainer.appendChild(createOrderElement(order, true));
            });
        }
    });
}

function createOrderElement(order, isHistory) {
    const orderElement = document.createElement('div');
    orderElement.className = 'order-card';
    orderElement.id = `order-${order.id}`;

    const items = order.items.map(item => `
        <div class="order-item">
            <span>${item.name}</span>
            <span>$${item.price.toFixed(2)}</span>
        </div>
    `).join('');

    const checkbox = isHistory ? '' : `
        <input type="checkbox" class="order-checkbox" data-order-id="${order.id}"
               onchange="toggleOrderSelection('${order.id}')">
    `;

    const statusButtons = isHistory ? '' : `
        <div class="status-buttons">
            <button onclick="updateOrderStatus('${order.id}', 'preparing')">Preparing</button>
            <button onclick="updateOrderStatus('${order.id}', 'ready')">Ready</button>
            <button onclick="updateOrderStatus('${order.id}', 'completed')">Complete</button>
        </div>
    `;

    orderElement.innerHTML = `
        <div class="order-header">
            ${checkbox}
            <span class="order-id">Order #${order.id.slice(-4)}</span>
            <span class="order-status ${order.status}">${order.status}</span>
        </div>
        <div class="order-items">${items}</div>
        <div class="order-total">Total: $${order.total.toFixed(2)}</div>
        <div class="order-time">Ordered at: ${order.orderTime}</div>
        ${statusButtons}
    `;

    return orderElement;
}

function toggleOrderSelection(orderId) {
    if (selectedOrders.has(orderId)) {
        selectedOrders.delete(orderId);
    } else {
        selectedOrders.add(orderId);
    }
}

function selectAllOrders() {
    const checkboxes = document.querySelectorAll('.order-checkbox');
    const selectAllCheckbox = document.getElementById('select-all');
    const isChecked = selectAllCheckbox.checked;

    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
        const orderId = checkbox.getAttribute('data-order-id');
        if (isChecked) {
            selectedOrders.add(orderId);
        } else {
            selectedOrders.delete(orderId);
        }
    });
}

function updateOrderStatus(orderId, status) {
    database.ref(`orders/${orderId}`).update({
        status: status
    }).catch(error => {
        console.error('Error updating order status:', error);
        alert('Error updating order status. Please try again.');
    });
}

// Initialize tabs
document.addEventListener('DOMContentLoaded', function() {
    loadOrders();
    
    const tabs = document.querySelectorAll('[data-tab-target]');
    const tabContents = document.querySelectorAll('[data-tab-content]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.querySelector(tab.dataset.tabTarget);
            
            tabContents.forEach(tabContent => {
                tabContent.classList.remove('active');
            });
            
            tabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            tab.classList.add('active');
            target.classList.add('active');
        });
    });
});
