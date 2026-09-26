const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    price: {
      type: Number,
      required: true
    },

    quantity: {
      type: Number,
      required: true,
      min: 1
    },

    image: {
      type: String,
      default: ""
    }
  }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: {
      type: [orderItemSchema],
      required: true
    },

    totalAmount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Cancelled"
      ],
      default: "Pending"
    },

    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery", "Online Payment"],
      default: "Cash on Delivery"
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;