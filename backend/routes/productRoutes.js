const express = require("express");
const Product = require("../models/Product");

const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();

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

// Add a new product
router.post("/", async (req, res) => {
  try {
    const product = new Product(req.body);
    const savedProduct = await product.save();

    res.status(201).json({
      success: true,
      product: savedProduct
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Failed to add product",
      error: error.message
    });
  }
});

module.exports = router;