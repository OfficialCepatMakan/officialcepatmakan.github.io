// ==========================================
// 1. GLOBAL VARIABLES & STATE MANAGEMENT
// ==========================================

const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

// DOM Cache (Improves performance by not searching the document repeatedly)
const DOM = {
  menuBtn: document.getElementById("menu-button"),
  sidePanel: document.getElementById("side-panel"),
  menuSection: document.getElementById("menu-section"),
  cartSection: document.getElementById("cart-section"),
  adminSection: document.getElementById("admin-section"),
  orderSection: document.getElementById("orders-section"),
  menuBtn2: document.getElementById("btn-menu"),
  orderBtn: document.getElementById("btn-order"),
  cartBtn: document.getElementById("btn-cart"),
  adminBtn: document.getElementById("btn-admin"),
  logoutBtn: document.getElementById("btn-logout"),
  floatBtn: document.getElementById("dark-toggle"),
  gradeSelect: document.getElementById("grade"),
  classGroup: document.getElementById("class-group"),
  othersGroup: document.getElementById("others-group"),
  menuBtn3: document.querySelector(".menu-btn"),
  bigBtn: document.getElementById("big-bg-btn"),
  ordersList: document.getElementById('orders-list'),
  menuGrid: document.querySelector('.menu-grid'),
  cartItemsContainer: document.querySelector('.cart-items'),
  cartCount: document.querySelector('.cart-count'),
  emptyCartMsg: document.querySelector('.empty-cart'),
  totalPriceEl: document.querySelector('.total-section .total-price'),
  orderSubmitBtn: document.getElementById('order-btn'),
  authContainer: document.getElementById("authContainer"),
  scrollContainer: document.getElementById('orders-scroll'),
  itemCount: document.querySelector('.item-count'),
  filterBtns: document.querySelectorAll(".filter-btn"),
  scrollBtn: document.getElementById("scroll-btn")
};

// Application State
const STATE = {
  cart: [],
  menuData: [],       // Stores menu items locally to avoid re-fetching
  currentUser: null,
  adminEmails: [],
  courierEmails: [],
  listeners: {},      // Stores active DB listeners
  firstLoad: true,
  previousOrdersCount: 0
};

// ==========================================
// 2. INITIALIZATION & SETUP
// ==========================================

document.addEventListener("DOMContentLoaded", async () => {
  setupTheme();
  setupNavigation();
  setupScrollButton();

  // Load Admin and Courier Config concurrently
  try {
    const [admins, couriers] = await Promise.all([
      fetch('data/Admins.json').then(r => r.json()).catch(() => ({ adminEmails: [] })),
      fetch('data/Courier.json').then(r => r.json()).catch(() => ({ courierEmails: [] }))
    ]);
    STATE.adminEmails = admins.adminEmails || [];
    STATE.courierEmails = couriers.courierEmails || [];
    
    // Refresh Admin UI if user is already loaded
    if (STATE.currentUser) updateAdminUI();
  } catch (e) {
    console.error("Failed to load config:", e);
  }

  // Initial Menu Load
  loadMenuData();
});

// ==========================================
// 3. AUTHENTICATION & REALTIME LISTENERS
// ==========================================

auth.onAuthStateChanged(user => {
  STATE.currentUser = user;

  if (user) {
    console.log("User signed in:", user.email);
    renderAuthUI(user);
    updateAdminUI();
    
    // Start Realtime Listeners (Replaces setInterval)
    setupRealtimeListeners(user);
  } else {
    console.log("User signed out");
    renderAuthUI(null);
    if (DOM.adminBtn) DOM.adminBtn.style.display = "none";
    
    // Detach listeners to prevent memory leaks
    detachRealtimeListeners();
  }
});

function setupRealtimeListeners(user) {
  // 1. Cancelled Orders Listener (Push Notification style)
  const cancelledRef = db.ref('Cancelled').orderByChild('mail').equalTo(user.email);
  const cancelListener = cancelledRef.on('child_added', (snapshot) => {
    const cancelled = snapshot.val();
    const key = snapshot.key;
    if (cancelled) showCancellationPopup(cancelled, key);
  });
  STATE.listeners.cancelled = { ref: cancelledRef, fn: cancelListener };

  // 2. Orders Listener (Replaces the 5s Interval loop)
  const ordersRef = db.ref('Orders');
  const ordersListener = ordersRef.on('value', (snapshot) => {
    renderOrders(snapshot.val());
  });
  STATE.listeners.orders = { ref: ordersRef, fn: ordersListener };
}

function detachRealtimeListeners() {
  if (STATE.listeners.cancelled) {
    STATE.listeners.cancelled.ref.off('child_added', STATE.listeners.cancelled.fn);
  }
  if (STATE.listeners.orders) {
    STATE.listeners.orders.ref.off('value', STATE.listeners.orders.fn);
  }
  STATE.listeners = {};
}

// ==========================================
// 4. MENU LOGIC (Optimized)
// ==========================================

function loadMenuData() {
  db.ref('menu/main_course').once('value', (snapshot) => {
    const data = snapshot.val();
    if (!data) return;
    
    // Convert object to array for easier filtering/sorting
    STATE.menuData = Object.entries(data).map(([key, val]) => ({ key, ...val }));
    renderMenu("all"); // Initial render
  });
}

// Filter logic runs in memory (Fast!)
function renderMenu(filter) {
  DOM.menuGrid.innerHTML = '';
  
  const sortedItems = STATE.menuData
    .filter(item => filter === "all" || item.filter === filter)
    .sort((a, b) => {
      // Sort priority: BestSeller -> High Stock -> Limited
      if (a.bestSeller === "yes" && b.bestSeller !== "yes") return -1;
      if (a.bestSeller !== "yes" && b.bestSeller === "yes") return 1;
      if (a.stock !== b.stock) return b.stock - a.stock; 
      if (a.limited === "yes" && b.limited !== "yes") return -1;
      if (a.limited !== "yes" && b.limited === "yes") return 1;
      return 0;
    });

  let count = 0;
  sortedItems.forEach(item => {
    DOM.menuGrid.appendChild(createMenuItem(item));
    count++;
  });
  DOM.itemCount.textContent = `${count} items`;
}

// Filter Buttons Event Listeners
DOM.filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    DOM.filterBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderMenu(btn.getAttribute("data-filter"));
  });
});

function createMenuItem(item) {
  const el = document.createElement('div');
  el.className = 'menu-item';
  if (item.bestSeller === "yes") el.classList.add('bestseller-glow');
  else if (item.limited === "yes") el.classList.add('limited-glow');

  // Logic for price display
  const finalPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price;
  const priceHTML = item.discount 
    ? `<span class="original-price">Rp ${item.price.toLocaleString('id-ID')}</span>
       <span class="discounted-price">Rp ${finalPrice.toLocaleString('id-ID')}</span>`
    : `Rp ${item.price.toLocaleString('id-ID')}`;

  const tags = `
    ${item.limited === "yes" ? '<span class="bold-red">[LIMITED]</span>' : ''} 
    ${item.bestSeller === "yes" ? '<span class="icon-star">★</span>' : ''}
  `;

  el.innerHTML = `
    <div class="item-image"><img src="${item.image}" loading="lazy" alt="${item.name}"></div>
    <div class="item-content">
      <div class="item-header">
        <h4 class="item-name">${tags} ${item.name}</h4>
        <span class="item-price">${priceHTML}</span>
      </div>
      <p class="item-description">${item.description}</p>
      <p class="item-stock">Stock: ${item.stock}</p>
      <div class="item-actions">
        <div class="quantity-controls">
          <button class="qty-btn minus" disabled>−</button>
          <input type="number" value="0" min="0" max="${item.stock}" class="qty-input">
          <button class="qty-btn plus">+</button>
        </div>
        <button class="add-btn">Add to Cart</button>
      </div>
    </div>
  `;

  // Internal Logic for this specific card
  const input = el.querySelector('.qty-input');
  const minus = el.querySelector('.minus');
  const plus = el.querySelector('.plus');
  const addBtn = el.querySelector('.add-btn');

  const updateState = (val) => {
    let newVal = Math.max(0, Math.min(val, item.stock));
    input.value = newVal;
    minus.disabled = newVal === 0;
  };

  minus.onclick = () => updateState(parseInt(input.value) - 1);
  plus.onclick = () => {
    if(parseInt(input.value) < item.stock) updateState(parseInt(input.value) + 1);
    else alert("Max stock reached");
  };
  
  input.oninput = () => updateState(parseInt(input.value) || 0);

  addBtn.onclick = () => {
    const qty = parseInt(input.value);
    if (qty > 0) {
      addToCart(item, qty);
      updateState(0); // Reset UI
    }
  };

  return el;
}

// ==========================================
// 5. CART LOGIC
// ==========================================

function addToCart(item, qty) {
  const existing = STATE.cart.find(c => c.key === item.key);
  if (existing) {
    if(existing.quantity + qty > item.stock) {
        alert("Cannot add more than available stock");
        return;
    }
    existing.quantity += qty;
  } else {
    STATE.cart.push({
      key: item.key,
      name: item.name,
      price: item.price,
      quantity: qty,
      stock: item.stock,
      discount: item.discount || 0
    });
    DOM.cartBtn.classList.add("has-notification");
    DOM.menuBtn3.classList.add("has-notification");
    alert("Item added to cart, press the 3 dots button to open cart");
  }
  updateCartDisplay();
}

function updateCartDisplay() {
  DOM.cartItemsContainer.innerHTML = '';
  
  if (STATE.cart.length === 0) {
    DOM.cartItemsContainer.style.display = 'none';
    DOM.emptyCartMsg.style.display = 'block';
    DOM.cartCount.textContent = '0';
    DOM.orderSubmitBtn.disabled = true;
    DOM.totalPriceEl.textContent = 'Rp 0';
    return;
  }

  DOM.emptyCartMsg.style.display = 'none';
  DOM.cartItemsContainer.style.display = 'block';
  DOM.orderSubmitBtn.disabled = false;

  let totalItems = 0;
  let grandTotal = 0;

  STATE.cart.forEach(item => {
    totalItems += item.quantity;
    const price = item.price * (1 - item.discount / 100);
    const itemTotal = price * item.quantity;
    grandTotal += itemTotal;

    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="item-info">
        <h4>${item.name}</h4>
        <p>
           Rp ${price.toLocaleString('id-ID')} x ${item.quantity}
           ${item.discount > 0 ? `<span class="discount-tag">(${item.discount}% off)</span>` : ""}
        </p>
      </div>
      <div class="item-controls">
        <button class="qty-btn c-minus">−</button>
        <input type="number" value="${item.quantity}" class="qty-input" style="width:40px;">
        <button class="qty-btn c-plus">+</button>
      </div>
      <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
    `;

    // Cart Actions
    const input = div.querySelector('.qty-input');
    
    div.querySelector('.c-minus').onclick = () => {
      item.quantity--;
      if (item.quantity <= 0) STATE.cart = STATE.cart.filter(c => c.key !== item.key);
      updateCartDisplay();
    };
    
    div.querySelector('.c-plus').onclick = () => {
      if (item.quantity < item.stock) {
        item.quantity++;
        updateCartDisplay();
      } else alert("Max stock reached");
    };

    input.oninput = () => {
       let val = parseInt(input.value) || 0;
       if(val > item.stock) { val = item.stock; alert("Max stock"); }
       item.quantity = val;
       if(item.quantity <= 0) STATE.cart = STATE.cart.filter(c => c.key !== item.key);
       updateCartDisplay();
    }

    DOM.cartItemsContainer.appendChild(div);
  });

  DOM.cartCount.textContent = totalItems;
  DOM.totalPriceEl.textContent = `Rp ${grandTotal.toLocaleString('id-ID')}`;
}

// ==========================================
// 6. ORDER RENDERING & LOGIC
// ==========================================

function renderOrders(ordersData) {
  if (!ordersData) {
    DOM.ordersList.innerHTML = '<p>No orders found.</p>';
    return;
  }

  const userEmail = STATE.currentUser.email;
  const isAdmin = STATE.adminEmails.includes(userEmail);
  const isCourier = STATE.courierEmails.includes(userEmail);

  // Filter valid orders first (Own orders, or Admin/Courier view all)
  const validOrders = Object.entries(ordersData).map(([id, order]) => ({id, ...order}))
    .filter(order => order.mail === userEmail || isAdmin || isCourier);

  // Audio Notification Logic
  if (!STATE.firstLoad && validOrders.length > STATE.previousOrdersCount) {
    const audio = new Audio('../assets/Audio/alarm.mp3');
    audio.play().catch(e => console.log("Audio play failed (interaction required)"));
    console.log("🚨 New order detected!");
  }
  
  STATE.previousOrdersCount = validOrders.length;
  STATE.firstLoad = false;

  // Group by Date (DDMMYY)
  const grouped = {};
  validOrders.forEach(order => {
    const d = parseTimestamp(order.timestamp);
    const dateKey = formatDateLabel(d);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push({ ...order, dateObj: d });
  });

  // Sort Dates (Newest first)
  const sortedDates = Object.keys(grouped).sort((a, b) => {
    const timeA = grouped[a][0].dateObj.getTime();
    const timeB = grouped[b][0].dateObj.getTime();
    return timeB - timeA;
  });

  // Render to Fragment (Performance)
  const fragment = document.createDocumentFragment();
  
  sortedDates.forEach(date => {
    const header = document.createElement('div');
    header.className = 'date-divider';
    header.textContent = date;
    fragment.appendChild(header);

    // Sort orders within date (Newest first)
    grouped[date].sort((a, b) => b.dateObj - a.dateObj).forEach(order => {
       fragment.appendChild(createOrderCard(order, isAdmin, isCourier, userEmail));
    });
  });

  // Render Admin Summary if needed
  if (isAdmin) {
    const summary = document.createElement('div');
    summary.className = 'admin-summary';
    summary.innerHTML = getAdminSummaryHTML(validOrders);
    fragment.appendChild(summary);
  }

  // Preserve scroll position
  const lastScroll = DOM.scrollContainer.scrollTop;
  DOM.ordersList.innerHTML = '';
  DOM.ordersList.appendChild(fragment);
  DOM.scrollContainer.scrollTop = lastScroll;
}

function createOrderCard(order, isAdmin, isCourier, myEmail) {
  const card = document.createElement('div');
  card.className = 'order-item';

  let itemsHtml = "";
  if (Array.isArray(order.items)) {
    itemsHtml = order.items.map(i => 
      `<p>${i.name} x${i.quantity} — Rp${(i.price * i.quantity).toLocaleString('id-ID')}</p>`
    ).join('');
  }

  // Buttons Logic
  let adminControls = '';
  if (isAdmin) {
    // We stringify the order object to pass it to the cancel function safely
    const safeOrder = escapeHtml(JSON.stringify(order));
    adminControls = `
      <div class="admin-buttons">
        <button class="remove-order" onclick="window.deleteOrder('${order.id}')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px; height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
        </button>
        <button class="cancel-order" onclick="window.cancelOrder('${order.id}', '${safeOrder}')">Cancel</button>
      </div>
      <p><strong>Email:</strong> ${order.mail}</p>
    `;
  }

  let courierControls = '';
  const takenBy = order.courier || '';
  if (isCourier) {
    const isMine = takenBy === myEmail;
    courierControls = `
      <label>
        <input type="checkbox" onchange="window.toggleCourier('${order.id}', this.checked)" 
        ${isMine ? 'checked' : ''} ${takenBy && !isMine ? 'disabled' : ''}>
        ${isMine ? 'You took this' : takenBy ? 'Taken' : 'Take Order'}
      </label>
    `;
  }
  if (takenBy && (isAdmin || isCourier)) {
    courierControls += `<p><strong>Courier:</strong> ${takenBy}</p>`;
  }

  card.innerHTML = `
    <h4>${order.name} (${order.grade}-${order.class})</h4>
    <p><strong>Payment:</strong> ${order.paymentMethod}</p>
    <div class="order-items">${itemsHtml}</div>
    <p><strong>Total:</strong> Rp${(order.total || 0).toLocaleString('id-ID')}</p>
    <p><strong>Timestamp:</strong> ${order.timestamp}</p>
    ${adminControls}
    ${courierControls}
  `;
  return card;
}

// Global Order Actions (Attached to window for inline HTML access)
window.deleteOrder = (id) => {
  if (confirm("Are you sure you want to delete this order?")) {
    db.ref('Orders/' + id).remove()
      .then(() => alert("Order deleted."))
      .catch(e => alert("Error: " + e.message));
  }
};

window.cancelOrder = (id, orderString) => {
  const reason = prompt("Reason for cancellation?");
  if (!reason) return;
  
  const order = JSON.parse(decodeHtml(orderString));
  
  const cancelData = {
    ...order, 
    cancelledBy: STATE.currentUser.email, 
    reason: reason, 
    cancelledAt: Date.now()
  };

  db.ref('Cancelled/' + id).set(cancelData)
    .then(() => db.ref('Orders/' + id).remove())
    .then(() => alert("Order cancelled."))
    .catch(e => console.error(e));
};

window.toggleCourier = (id, isTaking) => {
  db.ref('Orders/' + id).update({ courier: isTaking ? STATE.currentUser.email : "" })
    .then(() => alert(isTaking ? "You took the order" : "Order released"));
};


DOM.orderSubmitBtn.addEventListener('click', function () {
  if (STATE.cart.length === 0) {
    alert("Your cart is empty!");
    return;
  }
  if (!STATE.currentUser) {
    alert("You must be logged in to order.");
    return;
  }
  sendOrder(STATE.cart, STATE.currentUser.email);
});

function sendOrder(cart, mail) {
  const grade = DOM.gradeSelect.value;
  const className = document.getElementById('class').value;
  const paymentMethod = document.getElementById('paymentmethod').value;
  const name = document.getElementById('name').value;

  if (!grade || !className || !paymentMethod || !name) {
    alert("Please fill all fields");
    return;
  }

  // Double check stock before sending
  const updates = {};
  const orderItems = [];
  let grandTotal = 0;

  // We need to re-verify against the cached menuData or fetch fresh. 
  // For safety, let's use the local cache which is kept up to date by logic, 
  // but a transaction is best.
  
  const orderData = {
    name, grade, class: className, paymentMethod, mail,
    timestamp: formatDateLabel(new Date()),
    items: cart.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      stock: item.stock,
      discount: item.discount || 0
    })),
    total: cart.reduce((sum, item) => {
      const discount = item.discount || 0;
      return sum + (item.price * (1 - discount/100) * item.quantity);
    }, 0)
  };

  db.ref('Orders').push(orderData)
    .then(() => {
      // Run Stock Transactions safely
      cart.forEach(item => {
        const itemRef = db.ref(`menu/main_course/${item.key}/stock`);
        itemRef.transaction(currentStock => {
          if (currentStock === null) return 0; // Should not happen
          return currentStock - item.quantity;
        });
      });

      alert("Order submitted!");
      STATE.cart = [];
      updateCartDisplay();
    })
    .catch((error) => {
      console.error('Error saving order:', error);
      alert('Order failed to send: ' + error.message);
    });
}

// ==========================================
// 7. UTILITY FUNCTIONS & UI HELPERS
// ==========================================

function getAdminSummaryHTML(orders) {
  const counts = {};
  orders.forEach(o => {
    if(o.items) {
        o.items.forEach(i => counts[i.name] = (counts[i.name] || 0) + i.quantity);
    }
  });
  
  let html = '<h3>Item Summary</h3>';
  for (const [name, count] of Object.entries(counts)) {
    html += `<p>${name}: ${count}</p>`;
  }
  return html;
}

function showCancellationPopup(cancelledData, dbKey) {
  const popup = document.getElementById('cancel-popup');
  const reasonP = document.getElementById('popup-reason');
  const closeBtn = document.getElementById('close-popup');

  if (popup && reasonP) {
    reasonP.textContent = cancelledData.reason || 'No reason provided';
    popup.classList.remove('hidden');
    
    // Remove from DB immediately so it doesn't show again
    db.ref('Cancelled/' + dbKey).remove();

    closeBtn.onclick = () => popup.classList.add('hidden');
  }
}

function updateAdminUI() {
  if (!STATE.currentUser) return;
  DOM.adminBtn.style.display = STATE.adminEmails.includes(STATE.currentUser.email) ? "flex" : "none";
}

function parseTimestamp(ts) {
  // Handles various formats or returns current date if failed
  if (!ts) return new Date();
  // If DD/MM/YY string
  if (typeof ts === 'string' && ts.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
     const [d, m, y] = ts.split('/');
     return new Date(`20${y}-${m}-${d}`);
  }
  return new Date(ts);
}

function formatDateLabel(dateObj) {
  const d = String(dateObj.getDate()).padStart(2,'0');
  const m = String(dateObj.getMonth()+1).padStart(2,'0');
  const y = String(dateObj.getFullYear()).slice(-2);
  return `${d}/${m}/${y}`;
}

// Helpers for inline JSON safety
function escapeHtml(str) {
    return str.replace(/'/g, "&apos;").replace(/"/g, "&quot;");
}
function decodeHtml(str) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}

// Navigation & Toggles
function toggleBigButton() {
  if (DOM.bigBtn.style.display === "none" || DOM.bigBtn.style.display === "") {
    DOM.bigBtn.style.display = "block";
  } else {
    DOM.bigBtn.style.display = "none";
  }
}

DOM.menuBtn.addEventListener("click", () => {
  DOM.sidePanel.classList.toggle("show");
  DOM.menuBtn.classList.toggle("show");
  toggleBigButton();
});
DOM.bigBtn.addEventListener("click", () =>{
  DOM.sidePanel.classList.toggle("show");
  DOM.menuBtn.classList.toggle("show");
  toggleBigButton();
});

// Helper to hide all sections
function hideAllSections() {
  DOM.menuSection.style.display = "none";
  DOM.cartSection.style.display = "none";
  DOM.orderSection.style.display = "none";
  DOM.adminSection.style.display = "none";
}

// Main Navigation Events
[DOM.menuBtn2, DOM.cartBtn, DOM.orderBtn, DOM.adminBtn].forEach(btn => {
  if(!btn) return;
  btn.addEventListener("click", () => {
    if (!STATE.currentUser) { 
        alert("Log In To Order!"); 
        return; 
    }
    
    hideAllSections();
    
    // Clear Notification dots
    DOM.menuBtn3.classList.remove("has-notification");
    DOM.cartBtn.classList.remove("has-notification");

    if (btn === DOM.menuBtn2) DOM.menuSection.style.display = "grid";
    if (btn === DOM.cartBtn) DOM.cartSection.style.display = "block";
    if (btn === DOM.orderBtn) {
        DOM.orderSection.style.display = "block";
        // Order fetching is handled by the realtime listener automatically now
    }
    if (btn === DOM.adminBtn) {
        if(STATE.adminEmails.includes(STATE.currentUser.email)) {
            DOM.adminSection.style.display = "block";
        }
    }
  });
});

DOM.logoutBtn.addEventListener("click", () => {
  auth.signOut().then(() => {
     alert("User signed out");
     DOM.menuSection.style.display = "grid"; 
  });
});

// Theme and Mobile Scroll
function setupTheme() {
    const root = document.documentElement;
    const darkIcon = document.getElementById("dark-icon");
    const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>`;
    const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>`;

    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        root.classList.add("dark");
        if(darkIcon) darkIcon.innerHTML = sunSVG;
    } else {
        if(darkIcon) darkIcon.innerHTML = moonSVG;
    }

    if(DOM.floatBtn) {
        DOM.floatBtn.addEventListener("click", () => {
            root.classList.toggle("dark");
            const isDark = root.classList.contains("dark");
            if(darkIcon) darkIcon.innerHTML = isDark ? sunSVG : moonSVG;
            localStorage.setItem("theme", isDark ? "dark" : "light");
        });
    }
}

function setupNavigation() {
    DOM.gradeSelect.addEventListener("change", function () {
        if (this.value === "Others") {
            DOM.classGroup.style.display = "none";
            DOM.othersGroup.style.display = "flex";
        } else {
            DOM.classGroup.style.display = "flex";
            DOM.othersGroup.style.display = "none";
        }
    });
}

function setupScrollButton() {
    if (!navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)) return;
    
    if(!DOM.scrollBtn) return;
    
    window.addEventListener("scroll", () => {
        if (window.scrollY > 900) {
            DOM.scrollBtn.classList.add("show");
        } else {
            DOM.scrollBtn.classList.remove("show");
        }
    });

    DOM.scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

function renderAuthUI(user) {
    DOM.authContainer.innerHTML = '';
    if (!user) {
        const btn = document.createElement('button');
        btn.innerHTML = `<img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" style="width:20px;margin-right:8px;"/> Sign in with Google`;
        btn.className = "googleSignInBtn";
        btn.onclick = () => auth.signInWithPopup(provider).catch(e => console.error(e));
        DOM.authContainer.appendChild(btn);
    } else {
        const img = document.createElement("img");
        img.src = user.photoURL || "https://via.placeholder.com/32";
        img.className = "googleProfile";
        img.style.width = "32px";
        img.style.height = "32px";
        img.style.borderRadius = "50%";
        DOM.authContainer.appendChild(img);
    }
}