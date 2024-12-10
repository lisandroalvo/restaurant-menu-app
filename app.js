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

// Global variables
let cart = [];
let total = 0;

// Get table ID
function getTableId() {
    return window.tableId || null;
}

// Cart management
function updateFloatingCart() {
    const cartTotalFloat = document.getElementById('cart-total-float');
    if (cartTotalFloat) {
        cartTotalFloat.textContent = `$${total.toFixed(2)}`;
    }
}

function addToCart(item) {
    cart.push(item);
    total += item.price;
    
    // Update floating cart
    updateFloatingCart();
    
    // Update cart in orders tab
    updateCartDisplay();
    
    // Show feedback
    alert(`${item.name} added to cart!`);
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
            <button onclick="removeFromCart(${index})" class="remove-btn">×</button>
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

// Place order function
function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const tableId = getTableId();
    if (!tableId) {
        alert('Error: No table ID found');
        return;
    }

    const orderData = {
        tableId: tableId,
        items: cart,
        total: total,
        status: 'pending',
        orderTime: new Date().toLocaleString()
    };

    // Show loading state
    const orderBtn = document.querySelector('.order-btn');
    if (orderBtn) {
        orderBtn.disabled = true;
        orderBtn.textContent = 'Placing Order...';
    }

    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully:', ref.key);
            clearCart();
            alert('Order placed successfully! Check the Orders tab to see your order status.');
            openTab('orders');
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        })
        .finally(() => {
            // Reset button state
            if (orderBtn) {
                orderBtn.disabled = false;
                orderBtn.textContent = 'Place Order';
            }
        });
}

// Tab switching function
function openTab(tabName) {
    // Hide all tab content
    const tabContents = document.getElementsByClassName('tab-content');
    for (let content of tabContents) {
        content.classList.remove('active');
    }

    // Remove active class from all buttons
    const tabButtons = document.getElementsByClassName('tab-button');
    for (let button of tabButtons) {
        button.classList.remove('active');
    }

    // Show the selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to the clicked button
    const buttons = Array.from(tabButtons);
    const activeButton = buttons.find(button => 
        button.textContent.toLowerCase().includes(tabName)
    );
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // If opening orders tab, update the display
    if (tabName === 'orders') {
        updateCartDisplay();
        loadOrders();
    }
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

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function() {
    updateFloatingCart();
    updateCartDisplay();
});

// Request bill function
function requestBill() {
    if (!window.tableId) {
        alert('Error: No table ID found. Please scan the QR code again.');
        return;
    }

    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(window.tableId)
        .once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                alert('No orders found for this table!');
                return;
            }

            let totalAmount = 0;
            let pendingOrders = false;

            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                if (order.status === 'pending' || order.status === 'preparing') {
                    pendingOrders = true;
                }
                totalAmount += order.total;
            });

            if (pendingOrders) {
                alert('Please wait until all orders are completed before requesting the bill.');
                return;
            }

            const billRequest = {
                tableId: window.tableId,
                total: totalAmount,
                status: 'pending',
                timestamp: Date.now()
            };

            return database.ref('billRequests').push(billRequest);
        })
        .then(() => {
            if (!arguments[0]) return; // Skip if previous then() returned undefined
            alert('Bill requested! Please wait for the staff.');
        })
        .catch((error) => {
            console.error('Error requesting bill:', error);
            alert('Error requesting bill. Please try again.');
        });
}