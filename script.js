// ===== BACKEND URL — Render deploy ke baad yahan apna URL daalna =====
const BACKEND_URL = 'https://phooldhara-project.onrender.com';

let currentOrder = { product: '', price: 0, fragrance: '' };

// ===== Quantity Selector =====
function changeQty(btn, delta) {
  var input = btn.parentElement.querySelector('.qty-input');
  var val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 50) val = 50;
  input.value = val;
}

// ===== Payment Method Toggle Styling =====
document.querySelectorAll('input[name="payMethod"]').forEach(function(radio) {
  radio.addEventListener('change', function() {
    var labels = document.querySelectorAll('.payment-toggle label');
    labels[0].style.background = this.value === 'online' ? '#eef4ff' : '#fff';
    labels[1].style.background = this.value === 'cod' ? '#eaffee' : '#fff';
    var payBtn = document.getElementById('payNowBtn');
    var secNote = document.getElementById('secureNote');
    var total = currentOrder.price * (currentOrder.quantity || 1);
    if (this.value === 'cod') {
      payBtn.innerHTML = '🚚 Place COD Order';
      payBtn.style.background = 'linear-gradient(135deg,#28a745,#20c997)';
      secNote.textContent = '📦 Cash on Delivery · Pay when you receive';
    } else {
      payBtn.innerHTML = `💳 Pay ₹<span id="btn-amount">${total}</span> Securely`;
      payBtn.style.background = '';
      secNote.textContent = '🔐 Secured by Razorpay · 100% Safe';
    }
    payBtn.disabled = false;
  });
});

// ===== Open Modal =====
function openPayModal(productName, price, btn) {
  var card = btn.closest('.product-body');
  var sel  = card ? card.querySelector('.fragrance-select') : null;
  if (sel && !sel.value) {
    sel.style.borderColor = '#1a5fb4';
    sel.focus();
    setTimeout(function(){ sel.style.borderColor = ''; }, 2200);
    return;
  }
  var qtyInput = card ? card.querySelector('.qty-input') : null;
  var qty = qtyInput ? parseInt(qtyInput.value) : 1;
  currentOrder = {
    product:   productName,
    price:     price,
    quantity:  qty,
    fragrance: sel ? sel.options[sel.selectedIndex].text : ''
  };
  document.getElementById('modal-product-name').textContent = productName + ' × ' + qty;
  document.getElementById('modal-fragrance').textContent    = currentOrder.fragrance;
  document.getElementById('modal-price').textContent        = '₹' + (price * qty);
  var btnAmt = document.getElementById('btn-amount');
  if(btnAmt) btnAmt.textContent = price * qty;
  document.getElementById('pay-name').value  = '';
  document.getElementById('pay-phone').value = '';
  document.getElementById('pay-email').value = '';
  document.getElementById('pay-address').value = '';
  // Reset payment method to online
  var onlineRadio = document.querySelector('input[name="payMethod"][value="online"]');
  if(onlineRadio) { onlineRadio.checked = true; onlineRadio.dispatchEvent(new Event('change')); }
  document.getElementById('payNowBtn').disabled = false;
  document.getElementById('payOverlay').classList.add('active');
}

function closePayModal() {
  document.getElementById('payOverlay').classList.remove('active');
}

document.getElementById('payOverlay').addEventListener('click', function(e) {
  if (e.target === this) closePayModal();
});

// ===== Handle Payment (Online / COD) =====
function handlePayment() {
  var payMethod = document.querySelector('input[name="payMethod"]:checked').value;
  if (payMethod === 'cod') {
    placeCODOrder();
  } else {
    initiateRazorpay();
  }
}

// ===== Place COD Order via WhatsApp =====
function placeCODOrder() {
  var name    = document.getElementById('pay-name').value.trim();
  var phone   = document.getElementById('pay-phone').value.trim();
  var address = document.getElementById('pay-address').value.trim();
  if (!name) { document.getElementById('pay-name').focus(); return; }
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
    alert('Valid 10-digit mobile number daalo'); document.getElementById('pay-phone').focus(); return;
  }
  if (!address) { document.getElementById('pay-address').focus(); alert('Delivery address daalo'); return; }
  var totalPrice = currentOrder.price * (currentOrder.quantity || 1);
  var msg = encodeURIComponent(
    'Namaste! 🙏 I would like to place a COD order:\n\n' +
    '📦 Product: ' + currentOrder.product + '\n' +
    '🌸 Fragrance: ' + (currentOrder.fragrance || 'N/A') + '\n' +
    '🔢 Quantity: ' + (currentOrder.quantity || 1) + '\n' +
    '💰 Total: ₹' + totalPrice + '\n' +
    '💵 Payment: Cash on Delivery\n\n' +
    '👤 Name: ' + name + '\n' +
    '📱 Phone: ' + phone + '\n' +
    '📍 Address: ' + address + '\n\n' +
    'Please confirm availability and delivery. Dhanyavaad! 🙏'
  );
  closePayModal();
  window.open('https://wa.me/916375507029?text=' + msg, '_blank');
}

// ===== Initiate Razorpay =====
async function initiateRazorpay() {
  const name  = document.getElementById('pay-name').value.trim();
  const phone = document.getElementById('pay-phone').value.trim();
  const email = document.getElementById('pay-email').value.trim() || 'customer@phooldhara.com';
  const address = document.getElementById('pay-address').value.trim();
  if (!address) { document.getElementById('pay-address').focus(); alert('Delivery address daalo'); return; }

  if (!name) {
    document.getElementById('pay-name').style.borderColor = '#D4621A';
    document.getElementById('pay-name').focus();
    setTimeout(() => document.getElementById('pay-name').style.borderColor = '', 2000);
    return;
  }
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
    document.getElementById('pay-phone').style.borderColor = '#D4621A';
    document.getElementById('pay-phone').focus();
    alert('Valid 10-digit mobile number daalo');
    setTimeout(() => document.getElementById('pay-phone').style.borderColor = '', 2000);
    return;
  }

  const btn = document.getElementById('payNowBtn');
  btn.disabled  = true;
  btn.innerHTML = '⏳ Loading...';

  try {
    // Step 1: Backend se order create karo
    const res = await fetch(`${BACKEND_URL}/api/create-order`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount:        currentOrder.price * (currentOrder.quantity || 1),
        productName:   currentOrder.product,
        customerName:  name,
        customerPhone: phone
      })
    });

    const data = await res.json();
    if (!data.success) {
      alert('Order create nahi hua: ' + data.message);
      btn.disabled  = false;
      btn.innerHTML = `💳 Pay ₹<span id="btn-amount">${currentOrder.price * (currentOrder.quantity || 1)}</span> Securely`;
      return;
    }

    // Step 2: Razorpay checkout open karo
    const options = {
      key:         data.keyId,
      amount:      data.amount,
      currency:    data.currency,
      order_id:    data.orderId,
      name:        'PhoolDhara 🌸',
      description: currentOrder.product + (currentOrder.fragrance ? ' — ' + currentOrder.fragrance : ''),
      image:       'https://i.ibb.co/placeholder/logo.png',
      prefill: {
        name:    name,
        email:   email,
        contact: '91' + phone
      },
      theme: { color: '#D4621A' },
      handler: async function(response) {
        // Step 3: Payment verify karo
        try {
          const vRes = await fetch(`${BACKEND_URL}/api/verify-payment`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature
            })
          });
          const vData = await vRes.json();
          if (vData.success) {
            closePayModal();
            showSuccessToast(response.razorpay_payment_id);
          } else {
            alert('Payment verification failed. Support se contact karein.');
          }
        } catch(e) {
          alert('Verification error: ' + e.message);
        }
      },
      modal: {
        ondismiss: function() {
          btn.disabled  = false;
          btn.innerHTML = `💳 Pay ₹<span id="btn-amount">${currentOrder.price * (currentOrder.quantity || 1)}</span> Securely`;
        }
      }
    };

    closePayModal();
    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response){
        alert('Payment failed: ' + response.error.description);
      });
      rzp.open();
    } catch(rzpError) {
      alert('Razorpay open error: ' + rzpError.message);
      btn.disabled = false;
      btn.innerHTML = `💳 Pay ₹<span id="btn-amount">${currentOrder.price * (currentOrder.quantity || 1)}</span> Securely`;
    }

  } catch(error) {
    alert('Network error! Backend URL check karein.\n' + error.message);
    btn.disabled  = false;
    btn.innerHTML = `💳 Pay ₹<span id="btn-amount">${currentOrder.price * (currentOrder.quantity || 1)}</span> Securely`;
  }
}

// ===== Success Toast =====
function showSuccessToast(paymentId) {
  const toast = document.getElementById('payToast');
  toast.textContent = '✅ Payment Successful! ID: ' + paymentId;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 5000);
}

// ===== WhatsApp Order =====
function orderNow(productName, cardBody) {
  var sel = cardBody.querySelector('.fragrance-select');
  if (!sel || !sel.value) {
    if (sel) { sel.style.borderColor='#D4621A'; sel.focus(); setTimeout(function(){sel.style.borderColor='';},2200); }
    return;
  }
  var fragLabel = sel.options[sel.selectedIndex].text;
  var qtyInput = cardBody.querySelector('.qty-input');
  var qty = qtyInput ? parseInt(qtyInput.value) : 1;
  var msg = encodeURIComponent(
    'Namaste! 🙏 I would like to order:\n\n' +
    '📦 Product: ' + productName + '\n' +
    '🌸 Fragrance: ' + fragLabel + '\n' +
    '🔢 Quantity: ' + qty + '\n\n' +
    'Please confirm availability and share delivery details. Dhanyavaad! 🙏'
  );
  window.open('https://wa.me/916375507029?text='+msg,'_blank');
}

// ===== Reviews System =====
function getReviews() {
  var stored = localStorage.getItem('phooldhara_reviews');
  if (stored) return JSON.parse(stored);
  // Default reviews
  return [
    { name: 'Sunita Sharma', city: 'Pushkar, Rajasthan', rating: 5, text: 'The Rose agarbatti is absolutely divine. Pooja ka maahol hi badal gaya. I\'ve never used anything this pure before.', date: '2026-01-15' },
    { name: 'Rakesh Gupta', city: 'Jaipur, Rajasthan', rating: 5, text: 'Bahut achhi fragrance aur packaging bhi beautiful thi. The combo pack is great value \u2014 ordered twice already!', date: '2026-02-20' },
    { name: 'Priya Agarwal', city: 'Ajmer, Rajasthan', rating: 4, text: 'I love the concept of recycling temple flowers. The Chandan dhoopbatti lasts long and the fragrance is so calming.', date: '2026-03-10' }
  ];
}

function saveReviews(reviews) {
  localStorage.setItem('phooldhara_reviews', JSON.stringify(reviews));
}

function renderReviews() {
  var reviews = getReviews();
  var grid = document.getElementById('reviewsGrid');
  if (!grid) return;
  grid.innerHTML = '';
  reviews.forEach(function(r) {
    var stars = '';
    for (var i = 0; i < 5; i++) stars += (i < r.rating) ? '★' : '☆';
    var dateStr = r.date ? new Date(r.date).toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' }) : '';
    var card = document.createElement('div');
    card.className = 'testi-card reveal visible';
    card.innerHTML = '<div class="stars">' + stars + '</div>' +
      '<p class="testi-text">"' + r.text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '"</p>' +
      '<div class="testi-author">' + r.name.replace(/</g,'&lt;') + '</div>' +
      (r.city ? '<div class="testi-loc">' + r.city.replace(/</g,'&lt;') + '</div>' : '') +
      (dateStr ? '<div class="review-date">' + dateStr + '</div>' : '');
    grid.appendChild(card);
  });
}

function submitReview() {
  var name = document.getElementById('reviewName').value.trim();
  var city = document.getElementById('reviewCity').value.trim();
  var text = document.getElementById('reviewText').value.trim();
  var ratingEl = document.querySelector('input[name="rating"]:checked');
  var rating = ratingEl ? parseInt(ratingEl.value) : 3;
  if (!name) { document.getElementById('reviewName').focus(); alert('Apna naam likhein'); return; }
  if (!text) { document.getElementById('reviewText').focus(); alert('Review likhein'); return; }
  var reviews = getReviews();
  reviews.unshift({ name: name, city: city || '', rating: rating, text: text, date: new Date().toISOString().split('T')[0] });
  saveReviews(reviews);
  renderReviews();
  document.getElementById('reviewName').value = '';
  document.getElementById('reviewCity').value = '';
  document.getElementById('reviewText').value = '';
  document.getElementById('star3').checked = true;
  var msg = document.getElementById('reviewSuccess');
  msg.style.display = 'block';
  setTimeout(function(){ msg.style.display = 'none'; }, 4000);
}

// Load reviews on page load
renderReviews();

// ===== Nav =====
document.getElementById('hamburger').addEventListener('click',function(){
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('#navLinks a').forEach(function(a){
  a.addEventListener('click',function(){document.getElementById('navLinks').classList.remove('open');});
});

// ===== Scroll Animations =====
var obs=new IntersectionObserver(function(entries){
  entries.forEach(function(e,i){
    if(e.isIntersecting){setTimeout(function(){e.target.classList.add('visible');},i*90);obs.unobserve(e.target);}
  });
},{threshold:.1});
document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});

// ===== Contact Form =====
async function submitForm() {
  const name = document.getElementById('fname').value.trim();
  const phone = document.getElementById('fphone').value.trim();
  const product = document.getElementById('fproduct').value;
  const message = document.getElementById('fmsg').value.trim();
  if (!name || !phone || !product || !message) { alert('Please fill all fields!'); return; }
  const submitBtn = document.querySelector('.submit-btn');
  submitBtn.textContent = '⏳ Sending...';
  submitBtn.disabled = true;
  const formData = new FormData();
  formData.append('access_key', '68beff01-34bc-4746-9b5c-a9df353e5138');
  formData.append('name', name);
  formData.append('subject', 'New Order - ' + product);
  formData.append('message', 'Name: '+name+'\nPhone: '+phone+'\nProduct: '+product+'\nMessage: '+message);
  try {
    const response = await fetch('https://api.web3forms.com/submit', { method:'POST', body:formData });
    const data = await response.json();
    if (data.success) {
      document.getElementById('successMsg').style.display = 'block';
      ['fname','fphone','fproduct','fmsg'].forEach(id => document.getElementById(id).value='');
      setTimeout(function(){ document.getElementById('successMsg').style.display='none'; }, 5000);
    } else { alert('Kuch galat hua. Dobara try karein.'); }
  } catch(error) { alert('Network error.'); }
  submitBtn.textContent = '🙏 Send Message';
  submitBtn.disabled = false;
}
