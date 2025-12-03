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
const logoutbtn = document.getElementById("btn-logout");
let cart = []
let previousOrders = 0;
let firstRun = true;
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
const bigBtn = document.getElementById("big-bg-btn");

function toggleBigButton() {
  if (bigBtn.style.display === "none" || bigBtn.style.display === "") {
    bigBtn.style.display = "block";
  } else {
    bigBtn.style.display = "none";
  }
}

function checkMyCancelledOrders(userEmail, popup, reasonP, closeBtn) {

  db.ref('Cancelled').orderByChild('mail').equalTo(userEmail)
    .once('value')
    .then(snapshot => {
      const cancelled = snapshot.val();
      if (!cancelled) return;

      // pick first cancelled order
      const [cancelId, firstCancel] = Object.entries(cancelled)[0];
      reasonP.textContent = firstCancel.reason || 'No reason provided';
      popup.classList.remove('hidden');

      closeBtn.onclick = () => {
        popup.classList.add('hidden');
      };

      // remove it from DB after showing
      db.ref('Cancelled/' + cancelId).remove()
        .then(() => console.log("Cancelled order removed from DB"))
        .catch(err => console.error("Failed to remove cancelled order:", err));
    })
    .catch(err => console.error(err));
}

function waitForPopupThenCheck(userEmail) {
  const interval = setInterval(() => {
    const popup = document.getElementById('cancel-popup');
    const reasonP = document.getElementById('popup-reason');
    const closeBtn = document.getElementById('close-popup');

    if (!popup || !reasonP || !closeBtn) return; // still not loaded

    clearInterval(interval); // found everything, stop waiting
    checkMyCancelledOrders(userEmail, popup, reasonP, closeBtn); // safe to run
  }, 50);
}

menuBtn.addEventListener("click", () => {
  sidePanel.classList.toggle("show");
  menuBtn.classList.toggle("show");
  toggleBigButton()
});

bigBtn.addEventListener("click", () =>{
  sidePanel.classList.toggle("show");
  menuBtn.classList.toggle("show");
  toggleBigButton()
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
  if (btn.id === "btn-logout") return; // skip logout button

  btn.addEventListener("click", () => {
    const section = btn.getAttribute("data-section");
    menuBtn3.classList.remove("has-notification");
    btnCart.classList.remove("has-notification");

    hideAllSections();
    sections[section].forEach(el => el.style.display = "block");
  });
});


document.addEventListener("DOMContentLoaded", () => {

     if (navigator.userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile/i)){
      const scrollBtn = document.getElementById("scroll-btn");

      window.addEventListener("scroll", () => {
        if (window.scrollY > 900) {
          scrollBtn.classList.add("show");
        } else {
          scrollBtn.classList.remove("show");
        }
      });

      scrollBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    const authContainer = document.getElementById("authContainer");
    let adminEmails = [];
    let courierEmails = [];
    

    fetch('data/Admins.json')
      .then(response => response.json())
      .then(data => {
        adminEmails = data.adminEmails;
        console.log("Loaded admin emails:", adminEmails);
  
      })
      .catch(error => {
        console.error("Failed to load admins.json:", error);
      });

    fetch('data/Courier.json')
      .then(response => response.json())
      .then(data => {
        courierEmails = data.courierEmails;
        console.log("Loaded courier emails:", courierEmails);
  
      })
      .catch(error => {
        console.error("Failed to load courier.json:", error);
      });
    const itemCount = document.querySelector('.item-count');
    const form = document.getElementById('menuForm');

    form.addEventListener('submit', e => {
      e.preventDefault();

      const nameInput = document.getElementById('input-name').value.trim();
      const priceInput = document.getElementById('price').value.trim();
      const descriptionInput = document.getElementById('description').value.trim();
      const imageInput = document.getElementById('image').value.trim();
      const stockInput = document.getElementById('stock').value.trim();
      const stock = stockInput ? parseInt(stockInput) : null;


      if (!nameInput) {
        console.warn("⚠️ No name entered");
        alert('You must enter the name of the item!');
        return;
      }

      const mainCourseRef = db.ref('menu/main_course');

      mainCourseRef.once('value').then(snapshot => {
        const items = snapshot.val() || {};

        let foundKey = null;

        // Check if item with same name exists
        for (let key in items) {
          if (items[key].name.toLowerCase() === nameInput.toLowerCase()) {
            foundKey = key;
            break;
          }
        }

        if (foundKey) {
          const existingItem = items[foundKey];

          const updatedItem = {
            name: nameInput || existingItem.name,
            price: priceInput ? parseInt(priceInput, 10) : existingItem.price,
            description: descriptionInput || existingItem.description,
            image: imageInput || existingItem.image,
            stock: stock !== null ? stock : existingItem.stock
          };


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


          const updates = {};
          updates['/menu/main_course/' + newItemKey] = newItem;

          db.ref().update(updates)
            .then(() => {
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
        let scrollpos = lastscrollContainer
        let currentOrders = 0;
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
            currentorder =+ 1
            const order = childSnapshot.val();
            const orderId = childSnapshot.key;
          
            // only include orders the user should see
            if (!(order && (order.mail === mail || admins.includes(mail) || isCourier))) {
              return;
            }
            if (order && (order.mail === mail || admins.includes(mail) || courier.includes(mail))) {
              currentOrders += 1;
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
            
              // attach admin buttons (delete + cancel)
              if (admins.includes(mail)) {
                // Create a container for both buttons
                const adminButtons = document.createElement('div');
                adminButtons.className = 'admin-buttons';
              
                // DELETE button (already in HTML)
                const deleteBtn = orderDiv.querySelector('.remove-order');
              
                // CANCEL button
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'cancel-order';
                cancelBtn.textContent = 'Cancel';
              
                // Append them into the container
                if (deleteBtn) adminButtons.appendChild(deleteBtn);
                adminButtons.appendChild(cancelBtn);
              
                // Append container to the card
                orderDiv.appendChild(adminButtons);
              
                // DELETE logic
                if (deleteBtn) {
                  deleteBtn.addEventListener('click', () => {
                    if (!confirm("Are you sure you want to delete this order?")) return;
                  
                    db.ref('Orders/' + orderId).remove()
                      .then(() => {
                        alert("Order deleted successfully.");
                        fetchAndRenderOrders(mail, admins, courier);
                      })
                      .catch((error) => {
                        console.error("Error deleting order:", error);
                        alert("Failed to delete order.");
                      });
                  });
                }
              
                if (cancelBtn) {
                  cancelBtn.addEventListener('click', () => {
                    if (!confirm("Are you sure you want to cancel this order?")) return;
                  
                    const reason = prompt("Why are you cancelling this order?");
                    if (!reason || reason.trim() === "") {
                      alert("Cancellation aborted. Reason required.");
                      return;
                    }
                  
                    const orderData = { 
                      ...order, 
                      cancelledBy: mail,
                      cancelledAt: Date.now(),
                      reason: reason.trim()
                    };
                  
                    db.ref('Cancelled/' + orderId).set(orderData)
                      .then(() => db.ref('Orders/' + orderId).remove())
                      .then(() => {
                        alert("Order cancelled successfully.");
                        fetchAndRenderOrders(mail, admins, courier);
                      })
                      .catch(err => {
                        console.error("Error cancelling order:", err);
                        alert("Failed to cancel order.");
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
          container.scrollTop = scrollpos;

          if (!firstRun && currentOrders > previousOrders) {
            const newOrders = currentOrders - previousOrders;
            const audio = new Audio('../assets/Audio/alarm.mp3');
            console.log(`🚨 ${newOrders} new order(s) detected!`);
            audio.play();
          }
          
          previousOrders = currentOrders;
          firstRun = false;
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

    fetch('data/Admins.json')
      .then(res => res.json())
      .then(data => {
        adminEmails = data.adminEmails;
        console.log("Loaded admin emails:", adminEmails);
      
        auth.onAuthStateChanged(user => {
          if (!user) return console.error("No user signed in yet");
          waitForPopupThenCheck(user.email);
          setInterval(() => {
            waitForPopupThenCheck(user.email)
          }, 1000);
        
          menuBtn2.addEventListener("click", () => {
            menuSection.style.display = "grid";
            cartSection.style.display = "none";
            orderSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          cartBtn.addEventListener("click", () => {
            if (!user){
              alert("Log in to order!")
              return
            }
            menuSection.style.display = "none";
            cartSection.style.display = "block";
            orderSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          orderBtn.addEventListener("click", () => {
            if (!user){
              alert("Log in to order!")
              return
            }
            orderSection.style.display = "block";
            fetchAndRenderOrders(user.email, adminEmails, courierEmails);
            menuSection.style.display = "none";
            cartSection.style.display = "none";
            adminSection.style.display = "none";
          });
        
          if (adminEmails.includes(user.email)) {
            adminBtn.style.display = "flex"; // Show the button if user is admin
          
            adminBtn.addEventListener("click", () => {
              adminSection.style.display = "block";
              orderSection.style.display = "none";
              menuSection.style.display = "none";
              cartSection.style.display = "none";
            });
          }
        });
      })
      .catch(err => console.error("Failed to load admins.json:", err));
    setInterval(() => {
      const user = firebase.auth().currentUser;
      if (user && user.email) {
        fetchAndRenderOrders(user.email, adminEmails, courierEmails);
      } else {
        console.warn("⚠️ No user signed in, skipping fetch");
      }
    }, 5000);
    logoutbtn.addEventListener("click", () => {
    auth.signOut()
      .then(() => {
        console.log("User signed out.");
        alert("user signed out")
      })
      .catch((error) => {
        console.error("Error during sign-out:", error.message);
      });
    });

    auth.onAuthStateChanged((user) => {
      // NOT LOGGED IN
      if (!user) {
        console.log("No user signed in");
      
        authContainer.innerHTML = `
          <button class="googleSignInBtn" id="googleSignInBtn">
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
            Sign in with Google
          </button>
        `;
      
        const signInBtn = document.getElementById("googleSignInBtn");
        if (signInBtn) {
          signInBtn.addEventListener("click", () => {
            auth.signInWithPopup(provider)
              .then((result) => {
                console.log("Signed in as", result.user.displayName);
                // DON'T overwrite user
              })
              .catch((error) => {
                console.error("Error during sign-in:", error.message);
              });
          });
        }
      
        return; // IMPORTANT: stop here
      }
    
      // LOGGED IN
      waitForPopupThenCheck(user.email);
    
      console.log("User signed in:", user.displayName);
    
      authContainer.innerHTML = "";
    
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
    }); 
  });  
  
  function loadMenu(filter) {
    const mainCourseRef = db.ref('menu/main_course');

    mainCourseRef.once('value', (snapshot) => {
      const items = snapshot.val();
      const menuGrid = document.querySelector('.menu-grid');
      let count = 0;

      menuGrid.innerHTML = ''; // Clear existing items

      // Convert object to array, then sort
      const sortedItems = Object.entries(items)
        .filter(([key, item]) => filter === "all" || item.filter === filter)
        .sort(([, a], [, b]) => {
        
          if (a.bestSeller === "yes" && b.bestSeller !== "yes") return -1;
          if (a.bestSeller !== "yes" && b.bestSeller === "yes") return 1;

          if (a.stock !== b.stock) return b.stock - a.stock;

          if (a.limited === "yes" && b.limited !== "yes") return -1;
          if (a.limited !== "yes" && b.limited === "yes") return 1;
        
          return 0;
        });


      // Now render the sorted items
      for (const [key, item] of sortedItems) {
        const menuItem = createMenuItem(key, item);
        menuGrid.appendChild(menuItem);
        count++;
      }

      document.querySelector('.item-count').textContent = `${count} items`;
    });
  }
    
  function createMenuItem(key, item) {
    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item';

    // Apply glow effect for best seller or limited items
    if (item.bestSeller === "yes") {
      menuItem.classList.add('bestseller-glow');
    } else if (item.limited === "yes") {
      menuItem.classList.add('limited-glow');
    }

    // Format prices
    let priceHTML = `Rp ${item.price.toLocaleString('id-ID')}`;
    if (item.discount && item.discount > 0) {
      const discountedPrice = item.price * (1 - item.discount / 100);
      priceHTML = `
        <span class="original-price">Rp ${item.price.toLocaleString('id-ID')}</span>
        <span class="discounted-price">Rp ${discountedPrice.toLocaleString('id-ID')}</span>
      `;
    }

    const limited = item.limited === "yes" ? `<span class="bold-red">[LIMITED]</span>` : "";
    const bestSeller = item.bestSeller === "yes" 
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: auto;">
          <path fill-rule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clip-rule="evenodd" />
        </svg>
        ` 
      : "";

    menuItem.innerHTML = `
      <div class="item-image"><img src="${item.image}"></div>
      <div class="item-content">
        <div class="item-header">
          <h4 class="item-name">${limited} ${bestSeller} ${item.name}</h4>
          <span class="item-price">${priceHTML}</span>
        </div>
        <p class="item-description">${item.description}</p>
        <p class="item-stock">Stock: ${item.stock}</p>
        <div class="item-actions">
          <div class="quantity-controls">
            <button class="qty-btn" disabled>−</button>
            <input type="number" value="0" min="0" class="qty-input">
            <button class="qty-btn">+</button>
          </div>
          <button class="add-btn">Add to Cart</button>
        </div>
      </div>
    `;

    setupQuantityLogic(menuItem, key, item, item.stock);
    return menuItem;
  }

  function setupQuantityLogic(menuItem, key, item, stock) { 
    const qtyBtns = menuItem.querySelectorAll('.qty-btn');
    const qtyInput = menuItem.querySelector('.quantity-controls .qty-input');
    const addToCartBtn = menuItem.querySelector('.add-btn');
    
    let quantity = parseInt(qtyInput.value) || 0;
    
    // Handle + / − buttons
    qtyBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.textContent === '+') {
          if (quantity < stock) {
            quantity++;
          } else {
            alert("This is the maximum stock!");
            return;
          }
        } else if (btn.textContent === '−' && quantity > 0) {
          quantity--;
        }
      
        qtyInput.value = quantity;
        qtyBtns[0].disabled = quantity === 0;
      });
    });
  
    // Allow manual typing in the input box
    qtyInput.addEventListener('input', () => {
      let value = parseInt(qtyInput.value) || 0;
      if (value > stock) {
        alert("This is the maximum stock!");
        value = stock;
      } else if (value < 0) {
        value = 0;
      }
      quantity = value;
      qtyInput.value = quantity;
      qtyBtns[0].disabled = quantity === 0;
    });
  
    // Handle Add to Cart button
    addToCartBtn.addEventListener('click', () => {
      quantity = parseInt(qtyInput.value) || 0;
      if (quantity <= 0) {
        quantity = 1;
      }
      if (quantity > stock) {
        alert("This is the maximum stock!");
        return;
      }
    
      const existing = cart.find(c => c.key === key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        cart.push({
          key: key,
          name: item.name,
          price: item.price,
          quantity: quantity,
          stock: item.stock,
          discount: item.discount
        });
        alert("Item has been added to cart, press the 3 dots button to open cart");
        document.getElementById("btn-cart").classList.add("has-notification");
        menuBtn3.classList.add("has-notification");
      }
    
      // Reset
      quantity = 0;
      qtyInput.value = '0';
      qtyBtns[0].disabled = true;
    
      updateCartDisplay();
    });
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
    
      const discount = item.discount ? item.discount : 0;
      const discountedPrice = item.price - (item.price * discount / 100);
      const itemTotal = discountedPrice * item.quantity;
      totalPrice += itemTotal;
    
      const cartItem = document.createElement('div');
      cartItem.className = 'cart-item';
    
      cartItem.innerHTML = `
        <div class="item-info">
          <h4>${item.name}</h4>
          <p>
            Rp ${discountedPrice.toLocaleString('id-ID')} × ${item.quantity}
            ${discount > 0 ? `<span class="discount-tag">(${discount}% off)</span>` : ""}
          </p>
        </div>
        <div class="item-controls">
          <button class="qty-btn minus">−</button>
          <input type="number" value="${item.quantity}" min="0" class="qty-input">
          <button class="qty-btn plus">+</button>
        </div>
        <span>Rp ${itemTotal.toLocaleString('id-ID')}</span>
      `;
    
      const minusBtn = cartItem.querySelector('.qty-btn.minus');
      const plusBtn = cartItem.querySelector('.qty-btn.plus');
      const qtyInput = cartItem.querySelector('.qty-input');
    
      // 🧠 Handle manual typing in input box (consistent with menu logic)
      qtyInput.addEventListener('input', () => {
        let value = parseInt(qtyInput.value) || 0;
      
        if (value > item.stock) {
          alert("This is the maximum stock!");
          value = item.stock;
        } else if (value < 0) {
          value = 0;
        }
      
        item.quantity = value;
        qtyInput.value = value;
      
        // Remove if quantity goes to zero
        if (item.quantity <= 0) {
          cart = cart.filter(i => i.key !== item.key);
        }
      
        updateCartDisplay();
      });
    
      // 🧩 Handle minus button
      minusBtn.addEventListener('click', () => {
        if (item.quantity > 0) {
          item.quantity--;
          if (item.quantity === 0) {
            cart = cart.filter(i => i.key !== item.key);
          }
          updateCartDisplay();
        }
      });
    
      // 🧩 Handle plus button
      plusBtn.addEventListener('click', () => {
        if (item.quantity < item.stock) {
          item.quantity++;
          updateCartDisplay();
        } else {
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

      // ✅ Build order object safely
      const orderData = {
        name,
        grade,
        class: className,
        paymentMethod,
        mail,
        timestamp: `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear()).slice(-2)}`,
        items: cart.map(item => ({
          name: item.name ?? 'Unnamed Item',
          price: item.price ?? 0,
          quantity: item.quantity ?? 1,
          stock: item.stock ?? 0,
          discount: item.discount ?? 0
        })),
        total: cart.reduce((sum, item) => {
          const discount = item.discount ?? 0;
          const discountedPrice = item.price - (item.price * discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0)
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