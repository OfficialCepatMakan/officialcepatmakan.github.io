function fetchAndRenderOrders(mail, admins, courier) {
  const ordersRef = db.ref('Orders');
  const ordersList = document.getElementById('orders-list');
  ordersList.innerHTML = ''; // clear existing orders
  const isCourier = courier.includes(mail);

  ordersRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
      ordersList.innerHTML = '<p>No orders found.</p>';
      return;
    }

    // 🗂️ Step 1: Group orders by date
    const groupedOrders = {};
    snapshot.forEach((childSnapshot) => {
      const order = childSnapshot.val();
      const orderId = childSnapshot.key;

      // only show if user should see it
      if (order.mail === mail || admins.includes(mail) || isCourier) {
        // extract just the date part (assuming timestamp is a string like "25/09/2025 14:30")
        const date = order.timestamp.split(" ")[0]; 
        if (!groupedOrders[date]) groupedOrders[date] = [];
        groupedOrders[date].push({ order, orderId });
      }
    });

    // 🗂️ Step 2: Render grouped orders
    for (const date in groupedOrders) {
      const dateHeader = document.createElement("div");
      dateHeader.innerHTML = `
        <h1>${date}</h1>
        <hr>
      `;
      ordersList.appendChild(dateHeader);

      groupedOrders[date].forEach(({ order, orderId }) => {
        const orderDiv = document.createElement("div");
        orderDiv.className = "order-item";

        let itemsHTML = "";
        order.items.forEach((item) => {
          itemsHTML += `<p>${item.name} x${item.quantity} — Rp${(item.price * item.quantity).toLocaleString()}</p>`;
        });

        let deleteButtonHTML = "";
        let EmailP = "";
        if (admins.includes(mail)) {
          deleteButtonHTML = `
            <button class="remove-order" id="${orderId}">
              🗑️
            </button>`;
          EmailP = `<p><strong>Email:</strong> ${order.mail}</p>`;
        }

        let courierHTML = "";
        const taken = order.courier && order.courier !== "";
        if (isCourier) {
          const isMine = order.courier === mail;
          courierHTML = `
            <label>
              <input type="checkbox" class="take-order" data-id="${orderId}" 
                ${isMine ? "checked" : ""} ${taken && !isMine ? "disabled" : ""}>
              ${isMine ? "You took this order" : taken ? "Taken by another courier" : "Take this order"}
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
          <p><strong>Timestamp:</strong> ${order.timestamp}</p>
          ${EmailP}
          ${courierHTML}
          ${deleteButtonHTML}
        `;
        ordersList.appendChild(orderDiv);

        // delete listener
        if (admins.includes(mail)) {
          const deleteBtn = orderDiv.querySelector(".remove-order");
          deleteBtn.addEventListener("click", () => {
            if (!confirm("Are you sure you want to delete this order?")) return;
            db.ref("Orders/" + orderId).remove().then(() => {
              alert("Order deleted successfully.");
              fetchAndRenderOrders(mail, admins, courier);
            });
          });
        }

        // courier listener
        if (isCourier) {
          const takeOrderCheckbox = orderDiv.querySelector(".take-order");
          if (takeOrderCheckbox) {
            takeOrderCheckbox.addEventListener("change", (e) => {
              const checked = e.target.checked;
              const id = e.target.dataset.id;

              db.ref("Orders/" + id).update({ courier: checked ? mail : "" }).then(() => {
                alert(checked ? "You took the order." : "You released the order.");
                fetchAndRenderOrders(mail, admins, courier);
              });
            });
          }
        }
      });
    }
  });
}
