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

// Initialize Firebase (replace with your config)
const firebaseConfig = {
    // your firebase config here
};
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
});

function initializeTableId() {
    const params = new URLSearchParams(window.location.search);
    const tableId = params.get('table');
    
    if (tableId) {
        window.tableId = tableId;
        document.getElementById('table-number').textContent = tableId;
    } else {
        console.error('No table ID in URL');
        alert('Error: No table ID found. Please scan the QR code again.');
    }
}

function initializeEventListeners() {
    // Add to cart buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', () => {
            const menuItem = button.closest('.menu-item');
            const name = menuItem.getAttribute('data-name');
            const price = parseFloat(menuItem.getAttribute('data-price'));
            addToCart({name, price});
            // Switch to orders tab after adding item
            openTab('orders');
        });
    });

    // Floating cart
    const floatingCart = document.getElementById('floating-cart');
    if (floatingCart) {
        floatingCart.addEventListener('click', () => openTab('orders'));
    }

    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            openTab(tabName);
        });
    });

    // Place order button
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', placeOrder);
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
    updateFloatingCart();
    updateCartDisplay();
}

function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    
    if (!cartItems || !totalElement) return;
    
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <span>${item.name}</span>
            <span>$${item.price.toFixed(2)}</span>
            <button onclick="removeFromCart(${index})" class="remove-btn">
                <i class="fas fa-times"></i>
            </button>
        `;
        cartItems.appendChild(itemElement);
    });
    
    totalElement.textContent = total.toFixed(2);
}

function removeFromCart(index) {
    const item = cart[index];
    total -= item.price;
    cart.splice(index, 1);
    updateFloatingCart();
    updateCartDisplay();
}

function clearCart() {
    cart = [];
    total = 0;
    updateFloatingCart();
    updateCartDisplay();
}

function openTab(tabName) {
    // Hide all tab content
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => content.classList.remove('active'));

    // Remove active class from all buttons
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to the clicked button
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // If opening orders tab, update the display
    if (tabName === 'orders') {
        updateCartDisplay();
        loadOrders();
    }
}

function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    if (!window.tableId) {
        alert('Error: No table ID found');
        return;
    }

    const orderBtn = document.getElementById('place-order-btn');
    if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing Order...';
    }

    const orderData = {
        tableId: window.tableId,
        items: cart,
        total: total,
        status: 'pending',
        orderTime: new Date().toLocaleString()
    };

    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully:', ref.key);
            clearCart();
            alert('Order placed successfully!');
            loadOrders();
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        })
        .finally(() => {
            if (orderBtn) {
                orderBtn.disabled = false;
                orderBtn.textContent = 'Place Order';
            }
        });
}

function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!window.tableId || !ordersContainer) return;

    ordersContainer.innerHTML = '<h3>Previous Orders</h3>';
    
    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(window.tableId)
        .on('value', function(snapshot) {
            if (!snapshot.exists()) {
                ordersContainer.innerHTML += '<div class="no-orders">No previous orders</div>';
                return;
            }

            snapshot.forEach(function(childSnapshot) {
                const order = childSnapshot.val();
                const orderElement = document.createElement('div');
                orderElement.className = 'order-card';
                
                const items = order.items.map(item => `
                    <div class="order-item">
                        <span>${item.name}</span>
                        <span>$${item.price.toFixed(2)}</span>
                    </div>
                `).join('');

                orderElement.innerHTML = `
                    <div class="order-header">
                        <span class="order-id">Order #${childSnapshot.key.slice(-4)}</span>
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