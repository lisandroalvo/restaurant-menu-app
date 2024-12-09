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

let cart = [];
let total = 0;
let tableId = null;

// Get table ID from URL
function getTableId() {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('tableId');
    return id || 'unknown';
}

// Initialize table information
function initializeTable() {
    tableId = getTableId();
    const tableInfo = document.getElementById('table-info');
    if (tableInfo) {
        tableInfo.textContent = `Table #${tableId}`;
    }
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
    
    // Show/hide order button based on cart contents
    const orderBtn = document.getElementById('order-btn');
    if (orderBtn) {
        orderBtn.style.display = cart.length > 0 ? 'block' : 'none';
    }
}

// Place order function
function placeOrder() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    // Create order data
    const orderData = {
        tableId: tableId,
        items: cart,
        total: total,
        status: 'pending',
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        orderDate: new Date().toISOString().split('T')[0]
    };

    // Get a reference to the orders collection in Firebase
    const ordersRef = database.ref('orders');

    // Push the new order
    ordersRef.push(orderData)
        .then((ref) => {
            const orderKey = ref.key;
            
            // Save to local storage with table ID
            const myOrders = JSON.parse(localStorage.getItem(`orders_table_${tableId}`) || '[]');
            myOrders.push({
                key: orderKey,
                ...orderData
            });
            localStorage.setItem(`orders_table_${tableId}`, JSON.stringify(myOrders));
            
            // Clear the cart
            clearCart();
            
            // Show success message
            alert('Order placed successfully!');
            
            // Switch to orders tab if it exists
            const ordersTab = document.getElementById('orders-tab');
            if (ordersTab) {
                switchTab('orders');
            }
        })
        .catch((error) => {
            console.error('Error placing order:', error);
            alert('Error placing order. Please try again.');
        });
}

// Load orders for current table
function loadOrders() {
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) return;
    
    // Get orders from local storage for this table
    const myOrders = JSON.parse(localStorage.getItem(`orders_table_${tableId}`) || '[]');
    
    ordersContainer.innerHTML = '';
    myOrders.forEach(order => {
        const orderDiv = document.createElement('div');
        orderDiv.className = 'order-card';
        
        const itemsList = order.items.map(item => 
            `<li>${item.item} - $${item.price.toFixed(2)}</li>`
        ).join('');
        
        orderDiv.innerHTML = `
            <h3>Order #${order.key.slice(-4)}</h3>
            <p>Table #${order.tableId}</p>
            <p>Status: ${order.status}</p>
            <p>Time: ${new Date(order.timestamp).toLocaleString()}</p>
            <ul>${itemsList}</ul>
            <p><strong>Total: $${order.total.toFixed(2)}</strong></p>
            ${order.status === 'delivered' ? `
                <button onclick="requestBill('${order.key}')" class="request-bill-btn">
                    Request Bill
                </button>
            ` : ''}
        `;
        
        ordersContainer.appendChild(orderDiv);
    });
}

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
}

// Request bill function
function requestBill(orderKey) {
    const billRequest = {
        orderKey: orderKey,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };

    database.ref('billRequests').push(billRequest)
        .then(() => {
            // Update local storage to mark bill as requested
            const orders = JSON.parse(localStorage.getItem(`orders_table_${tableId}`) || '[]');
            const updatedOrders = orders.map(order => {
                if (order.key === orderKey) {
                    return { ...order, billRequested: true };
                }
                return order;
            });
            localStorage.setItem(`orders_table_${tableId}`, JSON.stringify(updatedOrders));
            
            // Update UI
            const button = document.querySelector(`[data-order-key="${orderKey}"] .request-bill-btn`);
            if (button) {
                button.textContent = 'Bill Requested';
                button.disabled = true;
            }
            
            alert('Bill request sent! The restaurant will send your bill shortly.');
        })
        .catch(error => {
            console.error('Error requesting bill:', error);
            alert('Error requesting bill. Please try again.');
        });
}

// Listen for bill updates
database.ref('bills').on('child_added', function(snapshot) {
    const billData = snapshot.val();
    if (billData.status === 'sent') {
        // Play notification sound
        const audio = new Audio('notification.mp3');
        audio.play().catch(error => console.log('Error playing sound:', error));
        
        // Show bill in orders
        const orderDiv = document.querySelector(`[data-order-key="${billData.orderKey}"]`);
        if (orderDiv) {
            const billSection = document.createElement('div');
            billSection.className = 'bill-section';
            billSection.innerHTML = `
                <h3>Bill Details</h3>
                <div class="bill-content">
                    <div class="restaurant-info">
                        <h2>${billData.restaurantName}</h2>
                        <p>${billData.address}</p>
                        <p>${billData.phone}</p>
                    </div>
                    <div class="order-info">
                        <p><strong>Order #:</strong> ${billData.orderNumber}</p>
                        <p><strong>Date:</strong> ${new Date(billData.timestamp).toLocaleDateString()}</p>
                        <p><strong>Time:</strong> ${new Date(billData.timestamp).toLocaleTimeString()}</p>
                    </div>
                    <div class="items-list">
                        <h4>Items:</h4>
                        <ul>
                            ${billData.items.map(item => `
                                <li>${item.item} - $${item.price.toFixed(2)}</li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="total">
                        <h4>Total: $${billData.total.toFixed(2)}</h4>
                    </div>
                </div>
                <button onclick="downloadBill(this)" class="download-bill-btn">Download Bill</button>
            `;
            
            // Replace the request button with bill section
            const requestBtn = orderDiv.querySelector('.request-bill-btn');
            if (requestBtn) {
                requestBtn.replaceWith(billSection);
            }
        }
    }
});

// Download bill as image
function downloadBill(button) {
    const billContent = button.parentElement.querySelector('.bill-content');
    html2canvas(billContent).then(canvas => {
        const link = document.createElement('a');
        link.download = 'bill.png';
        link.href = canvas.toDataURL();
        link.click();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeTable();
    updateCartDisplay();
    
    // If we're on the orders tab, load orders
    if (document.getElementById('orders-tab')) {
        loadOrders();
    }
});
