const express = require("express");
const User = require("../models/User");
const Product = require("../models/Product");
const Order = require("../models/Order");

const router = express.Router();

// Check Admin
const checkAdmin = async (userId) => {
  const user = await User.findById(userId);

  if (!user || user.role !== "admin") {
    return null;
  }

  return user;
};

// ===============================
// ADMIN DASHBOARD STATS
// ===============================
router.get("/stats/:userId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const totalProducts = await Product.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();

    const orders = await Order.find();

    const totalSales = orders.reduce(
      (total, order) => total + order.totalAmount,
      0
    );

    res.json({
      success: true,
      stats: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalSales
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message
    });
  }
});

// ===============================
// GET ALL PRODUCTS
// ===============================
router.get("/products/:userId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const products = await Product.find().sort({
      createdAt: -1
    });

    res.json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

// ===============================
// DELETE PRODUCT
// ===============================
router.delete("/products/:userId/:productId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const product = await Product.findByIdAndDelete(
      req.params.productId
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message
    });
  }
});

// ===============================
// GET ALL USERS
// ===============================
router.get("/users/:userId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
});

// ===============================
// GET ALL ORDERS
// ===============================
router.get("/orders/:userId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const orders = await Order.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

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

// ===============================
// UPDATE ORDER STATUS
// ===============================
router.put("/orders/:userId/:orderId", async (req, res) => {
  try {
    const admin = await checkAdmin(req.params.userId);

    if (!admin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin only."
      });
    }

    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Confirmed",
      "Shipped",
      "Delivered",
      "Cancelled"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status"
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    res.json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message
    });
  }
});

module.exports = router;