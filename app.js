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

    const tableId = document.getElementById('table-number').textContent;
    const order = {
        tableId: tableId,
        items: [...cart],
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'active',
        orderTime: new Date().toLocaleString()
    };

    // Add order to Firebase
    database.ref('orders').push(order)
        .then((ref) => {
            // Don't clear the cart immediately
            alert('Order placed successfully!');
            
            // Update the orders display
            loadOrders();
            
            // Switch to orders tab
            document.querySelector('[data-tab="orders"]').click();
        })
        .catch(error => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
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
    ordersContainer.innerHTML = '<h3>Order History</h3>';

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

        orderElement.innerHTML = `
            <div class="order-header">
                <span class="order-time">${order.orderTime}</span>
                <span class="order-status ${order.status}">${order.status}</span>
            </div>
            <div class="order-items">${items}</div>
            <div class="order-total">Total: $${order.total.toFixed(2)}</div>
        `;

        ordersContainer.appendChild(orderElement);
    });
}