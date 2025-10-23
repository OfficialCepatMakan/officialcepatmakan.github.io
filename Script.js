const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const menuBtn = document.getElementById("menu-button");
const sidePanel = document.getElementById("side-panel");
const menuSection = document.getElementById("menu-section");
const cartSection = document.getElementById("cart-section");
const adminSection = document.getElementById("admin-section")
const menuBtn2 = document.getElementById("btn-menu");
const orderBtn = document.getElementById("btn-order")
const cartBtn = document.getElementById("btn-cart");
const adminBtn = document.getElementById("btn-admin")
const orderSection = document.getElementById("orders-section")
const floatBtn = document.getElementById("dark-toggle")
const gradeSelect = document.getElementById("grade");
const classGroup = document.getElementById("class-group");
const othersGroup = document.getElementById("others-group");
const tutorial = document.getElementById("btn-tutorial")
const menuBtn3 = document.querySelector(".menu-btn");
const btnCart = document.getElementById("btn-cart");
let cart = []
loadMenu("all");

gradeSelect.addEventListener("change", function () {
  if (this.value === "Others") {
    classGroup.style.display = "none";
    othersGroup.style.display = "flex";
  } else {
    classGroup.style.display = "flex";
    othersGroup.style.display = "none";
  }
});

const sections = {
  home: [document.getElementById("home-section")],
  cart: [document.getElementById("cart-section")],
  orders: [document.getElementById("orders-section")],
  admin: [document.getElementById("admin-section")]
};

menuBtn.addEventListener("click", () => {
  sidePanel.classList.toggle("show");
  menuBtn.classList.toggle("show");
});

function hideAllSections() {
  for (let key in sections) {
    sections[key].forEach(el => el.style.display = "none");
  }
}

function renderAdminItemSummary(snapshot, ordersList) {
  const itemCounts = {};

  snapshot.forEach(childSnapshot => {
    const order = childSnapshot.val();
    order.items.forEach(item => {
      if (!itemCounts[item.name]) itemCounts[item.name] = 0;
      itemCounts[item.name] += item.quantity;
    });
  });

  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'admin-summary';
  summaryDiv.innerHTML = '<h3>Item Summary</h3>';

  for (const [item, count] of Object.entries(itemCounts)) {
    summaryDiv.innerHTML += `<p>${item}: ${count}</p>`;
  }

  ordersList.appendChild(summaryDiv);
}

// Grab all filter buttons
const filterBtns = document.querySelectorAll(".filter-btn");

filterBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    // remove active from all
    filterBtns.forEach(b => b.classList.remove("active"));
    // add active to the clicked one
    btn.classList.add("active");
    const filter = btn.getAttribute("data-filter");
    loadMenu(filter);
  });
});

sidePanel.querySelectorAll(".nav-buttons button").forEach(btn => {
  btn.addEventListener("click", () => {
    const section = btn.getAttribute("data-section");
    menuBtn3.classList.remove("has-notification");
    btnCart.classList.remove("has-notification");
    console.log("removing notif");

    hideAllSections();
    console.log(section, sections[section]);
    sections[section].forEach(el => el.style.display = "block"); // ✅ works for grouped ones
  });
});

document.addEventListener("DOMContentLoaded", () => {
    const authContainer = document.getElementById("authContainer");
    let adminEmails = [];
    let courierEmails = [];

    fetch('Admins.json')
      .then(response => response.json())
      .then(data => {
        adminEmails = data.adminEmails;
        console.log("Loaded admin emails:", adminEmails);
  
      })
      .catch(error => {
        console.error("Failed to load admins.json:", error);
      });

    fetch('Courier.json')
      .then(response => response.json())
      .then(data => {
        courierEmails = data.courierEmails;
        console.log("Loaded courier emails:", courierEmails);
  
      })
      .catch(error => {
        console.error("Failed to load courier.json:", error);
      });

      // Helper: parse many timestamp formats into a Date (or null)
      function parseTimestampToDate(ts) {
        if (ts == null) return null;
      
        // numeric (ms)
        if (typeof ts === 'number' || /^\d+$/.test(String(ts))) {
          const n = Number(ts);
          const d = new Date(n);
          if (!isNaN(d.getTime())) return d;
        }
      
        if (typeof ts === 'string') {
          const s = ts.trim();
        
          // YYYY-MM-DD or YYYY-MM-DDTHH:MM...
          if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
            const d = new Date(s.length === 10 ? s + 'T00:00:00' : s);
            if (!isNaN(d.getTime())) return d;
          }
        
          // DD/MM/YY or DD/MM/YYYY
          if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(s)) {
            const parts = s.split('/');
            const dd = parseInt(parts[0], 10);
            const mm = parseInt(parts[1], 10) - 1;
            let yy = parts[2];
            if (yy.length === 2) {
              yy = Number(yy) < 50 ? 2000 + Number(yy) : 1900 + Number(yy);
            } else {
              yy = Number(yy);
            }
            const d = new Date(yy, mm, dd);
            if (!isNaN(d.getTime())) return d;
          }
        
          // try Date fallback parse
          const d = new Date(s);
          if (!isNaN(d.getTime())) return d;
        }
      
        return null;
      }
      
      // Helper: returns ddmmyy string (e.g. "240925"), or "Unknown"
      function formatDateLabel(timestamp) {
        const d = parseTimestampToDate(timestamp);
        if (!d) return 'Unknown';
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        return `${dd}/${mm}/${yy}`;
      }
  
      let lastscrollContainer = 0;
      const scrollContainer = document.getElementById('orders-scroll');

      scrollContainer.addEventListener('scroll', () => {
        lastscrollContainer = scrollContainer.scrollTop;
      });
      
      function fetchAndRenderOrders(mail, admins, courier) {
        console.log(lastscrollContainer)
        let scrollpos = lastscrollContainer
        console.log(mail);
        console.log(admins);
        const ordersRef = db.ref('Orders');
        const ordersList = document.getElementById('orders-list');
        if (!ordersList) {
          console.error("No #orders-list element found in DOM");
          return;
        }
        ordersList.innerHTML = ''; // clear existing orders
        const isCourier = Array.isArray(courier) ? courier.includes(mail) : (courier === mail);
      
        ordersRef.once('value', (snapshot) => {
          if (!snapshot.exists()) {
            ordersList.innerHTML = '<p>No orders found.</p>';
            return;
          }
        
          // Group orders by dateKey (ddmmyy)
          const grouped = {};          // dateKey -> array of order objects
          const dateMap = {};          // dateKey -> Date object (for sorting)
        
          snapshot.forEach((childSnapshot) => {
            const order = childSnapshot.val();
            const orderId = childSnapshot.key;
          
            // only include orders the user should see
            if (!(order && (order.mail === mail || admins.includes(mail) || isCourier))) {
              return;
            }
          
            const dObj = parseTimestampToDate(order.timestamp);
            const dateKey = formatDateLabel(order.timestamp);
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push({ order, orderId, dateObj: dObj });
            dateMap[dateKey] = dObj || new Date(0); // fallback for sorting
          });
        
          // sort date keys newest -> oldest (change to ascending by flipping)
          const dateKeys = Object.keys(grouped).sort((a, b) => {
            return (dateMap[b] ? dateMap[b].getTime() : 0) - (dateMap[a] ? dateMap[a].getTime() : 0);
          });
        
          // Render grouped orders: date header (centered) then that date's cards stacked vertically
          dateKeys.forEach((dateKey) => {
            // date header (layer)
            const dateHeader = document.createElement('div');
            dateHeader.className = 'date-divider';
            dateHeader.textContent = dateKey;
            ordersList.appendChild(dateHeader);
          
            // render orders for this date
            grouped[dateKey].forEach(({ order, orderId }) => {
              // Build items HTML
              let itemsHTML = '';
              if (Array.isArray(order.items)) {
                order.items.forEach((item) => {
                  itemsHTML += `<p>${item.name} x${item.quantity} — Rp${(item.price * item.quantity).toLocaleString()}</p>`;
                });
              }
            
              // build courier / admin pieces
              let deleteButtonHTML = '';
              let EmailP = '';
              if (admins.includes(mail)) {
                deleteButtonHTML = `
                  <button class="remove-order" data-id="${orderId}">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                         stroke-width="1.5" stroke="currentColor" style="width:16px; height:16px;">
                      <path stroke-linecap="round" stroke-linejoin="round"
                        d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 
                           1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 
                           1-2.244 2.077H8.084a2.25 2.25 0 0 
                           1-2.244-2.077L4.772 5.79m14.456 
                           0a48.108 48.108 0 0 0-3.478-.397m-12 
                           .562c.34-.059.68-.114 1.022-.165m0 
                           0a48.11 48.11 0 0 1 3.478-.397m7.5 
                           0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 
                           51.964 0 0 0-3.32 0c-1.18.037-2.09 
                           1.022-2.09 2.201v.916m7.5 0a48.667 
                           48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>`;
                EmailP = `<p><strong>Email:</strong> ${order.mail}</p>`;
              }
            
              const taken = order.courier && order.courier !== "";
              // isMine uses mail, not the courier array
              const isMine = order.courier === mail;
            
              let courierHTML = '';
              if (isCourier) {
                courierHTML = `
                  <label>
                    <input type="checkbox" class="take-order" data-id="${orderId}"
                      ${isMine ? 'checked' : ''} ${taken && !isMine ? 'disabled' : ''}>
                    ${isMine ? 'You took this order' : taken ? 'Taken by another courier' : 'Take this order'}
                  </label>
                `;
              }
              if (taken && (admins.includes(mail) || isCourier)) {
                courierHTML += `<p><strong>Courier:</strong> ${order.courier}</p>`;
              }
            
              const orderDiv = document.createElement('div');
              orderDiv.className = 'order-item';
              // keep your original card structure and style
              orderDiv.innerHTML = `
                <h4>${order.name} (${order.grade}-${order.class})</h4>
                <p><strong>Payment:</strong> ${order.paymentMethod}</p>
                <div class="order-items">${itemsHTML}</div>
                <p><strong>Total:</strong> Rp${(order.total || 0).toLocaleString()}</p>
                <p><strong>Timestamp:</strong> ${order.timestamp}</p>
                ${EmailP}
                ${courierHTML}
                ${deleteButtonHTML}
              `;
            
              // append card to DOM
              ordersList.appendChild(orderDiv);
            
              // attach delete listener (if admin)
              if (admins.includes(mail)) {
                const deleteBtn = orderDiv.querySelector('.remove-order');
                if (deleteBtn) {
                  deleteBtn.addEventListener('click', () => {
                    if (!confirm("Are you sure you want to delete this order?")) return;
                    db.ref('Orders/' + orderId).remove()
                      .then(() => {
                        alert("Order deleted successfully.");
                        fetchAndRenderOrders(mail, admins, courier); // refresh
                      })
                      .catch((error) => {
                        console.error("Error deleting order:", error);
                        alert("Failed to delete order.");
                      });
                  });
                }
              }
            
              // attach courier checkbox listener
              if (isCourier) {
                const takeOrderCheckbox = orderDiv.querySelector('.take-order');
                if (takeOrderCheckbox) {
                  takeOrderCheckbox.addEventListener('change', (e) => {
                    const checked = e.target.checked;
                    const id = e.target.dataset.id;
                    if (checked) {
                      db.ref('Orders/' + id).update({ courier: mail })
                        .then(() => {
                          alert("You took the order.");
                          fetchAndRenderOrders(mail, admins, courier);
                        })
                        .catch(err => console.error(err));
                    } else {
                      db.ref('Orders/' + id).update({ courier: "" })
                        .then(() => {
                          alert("You released the order.");
                          fetchAndRenderOrders(mail, admins, courier);
                        })
                        .catch(err => console.error(err));
                    }
                  });
                }
              }
            }); // end each order in group
          }); // end each dateKey
        
          // admin summary
          if (admins.includes(mail)) {
            renderAdminItemSummary(snapshot, ordersList);
          }
          const container = document.getElementById('orders-scroll');
          console.log(scrollpos)
          container.scrollTop = scrollpos;
        });
      }

    document.getElementById('order-btn').addEventListener('click', function () {
      if (cart.length === 0) {
        alert("Your cart is empty!");
        return;
      }

      const user = firebase.auth().currentUser;

      if (user) {
        console.log("Signed in user:", user);
        console.log("user.email = ", user.email);
        SendOrder(cart, user.email); // ✅ email is now defined
      } else {
        alert("You must be logged in to order.");
      }
    });

    const root = document.documentElement;
    const darkToggle = document.getElementById("dark-toggle");
    const darkIcon = document.getElementById("dark-icon");
    const moonSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
      </svg>`;

    const sunSVG = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
      </svg>`;

    // Load saved theme
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
        root.classList.add("dark");
        darkIcon.innerHTML = sunSVG;
    } else {
        darkIcon.innerHTML = sunSVG;
        root.classList.toggle("dark");
    }

    darkToggle.addEventListener("click", () => {
        const isDark = root.classList.contains("dark");

        darkIcon.innerHTML = isDark ? sunSVG : moonSVG;
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });

    fetch('Admins.json')
      .then(res => res.json())
      .then(data => {
        adminEmails = data.adminEmails;
        console.log("Loaded admin emails:", adminEmails);
      
        auth.onAuthStateChanged(user => {
          if (!user) return console.error("No user signed in yet");
          console.log("User:", user.email);
        
          menuBtn2.addEventListener("click", () => {
            menuSection.style.display = "grid";
            cartSection.style.display = "none";
            orderSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          cartBtn.addEventListener("click", () => {
            menuSection.style.display = "none";
            cartSection.style.display = "block";
            orderSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          orderBtn.addEventListener("click", () => {
            orderSection.style.display = "block";
            fetchAndRenderOrders(user.email, adminEmails, courierEmails);
            menuSection.style.display = "none";
            cartSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          if (adminEmails.includes(user.email)) {
            adminBtn.style.display = "flex"; // Show the button if user is admin
          
            adminBtn.addEventListener("click", () => {
              console.log("showing admin");
              adminSection.style.display = "block";
              orderSection.style.display = "none";
              menuSection.style.display = "none";
              cartSection.style.display = "none";
              console.log("opening admin");
            });
          }
        });
      })
      .catch(err => console.error("Failed to load admins.json:", err));
    
    auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("User signed in:", user.displayName);

        // Clear container first
        authContainer.innerHTML = "";

        // Create profile pic element
        const profilePic = document.createElement("img");
        profilePic.src = user.photoURL || "https://via.placeholder.com/32";
        profilePic.alt = user.displayName;
        profilePic.title = user.displayName;
        profilePic.style.width = "32px";
        profilePic.style.height = "32px";
        profilePic.style.borderRadius = "50%";
        profilePic.style.objectFit = "cover";
        profilePic.style.cursor = "pointer";
        profilePic.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
        profilePic.classList.add("googleProfile");

        authContainer.appendChild(profilePic);

      } else {
        // User not signed in — restore the button
        authContainer.innerHTML = `
          <button class="googleSignInBtn" id="googleSignInBtn">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
            Sign in with Google
          </button>
        `;

        // Re-attach event listener on the new button
        const signInBtn = document.getElementById("googleSignInBtn");
        signInBtn.addEventListener("click", () => {
          auth.signInWithPopup(provider)
            .then((result) => {
              console.log("Signed in as", result.user.displayName);
              user = result.user.displayName
            })
            .catch((error) => {
              console.error("Error during sign-in:", error.message);
            });
        });
      }
    });
  });  
  
  function loadMenu(filter) {
    const mainCourseRef = db.ref('menu/main_course');

    mainCourseRef.once('value', (snapshot) => {
      const items = snapshot.val();
      const menuGrid = document.querySelector('.menu-grid');
      let count = 0;

      menuGrid.innerHTML = ''; // Clear existing items

      for (let key in items) {
        const item = items[key];

        // Check filter (if "all", show everything)
        if (filter === "all" || item.filter === filter) {
          const menuItem = createMenuItem(key, item);
          menuGrid.appendChild(menuItem);
          count++;
        }
      }

      document.querySelector('.item-count').textContent = `${count} items`;
    });
  }

  function createMenuItem(key, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';

    menuItem.innerHTML = `
      <div class="item-image"><img src="${item.image}"></img></div>
      <div class="websss"><img src="Webs.png" style="width: 150px; height: auto;"></img></div>
      <div class="item-content">
        <div class="item-header">
          <h4 class="item-name">${item.name}</h4>
          <span class="item-price">Rp ${item.price.toLocaleString('id-ID')}</span>
        </div>
        <p class="item-description">${item.description}</p>
        <p class="item-stock">Stock: ${item.stock}</p>
        <div class="item-actions">
          <div class="quantity-controls">
            <button class="qty-btn" disabled>−</button>
            <span>0</span>
            <button class="qty-btn">+</button>
          </div>
          <button class="add-btn">Add to Cart</button>
        </div>
      </div>
    `;

    setupQuantityLogic(menuItem, key, item, item.stock);
    return menuItem;
  }
  function updateCartDisplay() {
    const cartCount = document.querySelector('.cart-count');
    const cartItemsContainer = document.querySelector('.cart-items');
    const emptyCartMessage = document.querySelector('.empty-cart');
    const totalPriceElement = document.querySelector('.total-section .total-price');

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
      cartItemsContainer.style.display = 'none';
      emptyCartMessage.style.display = 'block';
      cartCount.textContent = '0';
      document.getElementById("order-btn").disabled = true;
      if (totalPriceElement) totalPriceElement.textContent = 'Rp 0';
      return;
    } else {
      document.getElementById("order-btn").disabled = false;
    }

    emptyCartMessage.style.display = 'none';
    cartItemsContainer.style.display = 'block';

    let totalItems = 0;
    let totalPrice = 0;

    cart.forEach((item) => {
      totalItems += item.quantity;
      totalPrice += item.price * item.quantity;
      console.log(item)

      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';

      cartItem.innerHTML = `
        <div class="item-info">
          <h4>${item.name}</h4>
          <p>Rp ${item.price.toLocaleString('id-ID')} × ${item.quantity}</p>
        </div>
        <div class="item-controls">
          <button class="qty-btn minus">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn plus">+</button>
        </div>
        <span>Rp ${(item.price * item.quantity).toLocaleString('id-ID')}</span>
      `;

      const minusBtn = cartItem.querySelector('.qty-btn.minus');
      const plusBtn = cartItem.querySelector('.qty-btn.plus');

      minusBtn.addEventListener('click', () => {
        item.quantity--;
        if (item.quantity <= 0) {
          cart = cart.filter(i => i.key !== item.key);
        }
        updateCartDisplay();
      });
      console.log(item.stock)
      plusBtn.addEventListener('click', () => {
        if (item.quantity < item.stock){
          item.quantity++;
          updateCartDisplay();
        } else {
          return;
          alert("This is the maximum stock!");
        }
      });

      cartItemsContainer.appendChild(cartItem);
    });

    cartCount.textContent = totalItems;

    // ✅ Update total price in .total-section
    if (totalPriceElement) {
      totalPriceElement.textContent = `Rp ${totalPrice.toLocaleString('id-ID')}`;
    }
  }

  function SendOrder(cart, mail) {
    const grade = document.getElementById('grade').value || '';
    const className = document.getElementById('class').value || '';
    const paymentMethod = document.getElementById('paymentmethod').value || '';
    const name = document.getElementById('name').value || '';

    // Validation
    if (!grade.trim() || !className.trim() || !paymentMethod.trim() || !name.trim()) {
      alert("Please fill all fields");
      return;
    }

    const stockRef = db.ref('menu/main_course');
    const ordersRef = db.ref('Orders');

    stockRef.once('value').then(snapshot => {
      const menuData = snapshot.val();
      console.log("Menu data:", menuData);

      // ✅ Validate stock
      for (const item of cart) {
        const itemData = menuData[item.key];
        console.log(itemData)
        console.log(item.key)
        if (!itemData) {
          alert(`Item ${item.key} not found in database`);
          return;
        }
        if (item.quantity > itemData.stock) {
          alert(`Not enough stock for ${item.name}`);
          return;
        }
      }

      // ✅ Build order object
      const orderData = {
        name,
        grade,
        class: className,
        paymentMethod,
        items: cart,
        total: cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
        mail,
        timestamp: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`
      };

      // ✅ Push order
      ordersRef.push(orderData)
        .then(() => {
          console.log('Order saved successfully.');
          alert("Order submitted!");

          // 🔄 Update stock (transaction prevents race conditions)
          cart.forEach(item => {
            const itemRef = db.ref(`menu/main_course/${item.key}/stock`);
            itemRef.transaction(currentStock => {
              if (currentStock === null) return 0;
              return currentStock - item.quantity;
            });
          });

          // 🔁 Clear cart
          cart.length = 0;
          updateCartDisplay();
        })
        .catch((error) => {
          console.error('Error saving order:', error);
          alert('Something went wrong, order not sent!');
        });
    });
  }

  function setupQuantityLogic(menuItem, key, item, stock) {
    const qtyBtns = menuItem.querySelectorAll('.qty-btn');
    const qtyDisplay = menuItem.querySelector('.quantity-controls span');
    const addToCartBtn = menuItem.querySelector('.add-btn');

    let quantity = 0;

    qtyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.textContent === '+') {
          if (quantity < stock){
            quantity++;
          } else {
            alert("This is the maximum stock!");
            return;
          }
        } else if (btn.textContent === '−' && quantity > 0) {
          quantity--;
        }

        qtyDisplay.textContent = quantity;
        qtyBtns[0].disabled = quantity === 0;
      });
    });

    addToCartBtn.addEventListener('click', () => {
      if (quantity <= 0) {
        quantity = 1;
      }
      if (quantity > stock) {
        alert("This is the maximum stock!");
        return
      }   
      const existing = cart.find(c => c.key === key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        console.log(key)
        cart.push({
          key: key,
          name: item.name,
          price: item.price,
          quantity: quantity,
          stock: item.stock
        });
        alert("Item has been added to cart, press the 3 dots button to open cart")
        document.getElementById("btn-cart").classList.add("has-notification");
        menuBtn3.classList.add("has-notification");
      }

      // Reset
      quantity = 0;
      qtyDisplay.textContent = '0';
      qtyBtns[0].disabled = true;

      updateCartDisplay();
    });
  }

  function spawnBats(numBats) {
    const container = document.getElementById("bat-container");

    // Clear old bats
    container.innerHTML = "";

    for (let i = 0; i < numBats; i++) {
      const bat = document.createElement("img");
      bat.src = "bat.png";
      bat.className = "bat";

      // randomize positions and flight path
      const startY = Math.random() * window.innerHeight * 0.8 + "px";
      const endY = Math.random() * window.innerHeight * 0.8 + "px";
      const startX = "-150px";
      const endX = "110vw";
      const midX = Math.random() * window.innerWidth * 0.5 + "px";
      const midY = Math.random() * window.innerHeight * 0.5 + "px";
      const scale = 0.5 + Math.random() * 1.5;

      // randomize direction (flip)
      const flip = Math.random() < 0.5;

      bat.style.setProperty("--start-x", startX);
      bat.style.setProperty("--start-y", startY);
      bat.style.setProperty("--end-x", endX);
      bat.style.setProperty("--end-y", endY);
      bat.style.setProperty("--mid-x", midX);
      bat.style.setProperty("--mid-y", midY);
      bat.style.setProperty("--scale", scale);

      if (flip) bat.style.transform = "scaleX(-1)";

      const duration = 2 + Math.random() * 2; // 2–4 seconds
      const delay = Math.random() * 0.8; // 0–0.8s delay

      bat.style.animation = `batFly ${duration}s ease-in-out ${delay}s forwards`;
      container.appendChild(bat);
    }
  }

  window.addEventListener("load", () => spawnBats(100));

  const ghostContainer = document.getElementById('ghost-container');
  const ghostImg = "ghost.png"; // use your ghost image here

  function spawnGhost() {
    const ghost = document.createElement("img");
    ghost.src = "ghost.png";
    ghost.classList.add("ghost");

    // random start and end positions
    const startX = Math.random() * window.innerWidth + "px";
    const startY = Math.random() * window.innerHeight + "px";
    const endX = Math.random() * window.innerWidth + "px";
    const endY = Math.random() * window.innerHeight + "px";

    // determine direction
    const dir = parseFloat(startX) - parseFloat(endX) > 0 ? 1 : -1;

    // apply variables
    ghost.style.setProperty("--start-x", startX);
    ghost.style.setProperty("--start-y", startY);
    ghost.style.setProperty("--end-x", endX);
    ghost.style.setProperty("--end-y", endY);
    ghost.style.setProperty("--dir", dir);

    ghost.style.animation = `floatGhost ${5 + Math.random() * 5}s linear forwards`;
    document.getElementById("ghost-container").appendChild(ghost);
  }

  // spawn a new ghost every 2 seconds
  setInterval(spawnGhost, Math.floor(Math.random() * (10000 - 5000 + 1)) + 5000);
  console.log("🚀 Menu form script loaded");
  
  form.addEventListener('submit', e => {
    e.preventDefault();
    console.log("📝 Form submitted");
  
    const nameInput = document.getElementById('name').value.trim();
    const priceInput = document.getElementById('price').value.trim();
    const descriptionInput = document.getElementById('description').value.trim();
    const imageInput = document.getElementById('image').value.trim();
    const stockInput = document.getElementById('stock').value.trim();
    const stock = stockInput ? parseInt(stockInput) : null;
  
    console.log("📦 Form values:", {
      nameInput,
      priceInput,
      descriptionInput,
      imageInput,
      stock
    });
  
    if (!nameInput) {
      console.warn("⚠️ No name entered");
      alert('You must enter the name of the item!');
      return;
    }
  
    const mainCourseRef = db.ref('menu/main_course');
    console.log("🔗 Fetching existing items...");
  
    mainCourseRef.once('value').then(snapshot => {
      const items = snapshot.val() || {};
      console.log("📁 Existing items in DB:", items);
    
      let foundKey = null;
    
      // Check if item with same name exists
      for (let key in items) {
        if (items[key].name.toLowerCase() === nameInput.toLowerCase()) {
          foundKey = key;
          break;
        }
      }
    
      if (foundKey) {
        console.log(`🛠️ Item "${nameInput}" already exists, updating...`);
        const existingItem = items[foundKey];
      
        const updatedItem = {
          name: nameInput || existingItem.name,
          price: priceInput ? parseInt(priceInput, 10) : existingItem.price,
          description: descriptionInput || existingItem.description,
          image: imageInput || existingItem.image,
          stock: stock !== null ? stock : existingItem.stock
        };
      
        console.log("🔧 Updated item data:", updatedItem);
      
        db.ref('menu/main_course/' + foundKey).update(updatedItem)
          .then(() => {
            console.log(`✅ Updated item "${nameInput}" successfully`);
            alert(`Updated item "${nameInput}" successfully!`);
            form.reset();
            loadMenu();
          })
          .catch(err => {
            console.error("💥 Error updating item:", err);
            alert('Error updating item: ' + err.message);
          });
        
      } else {
        console.log(`🆕 Item "${nameInput}" not found, creating new one...`);
      
        if (!priceInput || !descriptionInput || !imageInput || stock === null) {
          console.warn("⚠️ Missing fields for new item");
          alert('New item must have all fields filled!');
          return;
        }
      
        const filter = document.getElementById("filterdropdown").value;
        const newItemKey = mainCourseRef.push().key;
      
        const newItem = {
          name: nameInput,
          price: parseInt(priceInput, 10),
          description: descriptionInput,
          image: imageInput,
          stock,
          filter
        };
      
        console.log("🆕 New item data:", newItem);
      
        const updates = {};
        updates['/menu/main_course/' + newItemKey] = newItem;
      
        db.ref().update(updates)
          .then(() => {
            console.log(`✅ Added new item "${nameInput}" to DB`);
            alert('New menu item added!');
            form.reset();
            loadMenu();
          })
          .catch(err => {
            console.error("💥 Error adding new item:", err);
            alert('Error: ' + err.message);
          });
      }
    }).catch(err => {
      console.error("💣 Failed to fetch existing items:", err);
    });
  });
