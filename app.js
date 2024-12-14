// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyD3hZhuy9c1TnpZV6rEpuJH8zJ6bIuaOTg",
    authDomain: "restaurant-x-7baa2.firebaseapp.com",
    databaseURL: "https://restaurant-x-7baa2-default-rtdb.firebaseio.com/",
    projectId: "restaurant-x-7baa2",
    storageBucket: "restaurant-x-7baa2.appspot.com",
    messagingSenderId: "1021718770殻",
    appId: "1:1021718770殻:web:1f08d3c4f2bdb5f3f8c5b5"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Cart management
let cart = [];
let total = 0;

// DOM Elements
function initializeTableId() {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');
    
    if (tableId) {
        window.tableId = tableId;
        const tableNumber = document.getElementById('table-number');
        if (tableNumber) {
            tableNumber.textContent = tableId;
        }
    } else {
        console.error('No table ID in URL');
        alert('Error: No table ID found. Please scan the QR code again.');
    }
}

function initializeEventListeners() {
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            const menuItem = button.closest('.menu-item');
            const name = menuItem.getAttribute('data-name');
            const price = parseFloat(menuItem.getAttribute('data-price'));
            addToCart({name, price});
            switchTab('orders'); // Switch to orders tab after adding item
        });
    });

    // Floating cart button
    const floatingCart = document.getElementById('floating-cart');
    if (floatingCart) {
        floatingCart.addEventListener('click', () => {
            switchTab('orders');
        });
    }

    // Place order button
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
    }
}

function switchTab(tabName) {
    // Hide all tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });

    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.classList.remove('active');
    });

    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Add active class to the clicked button
    const selectedButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }

    // If switching to orders tab, refresh orders
    if (tabName === 'orders') {
        loadOrders();
    }
}

function updateFloatingCart() {
    const cartTotalFloat = document.getElementById('cart-total-float');
    if (cartTotalFloat) {
        cartTotalFloat.textContent = `$${total.toFixed(2)}`;
    }
}

function addToCart(item) {
    cart.push(item);
    total += item.price;
    updateCartDisplay();
    updateFloatingCart();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    
    if (!cartItems || !totalElement) return;

    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <span>${item.name}</span>
            <span>$${item.price.toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" class="remove-item">×</button>
        `;
        cartItems.appendChild(cartItem);
    });

    totalElement.textContent = total.toFixed(2);
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        total -= cart[index].price;
        cart.splice(index, 1);
        updateCartDisplay();
        updateFloatingCart();
    }
}

function clearCart() {
    cart = [];
    total = 0;
    updateCartDisplay();
    updateFloatingCart();
}

function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!window.tableId || !ordersContainer) return;

    // Create a query for this table's orders
    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(window.tableId)
        .on('value', function(snapshot) {
            const orders = [];
            
            snapshot.forEach(childSnapshot => {
                const order = childSnapshot.val();
                // Only include non-history orders
                if (order.status !== 'completed') {
                    orders.push({
                        id: childSnapshot.key,
                        ...order
                    });
                }
            });

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p>No active orders</p>';
                return;
            }

            // Sort by timestamp, newest first
            orders.sort((a, b) => b.timestamp - a.timestamp);
            updateOrdersUI(orders);
        });
}

function updateOrdersUI(orders) {
    const ordersContainer = document.getElementById('orders-container');
    
    // Clear existing orders
    ordersContainer.innerHTML = '';
    
    // Display each order
    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = 'order-card';
        orderElement.id = `order-${order.id}`;
        
        const items = order.items.map(item => `
            <div class="order-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
            </div>
        `).join('');
        
        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-id">Order #${order.id.slice(-4)}</span>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div class="order-items">${items}</div>
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
            <div class="order-time">Ordered at: ${order.orderTime}</div>
        `;
        
        ordersContainer.appendChild(orderElement);
    });
}

function loadUserOrders() {
    const tableId = localStorage.getItem('tableId');
    if (!tableId) return;

    const ordersContainer = document.querySelector('.orders-container');
    ordersContainer.innerHTML = '<p>Loading your orders...</p>';

    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(tableId)
        .on('value', snapshot => {
            ordersContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                ordersContainer.innerHTML = '<p>No orders found</p>';
                return;
            }

            // Convert to array and sort by timestamp (newest first)
            const orders = [];
            snapshot.forEach(childSnapshot => {
                orders.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            orders.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            // Display each order
            orders.forEach(order => {
                const orderElement = document.createElement('div');
                orderElement.className = 'order-card';
                
                // Calculate total
                const total = (order.items || []).reduce((sum, item) => 
                    sum + (item.price || 0) * (item.quantity || 0), 0);

                // Get status class
                const statusClass = `status-${order.status || 'pending'}`;
                
                orderElement.innerHTML = `
                    <div class="order-header">
                        <span class="order-time">${new Date(order.timestamp).toLocaleString()}</span>
                        <span class="order-status ${statusClass}">${order.status || 'pending'}</span>
                    </div>
                    <div class="order-items">
                        ${(order.items || []).map(item => `
                            <div class="order-item">
                                <span>${item.quantity}x ${item.name}</span>
                                <span>$${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        `).join('')}
                    </div>
                    <div class="order-total">Total: $${total.toFixed(2)}</div>
                `;
                
                ordersContainer.appendChild(orderElement);
            });
        });
}

// Toast notification functions
function showToast(status) {
    const toast = document.getElementById('toast-notification');
    const statusElement = toast.querySelector('.toast-status');
    const spinner = toast.querySelector('.spinner i');
    
    // Update status text and color
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = 'toast-status status-' + status;
    
    // Show/hide spinner based on status
    if (status === 'delivered') {
        spinner.style.display = 'none';
    } else {
        spinner.style.display = 'inline-block';
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after status is delivered
    if (status === 'delivered') {
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Listen for order status updates
function listenToOrderStatus(orderId) {
    database.ref('orders/' + orderId).on('value', snapshot => {
        const order = snapshot.val();
        if (!order) return;

        showToast(order.status);

        // Update orders display
        loadOrders();
    });
}

// Add order to bill section
function addToBill(order) {
    const billContainer = document.getElementById('bill-container');
    const billCard = document.createElement('div');
    billCard.className = 'bill-card';
    
    // Calculate total
    const total = order.items.reduce((sum, item) => 
        sum + (item.price * item.quantity), 0);
    
    billCard.innerHTML = `
        <div class="bill-header">
            <span>Table ${order.tableId}</span>
            <span class="bill-time">${order.orderTime}</span>
        </div>
        <div class="bill-items">
            ${order.items.map(item => `
                <div class="bill-item">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `).join('')}
        </div>
        <div class="bill-total">Total: $${total.toFixed(2)}</div>
        <button class="pay-button" onclick="requestBill('${order.id}')">Request Bill</button>
    `;
    
    billContainer.appendChild(billCard);
}

// Update placeOrder function
function placeOrder() {
    const cartItems = JSON.parse(localStorage.getItem('cartItems')) || [];
    if (cartItems.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const tableId = localStorage.getItem('tableId');
    if (!tableId) {
        alert('Please enter your table number first!');
        return;
    }

    const orderData = {
        tableId: tableId,
        items: cartItems,
        status: 'pending',
        timestamp: Date.now(),
        orderTime: new Date().toLocaleString()
    };

    // Add order to Firebase
    const newOrderRef = database.ref('orders').push();
    
    newOrderRef.set(orderData)
        .then(() => {
            // Clear cart
            localStorage.removeItem('cartItems');
            updateCart();
            
            // Show initial toast
            showToast('pending');
            
            // Start listening for status updates
            listenToOrderStatus(newOrderRef.key);
            
            // Update orders display
            loadOrders();
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
}

// Request bill function
function requestBill(orderId) {
    database.ref('orders/' + orderId).update({
        billRequested: true,
        billRequestTime: Date.now()
    })
    .then(() => {
        alert('Bill requested! A waiter will bring it to your table shortly.');
    })
    .catch(error => {
        console.error('Error requesting bill:', error);
        alert('Error requesting bill. Please try again or call a waiter.');
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', function() {
    initializeTableId();
    initializeEventListeners();
    updateFloatingCart();
    loadOrders();
    loadUserOrders();
    
    // Add tab switching functionality
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to selected tab
            const tabId = button.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
            button.classList.add('active');
        });
    });
});