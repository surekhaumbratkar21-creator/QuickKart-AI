
import "./App.css";
import { useEffect, useState } from "react";
import { evaluateRecommendations } from "./recommendationEvaluation";

const API = "https://quickkart-ai.onrender.com";

type Product = {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  rating: number;
};

type CartItem = Product & { quantity: number };

type User = {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: "user" | "admin";
};

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
};

type Order = {
  _id: string;
  userId: string | {
    _id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
  totalAmount: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
};

type AdminStats = {
  totalProducts: number;
  totalUsers: number;
  totalOrders: number;
  totalSales: number;
};

type Recommendation = Product & {
  recommendationScore: number;
  reason: string;
};

type Evaluation = {
  k: number;
  precisionAtK: number;
  hitRateAtK: number;
  recommendedProducts: string[];
  relevantProducts: string[];
};


type AuthMode = "login" | "register" | "forgot" | "reset" | "verifyOtp";

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [viewedProductIds, setViewedProductIds] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [backendMessage, setBackendMessage] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);

  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [resetToken, setResetToken] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [showOrders, setShowOrders] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const [showAdmin, setShowAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // ==================================
  // FETCH BACKEND AND PRODUCTS
  // ==================================

  useEffect(() => {
    const saved = localStorage.getItem("quickkart_viewed_products");

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setViewedProductIds(parsed);
        }
      } catch (error) {
        console.error("Viewed products error:", error);
      }
    }

    const loadData = async () => {
      try {
        const backendResponse = await fetch(API);

        if (!backendResponse.ok) {
          throw new Error("Backend connection failed");
        }

        const backendData = await backendResponse.json();
        setBackendMessage(
          backendData.message || "Backend connected successfully!"
        );

        const productsResponse = await fetch(`${API}/api/products`);

        if (!productsResponse.ok) {
          throw new Error("Products API failed");
        }

        const productsData = await productsResponse.json();

        console.log("Products received:", productsData);

        if (Array.isArray(productsData.products)) {
          setProducts(productsData.products);
        } else {
          setProducts([]);
          console.error("Invalid products response:", productsData);
        }
      } catch (error) {
        console.error("Loading error:", error);
        setBackendMessage("Backend connection failed!");
      } finally {
        setLoadingProducts(false);
      }
    };

    loadData();
  }, []);

  // ==================================
  // PASSWORD RESET URL
  // ==================================

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Supports both /reset-password/TOKEN and ?token=TOKEN
    const pathParts = window.location.pathname.split("/");
    const pathToken =
      pathParts[1] === "reset-password" ? pathParts[2] : null;

    const token = params.get("token") || pathToken;

    if (token) {
      setResetToken(token);
      setAuthMode("reset");
      setShowAuth(true);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "quickkart_viewed_products",
      JSON.stringify(viewedProductIds)
    );
  }, [viewedProductIds]);

  // ==================================
  // CART
  // ==================================

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert("This product is out of stock.");
      return;
    }

    setViewedProductIds((previous) =>
      previous.includes(product._id)
        ? previous
        : [...previous, product._id]
    );

    setCart((previous) => {
      const existing = previous.find(
        (item) => item._id === product._id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          alert("Available stock limit reached.");
          return previous;
        }

        return previous.map((item) =>
          item._id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...previous, { ...product, quantity: 1 }];
    });
  };

  const trackProductView = (productId: string) => {
    setViewedProductIds((previous) =>
      previous.includes(productId)
        ? previous
        : [...previous, productId]
    );
  };

  const increaseQuantity = (productId: string) => {
    setCart((previous) =>
      previous.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity: Math.min(item.quantity + 1, item.stock)
            }
          : item
      )
    );
  };

  const decreaseQuantity = (productId: string) => {
    setCart((previous) =>
      previous
        .map((item) =>
          item._id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((previous) =>
      previous.filter((item) => item._id !== productId)
    );
  };

  const cartTotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // ==================================
  // PRODUCT FILTERING
  // ==================================

  const categories = [
    "All",
    ...Array.from(
      new Set(products.map((product) => product.category))
    )
  ];

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search);

    const matchesCategory =
      selectedCategory === "All" ||
      product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // ==================================
  // AI RECOMMENDATIONS
  // ==================================

  useEffect(() => {
    if (products.length === 0) {
      setRecommendations([]);
      return;
    }

    const candidates = products.filter(
      (product) =>
        !cart.some((item) => item._id === product._id)
    );

    const cartCategories = cart.map((item) => item.category);

    const viewedProducts = products.filter((product) =>
      viewedProductIds.includes(product._id)
    );

    const viewedCategories = viewedProducts.map(
      (product) => product.category
    );

    const hasInteraction =
      cartCategories.length > 0 || viewedCategories.length > 0;

    const scored: Recommendation[] = candidates.map((product) => {
      let score = 0;
      const reasons: string[] = [];

      if (cartCategories.includes(product.category)) {
        score += 50;
        reasons.push("Matches your cart category");
      }

      if (viewedCategories.includes(product.category)) {
        score += 30;
        reasons.push("Matches products you viewed");
      }

      const ratingScore =
        Math.min(Math.max(product.rating || 0, 0), 5) * 4;

      score += ratingScore;

      if (product.rating >= 4.5) {
        reasons.push("High customer rating");
      }

      if (!hasInteraction) {
        score = ratingScore;
        reasons.length = 0;
        reasons.push(
          product.rating >= 4.5
            ? "High customer rating"
            : "Popular quality product"
        );
      }

      return {
        ...product,
        recommendationScore: Math.round(score * 10) / 10,
        reason: reasons.join(" • ")
      };
    });

    scored.sort(
      (a, b) =>
        b.recommendationScore - a.recommendationScore ||
        b.rating - a.rating ||
        a.name.localeCompare(b.name)
    );

    setRecommendations(scored.slice(0, 4));
  }, [cart, products, viewedProductIds]);

  // ==================================
  // RECOMMENDATION EVALUATION
  // ==================================

  useEffect(() => {
    if (recommendations.length === 0 || products.length === 0) {
      setEvaluation(null);
      return;
    }

    const interestCategories = new Set([
      ...cart.map((item) => item.category),
      ...products
        .filter((product) =>
          viewedProductIds.includes(product._id)
        )
        .map((product) => product.category)
    ]);

    if (interestCategories.size === 0) {
      setEvaluation(null);
      return;
    }

    const relevantProducts = products.filter(
      (product) =>
        interestCategories.has(product.category) &&
        !cart.some((item) => item._id === product._id)
    );

    const result = evaluateRecommendations(
      recommendations,
      relevantProducts,
      4
    );

    setEvaluation(result);
  }, [recommendations, products, cart, viewedProductIds]);

  // ==================================
  // AUTH RESET
  // ==================================

  
  // ==================================
  // AUTH RESET
  // ==================================

  const resetAuthForm = () => {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setConfirmPassword("");
    setResetOtp("");
    setResetToken("");
    setOtpVerified(false);
    setResetMessage("");
  };

  // ==================================
  // LOGIN AND REGISTER
  // ==================================

  const handleAuth = async () => {
    if (!authEmail.trim() || !authPassword) {
      alert("Please enter email and password.");
      return;
    }

    if (authMode === "register") {
      if (!authName.trim()) {
        alert("Please enter your name.");
        return;
      }

      if (authPassword.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
      }
    }

    try {
      const endpoint =
        authMode === "login"
          ? `${API}/api/auth/login`
          : `${API}/api/auth/register`;

      const body =
        authMode === "login"
          ? {
              email: authEmail.trim().toLowerCase(),
              password: authPassword
            }
          : {
              name: authName.trim(),
              email: authEmail.trim().toLowerCase(),
              password: authPassword
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Authentication failed.");
        return;
      }

      if (data.requiresOtp) {
        setAuthEmail(authEmail.trim().toLowerCase());
        setResetOtp("");
        setResetToken("");
        setOtpVerified(false);
        setAuthPassword("");
        setConfirmPassword("");

        setResetMessage(
          data.message || "OTP sent to your email. Please verify it."
        );

        setAuthMode("verifyOtp");
        return;
      }

      alert(data.message || "Unexpected authentication response.");
    } catch (error) {
      console.error("Authentication error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // ==================================
  // FORGOT PASSWORD
  // ==================================

  const handleForgotPassword = async () => {
    const email = authEmail.trim().toLowerCase();

    if (!email) {
      alert("Please enter your registered email.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "Unable to process request.");
        return;
      }

      setAuthEmail(email);
      setResetOtp("");
      setResetToken("");
      setOtpVerified(false);
      setAuthPassword("");
      setConfirmPassword("");

      setResetMessage(
        data.message || "OTP sent to your registered email."
      );

      setAuthMode("verifyOtp");
    } catch (error) {
      console.error("Forgot password error:", error);
      setResetMessage("Unable to connect to backend.");
    }
  };

  // ==================================
  // VERIFY OTP
  // ==================================

  const handleVerifyOtp = async () => {
    if (!authEmail.trim()) {
      setResetMessage("Email address is missing.");
      return;
    }

    if (!/^\d{6}$/.test(resetOtp)) {
      setResetMessage("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/auth/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: authEmail.trim().toLowerCase(),
            otp: resetOtp
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "OTP verification failed.");
        return;
      }

      // LOGIN OR REGISTER OTP SUCCESS
      if (data.user) {
        const user: User = {
          id: data.user.id || data.user._id,
          _id: data.user._id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role === "admin" ? "admin" : "user"
        };

        setLoggedInUser(user);
        setShowAuth(false);
        setShowOrders(false);
        setShowAdmin(false);

        setResetOtp("");
        setResetToken("");
        setOtpVerified(false);

        resetAuthForm();

        alert(
          user.role === "admin"
            ? "Admin login successful!"
            : "Email verified successfully! Login successful!"
        );

        if (user.role === "admin") {
          loadAdminDashboard(user);
        }

        return;
      }

      // FORGOT PASSWORD OTP SUCCESS
      const token = data.token || data.resetToken;

      if (token) {
        setResetToken(token);
        setOtpVerified(true);
        setResetOtp("");
        setAuthPassword("");
        setConfirmPassword("");

        setResetMessage(
          data.message || "OTP verified. Please create a new password."
        );

        setAuthMode("reset");
        return;
      }

      setResetMessage(
        data.message || "OTP verified, but the server did not return the expected response."
      );
    } catch (error) {
      console.error("OTP verification error:", error);
      setResetMessage("Unable to verify OTP. Please try again.");
    }
  };

  // ==================================
  // RESET PASSWORD
  // ==================================

  const handleResetPassword = async () => {
    if (!resetToken) {
      alert("Invalid or missing reset token.");
      return;
    }

    if (authPassword.length < 6) {
      alert("Password must be at least 6 characters.");
      return;
    }

    if (authPassword !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/auth/reset-password/${encodeURIComponent(resetToken)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            password: authPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setResetMessage(data.message || "Password reset failed.");
        return;
      }

      alert("Password changed successfully! Please login.");

      setResetToken("");
      setResetOtp("");
      setOtpVerified(false);
      setAuthPassword("");
      setConfirmPassword("");
      setResetMessage("");
      setAuthMode("login");
      setShowAuth(true);

      window.history.replaceState({}, "", "/");
    } catch (error) {
      console.error("Reset password error:", error);
      alert("Unable to connect to backend.");
    }
  };

  // ==================================
  // LOGOUT
  // ==================================

  const logout = () => {
    setLoggedInUser(null);
    setShowAdmin(false);
    setShowOrders(false);
    setOrders([]);
    setAdminStats(null);
    setAdminProducts([]);
    setAdminUsers([]);
    setAdminOrders([]);

    alert("Logged out successfully.");
  };

  // ==================================
  // ADMIN DASHBOARD
  // ==================================

  const loadAdminDashboard = async (userOverride?: User) => {
    const currentUser = userOverride || loggedInUser;

    if (!currentUser) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (currentUser.role !== "admin") {
      alert("Admin account required.");
      return;
    }

    try {
      setLoadingAdmin(true);
      setShowAdmin(true);
      setShowOrders(false);

      const userId = currentUser.id;

      const [
        statsResponse,
        productsResponse,
        usersResponse,
        ordersResponse
      ] = await Promise.all([
        fetch(`${API}/api/admin/stats/${userId}`),
        fetch(`${API}/api/admin/products/${userId}`),
        fetch(`${API}/api/admin/users/${userId}`),
        fetch(`${API}/api/admin/orders/${userId}`)
      ]);

      const statsData = await statsResponse.json();
      const productsData = await productsResponse.json();
      const usersData = await usersResponse.json();
      const ordersData = await ordersResponse.json();

      if (!statsResponse.ok) {
        alert(statsData.message || "Admin access denied.");
        setShowAdmin(false);
        return;
      }

      setAdminStats(statsData.stats || null);
      setAdminProducts(productsData.products || []);
      setAdminUsers(usersData.users || []);
      setAdminOrders(ordersData.orders || []);

      setTimeout(() => {
        document.getElementById("admin")?.scrollIntoView({
          behavior: "smooth"
        });
      }, 100);
    } catch (error) {
      console.error("Admin dashboard error:", error);
      alert("Unable to load admin dashboard.");
    } finally {
      setLoadingAdmin(false);
    }
  };

  // ==================================
  // MY ORDERS
  // ==================================

  const loadOrders = async () => {
    if (!loggedInUser) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/orders/user/${loggedInUser.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Unable to load orders.");
        return;
      }

      if (data.success) {
        setOrders(data.orders || []);
        setShowOrders(true);
        setShowAdmin(false);

        setTimeout(() => {
          document.getElementById("orders")?.scrollIntoView({
            behavior: "smooth"
          });
        }, 100);
      }
    } catch (error) {
      console.error("Orders fetch error:", error);
      alert("Unable to load orders.");
    }
  };

  // ==================================
  // PLACE ORDER
  // ==================================

  const placeOrder = async () => {
    if (!loggedInUser) {
      alert("Please login before checkout.");
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (cart.length === 0) {
      alert("Your cart is empty.");
      return;
    }

    try {
      const orderItems = cart.map((item) => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        image: item.image
      }));

      const response = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userId: loggedInUser.id,
          items: orderItems,
          totalAmount: cartTotal,
          paymentMethod: "Cash on Delivery"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Order failed.");
        return;
      }

      alert("Order placed successfully!");
      setCart([]);
    } catch (error) {
      console.error("Order placement error:", error);
      alert("Unable to place order.");
    }
  };

  // ==================================
  // DELETE PRODUCT
  // ==================================

  const deleteAdminProduct = async (productId: string) => {
    if (!loggedInUser) return;

    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(
        `${API}/api/admin/products/${loggedInUser.id}/${productId}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to delete product.");
        return;
      }

      setProducts((previous) =>
        previous.filter((product) => product._id !== productId)
      );

      setAdminProducts((previous) =>
        previous.filter((product) => product._id !== productId)
      );

      alert("Product deleted successfully.");
    } catch (error) {
      console.error("Delete product error:", error);
      alert("Unable to delete product.");
    }
  };

  // ==================================
  // UPDATE ORDER STATUS
  // ==================================

  const updateOrderStatus = async (
    orderId: string,
    status: string
  ) => {
    if (!loggedInUser) return;

    try {
      const response = await fetch(
        `${API}/api/admin/orders/${loggedInUser.id}/${orderId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to update order status.");
        return;
      }

      setAdminOrders((previous) =>
        previous.map((order) =>
          order._id === orderId
            ? { ...order, status }
            : order
        )
      );

      alert("Order status updated successfully.");
    } catch (error) {
      console.error("Status update error:", error);
      alert("Unable to update order status.");
    }
  };

  // ==================================
  // RETURN UI
  // ==================================

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div className="logo">
          🛒 <span>QuickKart <b>AI</b></span>
        </div>

        <nav>
          <a href="#home">Home</a>
          <a href="#categories">Categories</a>
          <a href="#products">Products</a>
          <a href="#cart">Cart</a>

          {loggedInUser && (
            <button className="nav-orders-btn" onClick={loadOrders}>
              My Orders
            </button>
          )}

          {loggedInUser?.role === "admin" && (
            <button
              className="nav-orders-btn"
              onClick={() => loadAdminDashboard()}
            >
              Admin Dashboard
            </button>
          )}

          <a href="#about">About</a>
        </nav>

        <div className="header-actions">
          <button className="icon-btn">♡</button>

          <button
            className="icon-btn"
            onClick={() =>
              document.getElementById("cart")?.scrollIntoView({
                behavior: "smooth"
              })
            }
          >
            🛒 {cartItemCount}
          </button>

          {!loggedInUser ? (
            <button
              className="login-btn"
              onClick={() => {
                setAuthMode("login");
                setShowAuth(true);
              }}
            >
              Login
            </button>
          ) : (
            <button className="login-btn" onClick={logout}>
              Logout
            </button>
          )}
        </div>
      </header>

      <main>

        {/* HERO */}

        <section className="hero-section" id="home">
          <div className="hero-content">
            <p className="tagline">✨ AI-Powered Shopping</p>

            <h1>
              Shop Smarter with
              <span> QuickKart AI</span>
            </h1>

            <p className="hero-text">
              Discover products you'll love with personalized AI
              recommendations made especially for you.
            </p>

            {backendMessage && (
              <p className="backend-status">
                {backendMessage.includes("failed") ? "🔴" : "🟢"}
                {" "}Backend: {backendMessage}
              </p>
            )}

            {loggedInUser && (
              <p className="backend-status">
                👋 Welcome, {loggedInUser.name}
                {loggedInUser.role === "admin" && " • Admin"}
              </p>
            )}

            <div className="hero-buttons">
              <button
                className="primary-btn"
                onClick={() =>
                  document.getElementById("products")?.scrollIntoView({
                    behavior: "smooth"
                  })
                }
              >
                Start Shopping →
              </button>

              <button
                className="secondary-btn"
                onClick={() =>
                  document.getElementById("products")?.scrollIntoView({
                    behavior: "smooth"
                  })
                }
              >
                Explore Products
              </button>
            </div>
          </div>

          <div className="hero-card">
            <div className="shopping-icon">🛍️</div>
            <h3>Personalized For You</h3>
            <p>
              AI recommendations based on your shopping interests.
            </p>

            <div className="recommendation">
              <span>🤖</span>
              <div>
                <strong>AI Recommendation</strong>
                <small>Products selected for you</small>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}

        <section className="section" id="categories">
          <div className="section-heading">
            <p>EXPLORE</p>
            <h2>Shop by Category</h2>
          </div>

          <div className="categories">
            {[
              { name: "Electronics", icon: "📱", desc: "Latest gadgets" },
              { name: "Fashion", icon: "👕", desc: "Trendy styles" },
              { name: "Home & Living", icon: "🏠", desc: "Make your home better" },
              { name: "Gaming", icon: "🎮", desc: "Level up your game" }
            ].map((category) => (
              <div
                className="category-card"
                key={category.name}
                onClick={() => {
                  setSelectedCategory(category.name);
                  document.getElementById("products")?.scrollIntoView({
                    behavior: "smooth"
                  });
                }}
              >
                <div>{category.icon}</div>
                <h3>{category.name}</h3>
                <p>{category.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* AI INTRO */}

        <section className="ai-section">
          <div className="ai-content">
            <p className="tagline">🤖 SMART RECOMMENDATIONS</p>
            <h2>Recommended For You</h2>

            <p>
              QuickKart AI learns from your product interactions and
              helps you discover products that match your interests.
            </p>

            <button
              className="primary-btn"
              onClick={() =>
                document.getElementById("recommendations")?.scrollIntoView({
                  behavior: "smooth"
                })
              }
            >
              View Recommendations →
            </button>
          </div>
        </section>

        {/* PRODUCTS */}

        <section className="section" id="products">
          <div className="section-heading">
            <p>POPULAR</p>
            <h2>Featured Products</h2>
          </div>

          <div className="product-controls">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <select
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {loadingProducts ? (
            <div className="loading">Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="loading">
              {products.length === 0
                ? "No products available."
                : "No products found for this search or category."}
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("All");
                }}
              >
                Show All Products
              </button>
            </div>
          ) : (
            <div className="products">
              {filteredProducts.map((product) => (
                <div
                  className="product-card"
                  key={product._id}
                  onClick={() => trackProductView(product._id)}
                >
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      "🛍️"
                    )}
                  </div>

                  <span className="product-category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <strong>₹{product.price}</strong>

                  <p className="product-rating">
                    ⭐ {product.rating}
                  </p>

                  <p className="stock">
                    Stock: {product.stock}
                  </p>

                  <button
                    disabled={product.stock <= 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      addToCart(product);
                    }}
                  >
                    {product.stock <= 0 ? "Out of Stock" : "Add to Cart"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* RECOMMENDATIONS */}

        <section className="section" id="recommendations">
          <div className="section-heading">
            <p>AI POWERED</p>
            <h2>Personalized Recommendations</h2>
          </div>

          {recommendations.length === 0 ? (
            <div className="empty-cart">
              <div className="shopping-icon">🤖</div>
              <h3>Building your recommendations</h3>
              <p>
                Add or view products to help QuickKart AI understand
                your interests.
              </p>
            </div>
          ) : (
            <div className="products">
              {recommendations.map((product) => (
                <div className="product-card" key={product._id}>
                  <div className="product-image">
                    {product.image ? (
                      <img src={product.image} alt={product.name} />
                    ) : (
                      "🛍️"
                    )}
                  </div>

                  <span className="product-category">
                    {product.category}
                  </span>

                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <strong>₹{product.price}</strong>

                  <p className="product-rating">
                    ⭐ {product.rating}
                  </p>

                  <p className="stock">🤖 {product.reason}</p>

                  <p className="stock">
                    Recommendation Score: {product.recommendationScore}
                  </p>

                  <button onClick={() => addToCart(product)}>
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          )}

          {evaluation && (
            <div
              style={{
                marginTop: "30px",
                padding: "22px",
                borderRadius: "16px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                textAlign: "center"
              }}
            >
              <h3>📊 Recommendation Evaluation</h3>

              <p>
                <strong>Evaluation Method:</strong>{" "}
                Deterministic Precision@4 and Hit Rate@4
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "40px",
                  flexWrap: "wrap",
                  marginTop: "15px"
                }}
              >
                <div>
                  <strong>Precision@{evaluation.k}</strong>
                  <h2>
                    {(evaluation.precisionAtK * 100).toFixed(0)}%
                  </h2>
                </div>

                <div>
                  <strong>Hit Rate@{evaluation.k}</strong>
                  <h2>
                    {(evaluation.hitRateAtK * 100).toFixed(0)}%
                  </h2>
                </div>
              </div>

              <p style={{ marginTop: "15px", fontSize: "14px" }}>
                <strong>Recommended Products:</strong>{" "}
                {evaluation.recommendedProducts.join(", ")}
              </p>

              <p style={{ fontSize: "14px" }}>
                <strong>Relevant Products:</strong>{" "}
                {evaluation.relevantProducts.length > 0
                  ? evaluation.relevantProducts.join(", ")
                  : "None"}
              </p>

              <p style={{ fontSize: "13px", opacity: 0.75 }}>
                This evaluation uses the actual products and recommendation
                results generated by QuickKart AI. No fake accuracy value is used.
              </p>
            </div>
          )}

          <div style={{ marginTop: "25px", textAlign: "center" }}>
            <p>
              <strong>Recommendation method:</strong>{" "}
              Content-based scoring using category interest, product
              interactions, and customer rating.
            </p>
          </div>
        </section>

        {/* CART */}

        <section className="section cart-section" id="cart">
          <div className="section-heading">
            <p>YOUR CART</p>
            <h2>Shopping Cart</h2>
          </div>

          {cart.length === 0 ? (
            <div className="empty-cart">
              <div className="shopping-icon">🛒</div>
              <h3>Your cart is empty</h3>
              <p>Add some products to your cart.</p>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map((item) => (
                  <div className="cart-item" key={item._id}>
                    <div>
                      <h3>{item.name}</h3>
                      <p>₹{item.price}</p>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                      }}
                    >
                      <button
                        className="icon-btn"
                        onClick={() => decreaseQuantity(item._id)}
                      >
                        −
                      </button>

                      <strong>{item.quantity}</strong>

                      <button
                        className="icon-btn"
                        disabled={item.quantity >= item.stock}
                        onClick={() => increaseQuantity(item._id)}
                      >
                        +
                      </button>

                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item._id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <h3>Cart Summary</h3>
                <p>
                  Total Items: <strong>{cartItemCount}</strong>
                </p>
                <h2>Total: ₹{cartTotal}</h2>

                <button className="primary-btn" onClick={placeOrder}>
                  Proceed to Checkout →
                </button>
              </div>
            </>
          )}
        </section>

        {/* MY ORDERS */}

        {showOrders && (
          <section className="section orders-section" id="orders">
            <div className="section-heading">
              <p>ORDER HISTORY</p>
              <h2>My Orders</h2>
            </div>

            <div className="orders-container">
              <button
                className="close-orders-btn"
                onClick={() => setShowOrders(false)}
              >
                Close Orders
              </button>

              {orders.length === 0 ? (
                <div className="empty-cart">
                  <div className="shopping-icon">📦</div>
                  <h3>No orders yet</h3>
                  <p>Your placed orders will appear here.</p>
                </div>
              ) : (
                <div className="orders-list">
                  {orders.map((order) => (
                    <div className="order-card" key={order._id}>
                      <div className="order-header">
                        <div>
                          <h3>Order #{order._id.slice(-6)}</h3>
                          <p>
                            {new Date(order.createdAt).toLocaleString()}
                          </p>
                        </div>

                        <span className="order-status">
                          {order.status}
                        </span>
                      </div>

                      <div className="order-products">
                        {order.items.map((item, index) => (
                          <div
                            className="order-product"
                            key={`${item.productId}-${index}`}
                          >
                            <div>
                              <strong>{item.name}</strong>
                              <p>Quantity: {item.quantity}</p>
                            </div>

                            <strong>
                              ₹{item.price * item.quantity}
                            </strong>
                          </div>
                        ))}
                      </div>

                      <div className="order-footer">
                        <span>Payment: {order.paymentMethod}</span>
                        <strong>Total: ₹{order.totalAmount}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ADMIN DASHBOARD */}

        {showAdmin && loggedInUser?.role === "admin" && (
          <section className="section" id="admin">
            <div className="section-heading">
              <p>ADMIN PANEL</p>
              <h2>QuickKart AI Admin Dashboard</h2>
            </div>

            {loadingAdmin ? (
              <div className="loading">Loading Admin Dashboard...</div>
            ) : (
              <>
                {adminStats && (
                  <div className="categories">
                    <div className="category-card">
                      <div>📦</div>
                      <h3>Total Products</h3>
                      <h2>{adminStats.totalProducts}</h2>
                    </div>

                    <div className="category-card">
                      <div>👥</div>
                      <h3>Total Users</h3>
                      <h2>{adminStats.totalUsers}</h2>
                    </div>

                    <div className="category-card">
                      <div>🛒</div>
                      <h3>Total Orders</h3>
                      <h2>{adminStats.totalOrders}</h2>
                    </div>

                    <div className="category-card">
                      <div>💰</div>
                      <h3>Total Sales</h3>
                      <h2>₹{adminStats.totalSales}</h2>
                    </div>
                  </div>
                )}

                {/* ADMIN PRODUCTS */}

                <div style={{ marginTop: "60px" }}>
                  <div className="section-heading">
                    <p>MANAGEMENT</p>
                    <h2>Manage Products</h2>
                  </div>

                  {adminProducts.length === 0 ? (
                    <div className="loading">No products found.</div>
                  ) : (
                    <div className="products">
                      {adminProducts.map((product) => (
                        <div className="product-card" key={product._id}>
                          <div className="product-image">
                            {product.image ? (
                              <img src={product.image} alt={product.name} />
                            ) : (
                              "🛍️"
                            )}
                          </div>

                          <span className="product-category">
                            {product.category}
                          </span>

                          <h3>{product.name}</h3>
                          <strong>₹{product.price}</strong>
                          <p>Stock: {product.stock}</p>

                          <button
                            onClick={() => deleteAdminProduct(product._id)}
                            style={{ background: "#dc2626" }}
                          >
                            Delete Product
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ADMIN USERS */}

                <div style={{ marginTop: "60px" }}>
                  <div className="section-heading">
                    <p>USERS</p>
                    <h2>Registered Users</h2>
                  </div>

                  <div className="orders-list">
                    {adminUsers.map((user) => (
                      <div
                        className="order-card"
                        key={user.id || user._id}
                      >
                        <div className="order-header">
                          <div>
                            <h3>{user.name}</h3>
                            <p>{user.email}</p>
                          </div>

                          <span className="order-status">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ADMIN ORDERS */}

                <div style={{ marginTop: "60px" }}>
                  <div className="section-heading">
                    <p>ORDERS</p>
                    <h2>Manage Orders</h2>
                  </div>

                  {adminOrders.length === 0 ? (
                    <div className="empty-cart">
                      <div className="shopping-icon">📦</div>
                      <h3>No orders found</h3>
                    </div>
                  ) : (
                    <div className="orders-list">
                      {adminOrders.map((order) => (
                        <div className="order-card" key={order._id}>
                          <div className="order-header">
                            <div>
                              <h3>Order #{order._id.slice(-6)}</h3>

                              <p>
                                {typeof order.userId === "object" &&
                                order.userId !== null
                                  ? `${order.userId.name} - ${order.userId.email}`
                                  : "Customer"}
                              </p>
                            </div>

                            <select
                              value={order.status}
                              onChange={(event) =>
                                updateOrderStatus(
                                  order._id,
                                  event.target.value
                                )
                              }
                              style={{
                                padding: "8px",
                                borderRadius: "8px",
                                border: "1px solid #cbd5e1"
                              }}
                            >
                              <option value="Pending">Pending</option>
                              <option value="Confirmed">Confirmed</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                          </div>

                          <div className="order-products">
                            {order.items.map((item, index) => (
                              <div
                                className="order-product"
                                key={`${item.productId}-${index}`}
                              >
                                <div>
                                  <strong>{item.name}</strong>
                                  <p>Quantity: {item.quantity}</p>
                                </div>

                                <strong>
                                  ₹{item.price * item.quantity}
                                </strong>
                              </div>
                            ))}
                          </div>

                          <div className="order-footer">
                            <span>Payment: {order.paymentMethod}</span>
                            <strong>Total: ₹{order.totalAmount}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        )}

      </main>

    

     
      {/* AUTH MODAL */}

      {showAuth && (
        <div className="auth-overlay">
          <div className="auth-modal">
            <button
              className="auth-close"
              onClick={() => {
                setShowAuth(false);
                resetAuthForm();
              }}
            >
              ✕
            </button>

            <div className="auth-icon">
              {authMode === "login"
                ? "🔐"
                : authMode === "register"
                ? "👤"
                : authMode === "forgot"
                ? "📧"
                : authMode === "verifyOtp"
                ? "🔢"
                : "🔑"}
            </div>

            <h2>
              {authMode === "login"
                ? "Welcome Back"
                : authMode === "register"
                ? "Create Account"
                : authMode === "forgot"
                ? "Forgot Password?"
                : authMode === "verifyOtp"
                ? "Verify Email OTP"
                : "Reset Password"}
            </h2>

            <p className="auth-subtitle">
              {authMode === "login"
                ? "Login to continue shopping"
                : authMode === "register"
                ? "Register to start shopping"
                : authMode === "forgot"
                ? "Enter your registered email to receive an OTP"
                : authMode === "verifyOtp"
                ? "Enter the 6-digit OTP sent to your email"
                : "Create your new password"}
            </p>

            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={authName}
                onChange={(event) => setAuthName(event.target.value)}
              />
            )}

            
{(authMode === "login" ||
  authMode === "register" ||
  authMode === "forgot" ||
  authMode === "verifyOtp" ||
  authMode === "reset") && (
  <input
    type="email"
    placeholder="Email Address"
    value={authEmail}
    onChange={(event) => setAuthEmail(event.target.value)}
    readOnly={
      authMode === "verifyOtp" || authMode === "reset"
    }
  />
)}


            {(authMode === "login" || authMode === "register") && (
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
              />
            )}

            {authMode === "verifyOtp" && (
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={resetOtp}
                maxLength={6}
                onChange={(event) =>
                  setResetOtp(event.target.value.replace(/\D/g, ""))
                }
              />
            )}

            {authMode === "reset" && (
              <>
                <input
                  type="password"
                  placeholder="New Password"
                  value={authPassword}
                  onChange={(event) => setAuthPassword(event.target.value)}
                />

                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </>
            )}

            {authMode === "login" && (
              <p className="auth-switch">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("forgot");
                    setResetMessage("");
                    setAuthPassword("");
                  }}
                  style={{ color: "#2563eb", fontWeight: "bold" }}
                >
                  Forgot Password?
                </button>
              </p>
            )}

            <button
              className="auth-submit"
              onClick={() => {
                if (authMode === "login" || authMode === "register") {
                  handleAuth();
                } else if (authMode === "forgot") {
                  handleForgotPassword();
                } else if (authMode === "verifyOtp") {
                  handleVerifyOtp();
                } else {
                  handleResetPassword();
                }
              }}
            >
              {authMode === "login"
                ? "Login"
                : authMode === "register"
                ? "Register"
                : authMode === "forgot"
                ? "Send OTP"
                : authMode === "verifyOtp"
                ? "Verify OTP"
                : "Update Password"}
            </button>

            {resetMessage && (
              <p
                style={{
                  color: "#15803d",
                  marginTop: "12px",
                  textAlign: "center",
                }}
              >
                {resetMessage}
              </p>
            )}

            {(authMode === "login" || authMode === "register") ? (
              <p className="auth-switch">
                {authMode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}

                <button
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    resetAuthForm();
                  }}
                >
                  {authMode === "login" ? "Register" : "Login"}
                </button>
              </p>
            ) : (
              <p className="auth-switch">
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setResetMessage("");
                    setResetOtp("");
                    setOtpVerified(false);
                    setAuthPassword("");
                    setConfirmPassword("");
                  }}
                >
                  Back to Login
                </button>
              </p>
            )}
          </div>
        </div>
      )}


      {/* FOOTER */}

      <footer id="about">
        <div>
          <h3>🛒 QuickKart AI</h3>
          <p>AI-powered e-commerce platform.</p>
        </div>

        <p>© 2026 QuickKart AI. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
