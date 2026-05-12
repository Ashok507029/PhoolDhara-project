const express   = require('express');
const cors      = require('cors');
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// ==============================
// RAZORPAY INSTANCE
// ==============================
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==============================
// ROUTE 1: Health Check
// ==============================
app.get('/', (req, res) => {
  res.json({ status: '🌸 PhoolDhara Razorpay Server chal raha hai!' });
});

// ==============================
// ROUTE 2: Create Order
// ==============================
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, productName, customerName, customerPhone } = req.body;

    if (!amount || !productName) {
      return res.status(400).json({ success: false, message: 'Amount aur product required hai.' });
    }

    const options = {
      amount:   Math.round(amount * 100), // Paise mein
      currency: 'INR',
      receipt:  'PHOOL_' + Date.now(),
      notes: {
        product:  productName,
        customer: customerName || '',
        phone:    customerPhone || ''
      }
    };

    const order = await razorpay.orders.create(options);

    console.log(`[ORDER] ${order.id} | ${productName} | ₹${amount} | ${customerName}`);

    res.json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error('Order Error:', error);
    res.status(500).json({ success: false, message: 'Order create nahi hua.', error: error.message });
  }
});

// ==============================
// ROUTE 3: Verify Payment
// ==============================
app.post('/api/verify-payment', (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body      = razorpay_order_id + '|' + razorpay_payment_id;
    const expected  = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected === razorpay_signature) {
      console.log(`[SUCCESS] Payment verified: ${razorpay_payment_id}`);
      res.json({ success: true, paymentId: razorpay_payment_id });
    } else {
      console.warn(`[FAILED] Invalid signature: ${razorpay_payment_id}`);
      res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ success: false, message: 'Verification error.' });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 PhoolDhara Razorpay Server`);
  console.log(`✅ Port: ${PORT}`);
  console.log(`🔑 Key ID: ${process.env.RAZORPAY_KEY_ID}\n`);
});
