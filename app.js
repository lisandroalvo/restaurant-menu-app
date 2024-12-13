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
document.addEventListener('DOMContentLoaded', function() {
    initializeTableId();
    initializeEventListeners();
    updateFloatingCart();
    loadOrders();
});

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

    // Clear any existing listeners
    database.ref('orders').off();

    // Create a query for this table's orders
    const query = database.ref('orders').orderByChild('tableId').equalTo(window.tableId);

    // Listen for all existing and new orders
    query.on('value', function(snapshot) {
        if (!snapshot.exists()) {
            ordersContainer.innerHTML = '<p>No orders yet</p>';
            return;
        }

        // Get all orders and sort them by time (newest first)
        const orders = [];
        snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            // Only include visible orders
            if (!order.isHistory && order.visible !== false) {
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

        // Sort orders by timestamp (newest first)
        orders.sort((a, b) => {
            return new Date(b.orderTime) - new Date(a.orderTime);
        });

        // Update the UI
        updateOrdersUI(orders);
    });
}

function updateOrdersUI(orders) {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;

    // Keep track of existing order elements
    const existingOrderElements = new Set();
    orders.forEach(order => {
        const orderId = `order-${order.id}`;
        existingOrderElements.add(orderId);

        let orderElement = document.getElementById(orderId);
        
        if (!orderElement) {
            // Create new order element if it doesn't exist
            orderElement = document.createElement('div');
            orderElement.id = orderId;
            orderElement.className = 'order-card';
            ordersContainer.appendChild(orderElement);
        }

        // Update the order content
        const items = order.items.map(item => 
            `<div class="order-item">
                <span>${item.name}</span>
                <span>$${item.price.toFixed(2)}</span>
            </div>`
        ).join('');

        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-id">Order #${order.id.slice(-4)}</span>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div class="order-items">${items}</div>
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
            <div class="order-time">Ordered at: ${order.orderTime}</div>
        `;

        // Add appropriate status class
        orderElement.classList.remove('pending', 'preparing', 'ready', 'delivered');
        orderElement.classList.add(order.status);
    });

    // Remove any order elements that no longer exist
    Array.from(ordersContainer.children).forEach(child => {
        if (!existingOrderElements.has(child.id)) {
            ordersContainer.removeChild(child);
        }
    });
}

function placeOrder() {
    if (!window.tableId || cart.length === 0) {
        alert('Please add items to your cart before placing an order.');
        return;
    }

    const order = {
        tableId: window.tableId,
        items: cart,
        total: total,
        status: 'pending',
        orderTime: new Date().toLocaleString(),
        timestamp: Date.now() // Add timestamp for sorting
    };

    // Add order to Firebase
    database.ref('orders').push(order)
        .then(() => {
            clearCart();
            alert('Order placed successfully!');
            // Switch to orders tab
            document.querySelector('[data-tab="orders"]').click();
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
}