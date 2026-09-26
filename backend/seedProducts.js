const mongoose = require("mongoose");
require("dotenv").config();

const Product = require("./models/Product");

const products = [
  {
    name: "Wireless Headphones",
    description:
      "Premium wireless headphones with high-quality sound.",
    price: 2499,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
    stock: 25,
    rating: 4.5
  },

  {
    name: "Smart Watch",
    description:
      "Smart fitness watch with health tracking features.",
    price: 3999,
    category: "Electronics",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30",
    stock: 15,
    rating: 4.3
  },

  {
    name: "Running Shoes",
    description:
      "Comfortable running shoes for everyday use.",
    price: 1999,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
    stock: 30,
    rating: 4.4
  },

  {
    name: "Travel Backpack",
    description:
      "Durable backpack suitable for travel and daily use.",
    price: 1499,
    category: "Fashion",
    image:
      "https://images.unsplash.com/photo-1553062407-98eeb64c6a62",
    stock: 20,
    rating: 4.2
  },

  {
    name: "Gaming Mouse",
    description:
      "High-precision gaming mouse with ergonomic design.",
    price: 1299,
    category: "Gaming",
    image:
      "https://images.unsplash.com/photo-1527814050087-3793815479db",
    stock: 18,
    rating: 4.6
  }
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected");

    await Product.deleteMany();

    await Product.insertMany(products);

    console.log("Sample products added successfully");

    await mongoose.connection.close();

    console.log("MongoDB connection closed");
  } catch (error) {
    console.error("Error:", error.message);
  }
};

seedProducts();