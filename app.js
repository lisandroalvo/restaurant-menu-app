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
            addToCart({name, price, quantity: 1});
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
    total += item.price * item.quantity;
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
            <span>${item.quantity}x ${item.name}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" class="remove-item">×</button>
        `;
        cartItems.appendChild(cartItem);
    });

    totalElement.textContent = total.toFixed(2);
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        total -= cart[index].price * cart[index].quantity;
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

function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Disable the order button and show processing state
    const orderBtn = document.getElementById('place-order-btn');
    orderBtn.disabled = true;
    orderBtn.textContent = 'Processing...';

    const tableId = document.getElementById('table-number').textContent;
    const orderId = database.ref('orders').push().key; // Generate order ID first
    
    const order = {
        id: orderId,
        tableId: tableId,
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'processing',
        orderTime: new Date().toLocaleString()
    };

    // Add order to Firebase
    database.ref(`orders/${orderId}`).set(order)
        .then(() => {
            // Clear cart but keep the order visible
            cart = [];
            total = 0;
            updateCartDisplay();
            updateFloatingCart();
            
            // Switch to orders tab to show the processing status
            document.querySelector('[data-tab="orders"]').click();
            
            // Re-enable the order button
            orderBtn.disabled = false;
            orderBtn.textContent = 'Place Order';
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
            orderBtn.disabled = false;
            orderBtn.textContent = 'Place Order';
        });
}

function loadOrders() {
    const tableId = document.getElementById('table-number').textContent;
    const ordersRef = database.ref('orders');
    
    ordersRef.orderByChild('tableId')
        .equalTo(tableId)
        .on('value', snapshot => {
            const orders = [];
            snapshot.forEach(childSnapshot => {
                orders.push({
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            updateOrdersUI(orders);
        });
}

function updateOrdersUI(orders) {
    const ordersContainer = document.getElementById('orders-container');
    ordersContainer.innerHTML = '<h3>My Orders</h3>';

    if (orders.length === 0) {
        ordersContainer.innerHTML += '<p class="no-orders">No orders yet</p>';
        return;
    }

    // Sort orders by time, newest first
    orders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));

    orders.forEach(order => {
        const orderElement = document.createElement('div');
        orderElement.className = `order-card ${order.status}`;
        
        const items = order.items.map(item => 
            `<div class="order-item">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>`
        ).join('');

        let statusDisplay = '';
        if (order.status === 'processing') {
            statusDisplay = `
                <div class="status-badge processing">
                    <div class="spinner"></div>
                    <span class="status-text">Processing Order</span>
                </div>
            `;
        } else if (order.status === 'preparing') {
            statusDisplay = `
                <div class="status-badge preparing">
                    <i class="fas fa-utensils"></i>
                    <span class="status-text">Chef is Preparing</span>
                </div>
            `;
        } else if (order.status === 'ready') {
            statusDisplay = `
                <div class="status-badge ready">
                    <i class="fas fa-check"></i>
                    <span class="status-text">Ready for Pickup</span>
                </div>
            `;
        } else if (order.status === 'delivered') {
            statusDisplay = `
                <div class="status-badge delivered">
                    <i class="fas fa-check-double"></i>
                    <span class="status-text">Order Delivered</span>
                </div>
            `;
        }

        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-time">${order.orderTime}</span>
                ${statusDisplay}
            </div>
            <div class="order-items">${items}</div>
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
        `;

        ordersContainer.appendChild(orderElement);
    });
}

// Add necessary styles
const style = document.createElement('style');
style.textContent = `
    .order-card {
        background: white;
        border-radius: 12px;
        padding: 20px;
        margin: 15px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
    }

    .order-card.processing {
        border: 1px solid #ffc107;
    }

    .order-card.preparing {
        border: 1px solid #2196F3;
    }

    .order-card.ready {
        border: 1px solid #4CAF50;
    }

    .order-card.delivered {
        border: 1px solid #9e9e9e;
        opacity: 0.8;
    }

    .status-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 14px;
        font-weight: 500;
        margin-left: auto;
    }

    .status-badge.processing {
        background-color: #fff8e1;
        color: #ffa000;
    }

    .status-badge.preparing {
        background-color: #e3f2fd;
        color: #1976d2;
    }

    .status-badge.ready {
        background-color: #e8f5e9;
        color: #388e3c;
    }

    .status-badge.delivered {
        background-color: #f5f5f5;
        color: #616161;
    }

    .spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #ffa000;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .order-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }

    .order-time {
        color: #666;
        font-size: 14px;
    }

    .order-items {
        border-top: 1px solid #eee;
        border-bottom: 1px solid #eee;
        padding: 15px 0;
        margin: 15px 0;
    }

    .order-item {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
        color: #333;
    }

    .order-total {
        font-weight: 600;
        text-align: right;
        color: #333;
    }

    .no-orders {
        text-align: center;
        color: #666;
        margin: 20px 0;
        font-style: italic;
    }
`;
document.head.appendChild(style);