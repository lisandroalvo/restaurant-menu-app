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
    
    // Listen for changes in orders
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
    ordersContainer.innerHTML = '';

    if (!orders || orders.length === 0) {
        ordersContainer.innerHTML = '<p class="no-orders">No orders yet</p>';
        return;
    }

    // Sort orders by time, newest first
    orders.sort((a, b) => new Date(b.orderTime) - new Date(a.orderTime));

    orders.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${order.status}`;
        
        const items = order.items.map(item => 
            `<div class="order-item">
                <span>${item.quantity}x ${item.name}</span>
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
            </div>`
        ).join('');

        let statusHtml = '';
        if (order.status === 'processing') {
            statusHtml = `
                <div class="order-status processing">
                    <div class="status-icon">
                        <div class="spinner"></div>
                    </div>
                    <span>Processing your order...</span>
                </div>
            `;
        } else if (order.status === 'preparing') {
            statusHtml = `
                <div class="order-status preparing">
                    <div class="status-icon">
                        <i class="fas fa-utensils"></i>
                    </div>
                    <span>Chef is preparing your order</span>
                </div>
            `;
        } else if (order.status === 'ready') {
            statusHtml = `
                <div class="order-status ready">
                    <div class="status-icon">
                        <i class="fas fa-check"></i>
                    </div>
                    <span>Order is ready!</span>
                </div>
            `;
        } else if (order.status === 'delivered') {
            statusHtml = `
                <div class="order-status delivered">
                    <div class="status-icon">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <span>Order delivered</span>
                </div>
            `;
        }

        orderCard.innerHTML = `
            <div class="order-time">Order placed at ${order.orderTime}</div>
            <div class="order-items">
                ${items}
            </div>
            <div class="order-total">
                Total: $${order.total.toFixed(2)}
            </div>
            ${statusHtml}
        `;

        ordersContainer.appendChild(orderCard);
    });
}

// Add styles
const style = document.createElement('style');
style.textContent = `
    .order-card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .order-time {
        color: #666;
        font-size: 14px;
        margin-bottom: 15px;
    }

    .order-items {
        margin: 15px 0;
        padding: 15px 0;
        border-top: 1px solid #eee;
        border-bottom: 1px solid #eee;
    }

    .order-item {
        display: flex;
        justify-content: space-between;
        margin: 8px 0;
    }

    .order-total {
        text-align: right;
        font-weight: bold;
        margin-bottom: 15px;
    }

    .order-status {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px;
        border-radius: 8px;
        margin-top: 15px;
        gap: 10px;
    }

    .status-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .spinner {
        width: 24px;
        height: 24px;
        border: 3px solid #ffd700;
        border-top: 3px solid transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    .order-status.processing {
        background-color: #fff8e1;
        color: #ffa000;
    }

    .order-status.preparing {
        background-color: #e3f2fd;
        color: #1976d2;
    }

    .order-status.ready {
        background-color: #e8f5e9;
        color: #388e3c;
    }

    .order-status.delivered {
        background-color: #f5f5f5;
        color: #616161;
    }

    .no-orders {
        text-align: center;
        color: #666;
        padding: 20px;
    }
`;
document.head.appendChild(style);