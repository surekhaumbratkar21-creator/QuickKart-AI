const express = require("express");
const Order = require("../models/Order");

const router = express.Router();

// Place Order
router.post("/", async (req, res) => {
  try {
    const {
      userId,
      items,
      totalAmount,
      paymentMethod
    } = req.body;

    if (!userId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "User and order items are required"
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid order amount"
      });
    }

    const order = new Order({
      userId,
      items,
      totalAmount,
      paymentMethod:
        paymentMethod || "Cash on Delivery"
    });

    const savedOrder = await order.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: savedOrder
    });
  } catch (error) {
    console.error("Order error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to place order",
      error: error.message
    });
  }
});

// Get orders of a user
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.params.userId
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message
    });
  }
});

module.exports = router;