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

    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(window.tableId)
        .on('value', function(snapshot) {
            // Clear container
            ordersContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                ordersContainer.innerHTML = '<p>No orders yet</p>';
                return;
            }

            const orders = [];
            snapshot.forEach(childSnapshot => {
                const order = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
                // Only show orders that are not in history
                if (order.status !== 'completed') {
                    orders.push(order);
                }
            });

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p>No active orders</p>';
                return;
            }

            // Sort by timestamp, newest first
            orders.sort((a, b) => b.timestamp - a.timestamp);

            // Create order elements
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
        timestamp: Date.now(),
        orderTime: new Date().toLocaleString()
    };

    database.ref('orders').push(order)
        .then(() => {
            clearCart();
            alert('Order placed successfully!');
            document.querySelector('[data-tab="orders"]').click();
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
}