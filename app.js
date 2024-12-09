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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Initialize variables
let cart = [];
let total = 0;
let tableId = null;

// Initialize app with table ID
function initializeApp(id) {
    console.log('Initializing app with table ID:', id); // Debug log
    tableId = id;
    clearAllData();
}

// Clear all data function
function clearAllData() {
    // Clear cart
    cart = [];
    total = 0;
    updateCartDisplay();
    
    // Clear local storage for this table
    if (tableId) {
        localStorage.removeItem(`orders_table_${tableId}`);
        localStorage.removeItem(`cart_table_${tableId}`);
    }
}

// Get current table ID
function getCurrentTableId() {
    // First try to get from variable
    if (tableId) return tableId;
    
    // Then try to get from localStorage
    const storedId = localStorage.getItem('currentTableId');
    if (storedId) return storedId;
    
    // Finally try to get from URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('table');
    
    console.log('Getting table ID:', urlId); // Debug log
    return urlId;
}

// When page loads or QR is scanned
window.onload = function() {
    // Get table ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('table');
    
    if (!id) {
        alert('No table ID provided! Please scan the QR code again.');
        return;
    }

    // Initialize app with table ID
    initializeApp(id);
    
    // Initialize table and display table number
    document.getElementById('table-number').textContent = id;
}

// Add to cart function
function addToCart(item, price) {
    cart.push({ item, price });
    total += price;
    updateCartDisplay();
}

// Remove from cart function
function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        total -= cart[index].price;
        cart.splice(index, 1);
        updateCartDisplay();
    }
}

// Clear cart function
function clearCart() {
    cart = [];
    total = 0;
    updateCartDisplay();
}

// Update cart display
function updateCartDisplay() {
    const cartItems = document.getElementById('cart-items');
    const totalElement = document.getElementById('total');
    const orderBtn = document.getElementById('order-btn');
    
    if (!cartItems || !totalElement) return;
    
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            ${item.item} - $${item.price.toFixed(2)}
            <button onclick="removeFromCart(${index})" class="remove-item-btn">Remove</button>
        `;
        cartItems.appendChild(li);
    });
    
    totalElement.textContent = total.toFixed(2);
    
    if (orderBtn) {
        orderBtn.style.display = cart.length > 0 ? 'block' : 'none';
    }
}

// Place order function
function placeOrder() {
    const currentTableId = getCurrentTableId();
    console.log('Placing order for table:', currentTableId); // Debug log
    
    if (!currentTableId) {
        alert('No table ID found! Please scan the QR code again.');
        return;
    }

    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    const orderData = {
        tableId: currentTableId,
        items: cart,
        total: total,
        status: 'pending',
        timestamp: Date.now(),
        orderDate: new Date().toISOString().split('T')[0],
        orderTime: new Date().toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        })
    };

    console.log('Sending order data:', orderData); // Debug log

    // Send order to Firebase
    database.ref('orders').push(orderData)
        .then((ref) => {
            console.log('Order sent successfully with key:', ref.key);
            
            // Save to local storage with table ID
            const storageKey = `orders_table_${currentTableId}`;
            const myOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
            myOrders.push({
                key: ref.key,
                ...orderData
            });
            localStorage.setItem(storageKey, JSON.stringify(myOrders));
            
            // Clear the cart
            clearCart();
            
            // Show success message
            alert('Order placed successfully!');
            
            // Load the updated orders
            loadOrders();
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
}

// Request bill function
function requestBill() {
    const currentTableId = getCurrentTableId();
    console.log('Requesting bill for table:', currentTableId); // Debug log
    
    if (!currentTableId) {
        alert('No table ID found! Please scan the QR code again.');
        return;
    }

    // Get all orders for this table from Firebase
    database.ref('orders')
        .orderByChild('tableId')
        .equalTo(currentTableId)
        .once('value')
        .then((snapshot) => {
            if (!snapshot.exists()) {
                alert('No orders found for this table!');
                return;
            }

            // Calculate total amount
            let totalAmount = 0;
            snapshot.forEach((childSnapshot) => {
                const order = childSnapshot.val();
                if (order.status !== 'cancelled') {
                    totalAmount += order.total;
                }
            });

            // Create bill request
            const billRequest = {
                tableId: currentTableId,
                status: 'pending',
                total: totalAmount,
                timestamp: Date.now(),
                requestDate: new Date().toISOString().split('T')[0],
                requestTime: new Date().toLocaleTimeString()
            };

            return database.ref('billRequests').push(billRequest);
        })
        .then(() => {
            alert('Bill requested! Please wait for the staff to process it.');
        })
        .catch((error) => {
            console.error('Error requesting bill:', error);
            alert('Error requesting bill. Please try again.');
        });
}

// Listen for bill updates
database.ref('bills').on('child_added', function(snapshot) {
    const billData = snapshot.val();
    if (billData.tableId === getCurrentTableId() && billData.status === 'sent') {
        // Play notification sound
        const audio = new Audio('notification.mp3');
        audio.play().catch(error => console.log('Error playing sound:', error));
        
        // Update the order display
        loadOrders();
    }
});

// Listen for order status updates
database.ref('orders').on('child_changed', function(snapshot) {
    const orderData = snapshot.val();
    if (orderData.tableId === getCurrentTableId()) {
        // Update local storage
        const orders = JSON.parse(localStorage.getItem(`orders_table_${getCurrentTableId()}`) || '[]');
        const updatedOrders = orders.map(order => {
            if (order.key === snapshot.key) {
                return { ...order, status: orderData.status };
            }
            return order;
        });
        localStorage.setItem(`orders_table_${getCurrentTableId()}`, JSON.stringify(updatedOrders));
        
        // Refresh orders display
        loadOrders();
    }
});

// Switch tabs function
function switchTab(tabName) {
    const menuTab = document.getElementById('menu-tab');
    const ordersTab = document.getElementById('orders-tab');
    
    if (menuTab && ordersTab) {
        menuTab.style.display = tabName === 'menu' ? 'block' : 'none';
        ordersTab.style.display = tabName === 'orders' ? 'block' : 'none';
        
        if (tabName === 'orders') {
            loadOrders();
        }
    }
    
    // Update active tab button
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(button => {
        button.classList.toggle('active', button.textContent.toLowerCase().includes(tabName));
    });
}

// Load orders function
function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    // Get orders from local storage for this table
    const myOrders = JSON.parse(localStorage.getItem(`orders_table_${getCurrentTableId()}`) || '[]');
    
    ordersContainer.innerHTML = '';
    myOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        orderDiv.setAttribute('data-order-key', order.key);
        
        const itemsList = order.items.map(item => 
            `<li>${item.item} - $${item.price.toFixed(2)}</li>`
        ).join('');
        
        const billButton = !order.billRequested && order.status === 'delivered' ? 
            `<button onclick="requestBill('${order.key}')" class="request-bill-btn" data-order-key="${order.key}">
                Request Bill
            </button>` : 
            (order.billRequested ? '<p class="bill-status">Bill Requested</p>' : '');
        
        orderDiv.innerHTML = `
            <h3>Order #${order.key.slice(-4)}</h3>
            <p>Table #${order.tableId}</p>
            <p>Status: ${order.status}</p>
            <p>Date: ${order.orderDate}</p>
            <p>Time: ${order.orderTime}</p>
            <ul>${itemsList}</ul>
            <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
            ${billButton}
        `;
        
        ordersContainer.appendChild(orderDiv);
    });
}

// Update status display
function updateOrderStatus(orderId, status) {
    const statusElement = document.querySelector(`#order-${orderId} .status-badge`);
    if (statusElement) {
        statusElement.className = `status-badge status-${status.toLowerCase()}`;
        statusElement.textContent = status;
    }
}
