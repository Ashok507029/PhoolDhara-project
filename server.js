const express   = require('express');
const cors      = require('cors');
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const mongoose  = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

// ==============================
// MONGODB CONNECTION
// ==============================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/phooldhara';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected:', MONGODB_URI.split('@').pop() || 'localhost'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

mongoose.connection.on('disconnected', () => console.warn('⚠️ MongoDB Disconnected'));
mongoose.connection.on('reconnected',  () => console.log('♻️ MongoDB Reconnected'));

// ==============================
// MONGOOSE SCHEMAS & MODELS
// ==============================

// --- Order Schema ---
const orderSchema = new mongoose.Schema({
  orderId:       { type: String, unique: true, sparse: true }, // Razorpay Order ID
  paymentId:     { type: String, default: null },              // Razorpay Payment ID
  customerName:  { type: String, required: true },
  customerPhone: { type: String, required: true },
  productName:   { type: String, required: true },
  fragrance:     { type: String, default: '' },
  quantity:      { type: Number, default: 1 },
  amount:        { type: Number, required: true },             // Amount in INR (not paise)
  paymentMethod: { type: String, enum: ['online', 'cod'], default: 'online' },
  status:        { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED', 'COD'], default: 'PENDING' },
  deliveryStatus:{ type: String, enum: ['Pending', 'Shipping', 'Delivered', 'Cancelled'], default: 'Pending' },
  address:       { type: String, default: '' },
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

// --- Review Schema ---
const reviewSchema = new mongoose.Schema({
  name:   { type: String, required: true },
  city:   { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text:   { type: String, required: true },
}, { timestamps: true });

const Review = mongoose.model('Review', reviewSchema);

// ==============================
// RAZORPAY INSTANCE
// ==============================
const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// ==============================
// ROUTE: Health Check
// ==============================
app.get('/', (req, res) => {
  res.json({
    status: '🌸 PhoolDhara Server chal raha hai!',
    mongodb: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'
  });
});

// ==============================
// ROUTE: Create Razorpay Order
// ==============================
app.post('/api/create-order', async (req, res) => {
  try {
    const { amount, productName, fragrance, quantity, customerName, customerPhone, address } = req.body;

    if (!amount || !productName) {
      return res.status(400).json({ success: false, message: 'Amount aur product required hai.' });
    }
    if (!customerName || !customerPhone) {
      return res.status(400).json({ success: false, message: 'Customer name aur phone required hai.' });
    }

    const options = {
      amount:   Math.round(amount * 100), // Paise mein convert
      currency: 'INR',
      receipt:  'PHOOL_' + Date.now(),
      notes: {
        product:  productName,
        customer: customerName,
        phone:    customerPhone
      }
    };

    const order = await razorpay.orders.create(options);

    // MongoDB mein PENDING order save karo
    const newOrder = new Order({
      orderId:       order.id,
      customerName,
      customerPhone,
      productName,
      fragrance:     fragrance || '',
      quantity:      quantity || 1,
      amount,
      address:       address || '',
      paymentMethod: 'online',
      status:        'PENDING'
    });
    await newOrder.save();

    console.log(`[ORDER CREATED] ${order.id} | ${productName} | ₹${amount} | ${customerName}`);

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
// ROUTE: Verify Razorpay Payment
// ==============================
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const body     = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected === razorpay_signature) {
      // MongoDB mein order SUCCESS mark karo
      await Order.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: 'SUCCESS', paymentId: razorpay_payment_id }
      );

      console.log(`[PAYMENT SUCCESS] ${razorpay_payment_id}`);
      res.json({ success: true, paymentId: razorpay_payment_id });
    } else {
      // MongoDB mein order FAILED mark karo
      await Order.findOneAndUpdate(
        { orderId: razorpay_order_id },
        { status: 'FAILED' }
      );

      console.warn(`[PAYMENT FAILED] Invalid signature: ${razorpay_payment_id}`);
      res.status(400).json({ success: false, message: 'Payment verification failed.' });
    }

  } catch (error) {
    console.error('Verify Error:', error);
    res.status(500).json({ success: false, message: 'Verification error.' });
  }
});

// ==============================
// ROUTE: Save COD Order
// ==============================
app.post('/api/cod-order', async (req, res) => {
  try {
    const { customerName, customerPhone, productName, fragrance, quantity, amount, address } = req.body;

    if (!customerName || !customerPhone || !productName || !amount) {
      return res.status(400).json({ success: false, message: 'Saari details required hain.' });
    }

    const newOrder = new Order({
      customerName,
      customerPhone,
      productName,
      fragrance:     fragrance || '',
      quantity:      quantity || 1,
      amount,
      address:       address || '',
      paymentMethod: 'cod',
      status:        'COD'
    });
    await newOrder.save();

    console.log(`[COD ORDER] ${productName} | ₹${amount} | ${customerName} | ${customerPhone}`);
    res.json({ success: true, message: 'COD Order save ho gaya!' });

  } catch (error) {
    console.error('COD Order Error:', error);
    res.status(500).json({ success: false, message: 'COD order save nahi hua.', error: error.message });
  }
});

// ==============================
// ROUTE: Get All Reviews
// ==============================
app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, reviews });
  } catch (error) {
    console.error('Reviews Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Reviews fetch nahi hue.' });
  }
});

// ==============================
// ROUTE: Submit a Review
// ==============================
app.post('/api/reviews', async (req, res) => {
  try {
    const { name, city, rating, text } = req.body;

    if (!name || !text) {
      return res.status(400).json({ success: false, message: 'Naam aur review required hai.' });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating 1 se 5 ke beech honi chahiye.' });
    }

    const review = new Review({ name, city: city || '', rating, text });
    await review.save();

    console.log(`[REVIEW] ${name} (${rating}⭐) — ${text.substring(0, 40)}...`);
    res.json({ success: true, review });

  } catch (error) {
    console.error('Review Submit Error:', error);
    res.status(500).json({ success: false, message: 'Review save nahi hua.' });
  }
});

// ==============================
// ROUTE: Get All Orders (Admin)
// ==============================
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Orders Fetch Error:', error);
    res.status(500).json({ success: false, message: 'Orders fetch nahi hue.' });
  }
});

// ==============================
// ROUTE: Update Delivery Status (Admin)
// ==============================
app.put('/api/orders/:id/delivery-status', async (req, res) => {
  try {
    const { deliveryStatus } = req.body;
    if (!['Pending', 'Shipping', 'Delivered', 'Cancelled'].includes(deliveryStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status.' });
    }
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      { deliveryStatus },
      { new: true }
    );
    if (!updatedOrder) {
      return res.status(404).json({ success: false, message: 'Order nahi mila.' });
    }
    console.log(`[STATUS UPDATE] Order ${req.params.id} updated to ${deliveryStatus}`);
    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update Delivery Status Error:', error);
    res.status(500).json({ success: false, message: 'Status update fail ho gaya.', error: error.message });
  }
});

// ==============================
// SERVER START
// ==============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌸 PhoolDhara Server`);
  console.log(`✅ Port: ${PORT}`);
  console.log(`🔑 Razorpay Key: ${process.env.RAZORPAY_KEY_ID}`);
  console.log(`🍃 MongoDB: ${MONGODB_URI}\n`);
});
