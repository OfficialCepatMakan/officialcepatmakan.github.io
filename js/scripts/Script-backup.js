const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
const menuBtn = document.getElementById("menu-button");
const sidePanel = document.getElementById("side-panel");
const menuSection = document.getElementById("menu-section");
const cartSection = document.getElementById("cart-section");
const menuBtn2 = document.getElementById("btn-menu");
const orderBtn = document.getElementById("btn-order")
const cartBtn = document.getElementById("btn-cart");
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
  orders: [document.getElementById("orders-section")]
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
  function formatDateLabel(timestamp) {
    let date;

    if (!timestamp) return "Unknown";

    // Case 1: already a number (Firebase usually stores ms timestamps)
    if (!isNaN(timestamp)) {
      date = new Date(Number(timestamp));
    }
    // Case 2: format YYYY-MM-DD
    else if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
      date = new Date(timestamp + "T00:00:00");
    }
    // Case 3: format DD/MM/YY
      else if (/^\d{2}\/\d{2}\/\d{2}$/.test(timestamp)) {
      const [dd, mm, yy] = timestamp.split("/");
      date = new Date(`20${yy}-${mm}-${dd}T00:00:00`);
    }
    // Fallback
    else {
      return "Unknown";
    }

    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yy = String(date.getFullYear()).slice(-2);
    return `${dd}${mm}${yy}`;
  }



  function fetchAndRenderOrders(mail, admins, courier) {
    console.log(mail);
    console.log(admins);
    const ordersRef = db.ref('Orders');
    const ordersList = document.getElementById('orders-list');
    const scrollPos = ordersList.scrollTop;
    console.log(scrollPos)
    ordersList.innerHTML = ''; // clear existing orders
    const isCourier = courier.includes(mail);
  
    ordersRef.once('value', (snapshot) => {
      if (!snapshot.exists()) {
        ordersList.innerHTML = '<p>No orders found.</p>';
        return;
      }
      const groups = {};
      snapshot.forEach((childSnapshot) => {
        const order = childSnapshot.val();
        const orderId = childSnapshot.key;
      
        if (order.mail === mail || admins.includes(mail) || isCourier) {
          console.log(isCourier)
          const orderDiv = document.createElement('div');
          orderDiv.className = 'order-item';
        
          let itemsHTML = '';
          order.items.forEach((item) => {
            itemsHTML += `
              <p>
                ${item.name} x${item.quantity} — Rp${(item.price * item.quantity).toLocaleString()}
              </p>`;
          });
        
          let deleteButtonHTML = '';
          let EmailP = '';
          if (admins.includes(mail)) {
            deleteButtonHTML = `
              <button class="remove-order" id="${orderId}">
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
          let courierHTML = '';
          const taken = order.courier && order.courier !== "";
          if (isCourier) {
            const isMine = order.courier === courier;
          
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
          
          orderDiv.innerHTML = `
            <h4>${order.name} (${order.grade}-${order.class})</h4>
            <p><strong>Payment:</strong> ${order.paymentMethod}</p>
            <p><strong>Items:</strong>${itemsHTML}</p>
            <p><strong>Total:</strong> Rp${order.total.toLocaleString()}</p>
            <p><strong>Timestamp:</strong>${order.timestamp}<p>
            ${EmailP}
            ${courierHTML}
            ${deleteButtonHTML}
          `;
        
          const label = formatDateLabel(order.timestamp);
          if (!groups[label]) groups[label] = [];
          groups[label].push(orderDiv);
        
          // ✅ Attach delete listener if button exists
          if (admins.includes(mail)) {
            const deleteBtn = orderDiv.querySelector('.remove-order');
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
        
          // ✅ Attach courier checkbox logic
          if (isCourier) {
            const takeOrderCheckbox = orderDiv.querySelector('.take-order');
            if (takeOrderCheckbox) {
              takeOrderCheckbox.addEventListener('change', (e) => {
                const checked = e.target.checked;
                const id = e.target.dataset.id;
              
                if (checked) {
                  db.ref('Orders/' + id).update({ courier: mail })
                    .then(() => {
                      console.log(mail)
                      alert("You took the order.");
                      fetchAndRenderOrders(mail, admins, courier);
                    });
                } else {
                  db.ref('Orders/' + id).update({ courier: "" })
                    .then(() => {
                      alert("You released the order.");
                      fetchAndRenderOrders(mail, admins, courier);
                    });
                }
              });
            }
          }
        }
      });
      const ordersList = document.getElementById('orders-list');
      ordersList.innerHTML = '';

      Object.keys(groups).forEach((label) => {
        const section = document.createElement('div');
        section.className = "order-section";

        // ✅ Date header at the top
        const header = document.createElement('div');
        header.className = "date-separator";
        header.textContent = label;
        section.appendChild(header);

        // ✅ Container for that day's orders
        const ordersContainer = document.createElement('div');
        ordersContainer.className = "orders-container";

        groups[label].forEach(div => ordersContainer.appendChild(div));
        section.appendChild(ordersContainer);

        ordersList.appendChild(section);
      });
      ordersList.scrollTop = scrollPos;
      if (admins.includes(mail)){
        renderAdminItemSummary(snapshot, ordersList);
      }
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
        darkIcon.innerHTML = moonSVG;
    }

    darkToggle.addEventListener("click", () => {
        root.classList.toggle("dark");
        const isDark = root.classList.contains("dark");

        darkIcon.innerHTML = isDark ? sunSVG : moonSVG;
        localStorage.setItem("theme", isDark ? "dark" : "light");
    });


    menuBtn2.addEventListener("click", () => {
        menuSection.style.display = "grid";
        cartSection.style.display = "none";
        orderSection.style.display = "none";
      });
      cartBtn.addEventListener("click", () => {
        menuSection.style.display = "none";
        cartSection.style.display = "block";
        orderSection.style.display = "none";
      });
      orderBtn.addEventListener("click", () => {
        orderSection.style.display = "block";

        const user = firebase.auth().currentUser;
        if (user && user.email) {
          fetchAndRenderOrders(user.email, adminEmails, courierEmails);
          setInterval(() => {
            const user = firebase.auth().currentUser;
            fetchAndRenderOrders(user.email, adminEmails, courierEmails);
          }, 5000);
          
        } else {
          console.error("No user signed in");
        }

        menuSection.style.display = "none";
        cartSection.style.display = "none";
      });

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

    function changeQty(i, delta) {
      cart[i].qty += delta;
      if (cart[i].qty < 1) cart.splice(i, 1);
      renderCart();
    }

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







