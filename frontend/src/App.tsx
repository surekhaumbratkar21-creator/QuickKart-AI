import "./App.css";
import { useEffect, useState } from "react";
import { evaluateRecommendations } from "./recommendationEvaluation";

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

type CartItem = Product & {
  quantity: number;
};

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
  userId:
    | string
    | {
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

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>([]);

  const [viewedProductIds, setViewedProductIds] =
    useState<string[]>([]);

  const [evaluation, setEvaluation] =
    useState<Evaluation | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [backendMessage, setBackendMessage] =
    useState("");

  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loggedInUser, setLoggedInUser] =
    useState<User | null>(null);

  const [showAuth, setShowAuth] =
    useState(false);

  const [authMode, setAuthMode] =
    useState<"login" | "register">("login");

  const [authName, setAuthName] =
    useState("");

  const [authEmail, setAuthEmail] =
    useState("");

  const [authPassword, setAuthPassword] =
    useState("");

  const [showOrders, setShowOrders] =
    useState(false);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [showAdmin, setShowAdmin] =
    useState(false);

  const [adminStats, setAdminStats] =
    useState<AdminStats | null>(null);

  const [adminProducts, setAdminProducts] =
    useState<Product[]>([]);

  const [adminUsers, setAdminUsers] =
    useState<User[]>([]);

  const [adminOrders, setAdminOrders] =
    useState<Order[]>([]);

  const [loadingAdmin, setLoadingAdmin] =
    useState(false);

  // ==============================
  // FETCH BACKEND + PRODUCTS
  // ==============================

  useEffect(() => {
    const savedViewedProducts =
      localStorage.getItem(
        "quickkart_viewed_products"
      );

    if (savedViewedProducts) {
      try {
        const parsed =
          JSON.parse(savedViewedProducts);

        if (Array.isArray(parsed)) {
          setViewedProductIds(parsed);
        }
      } catch (error) {
        console.error(
          "Viewed product history error:",
          error
        );
      }
    }

    fetch("http://localhost:5000")
      .then((response) => response.json())
      .then((data) => {
        setBackendMessage(data.message);
      })
      .catch((error) => {
        console.error(
          "Backend connection error:",
          error
        );
      });

    fetch(
      "http://localhost:5000/api/products"
    )
      .then((response) => response.json())
      .then((data) => {
        setProducts(data.products || []);
      })
      .catch((error) => {
        console.error(
          "Products fetch error:",
          error
        );
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "quickkart_viewed_products",
      JSON.stringify(viewedProductIds)
    );
  }, [viewedProductIds]);

  // ==============================
  // CART
  // ==============================

  const addToCart = (product: Product) => {
    setViewedProductIds((previousIds) =>
      previousIds.includes(product._id)
        ? previousIds
        : [...previousIds, product._id]
    );

    setCart((previousCart) => {
      const existingProduct =
        previousCart.find(
          (item) =>
            item._id === product._id
        );

      if (existingProduct) {
        return previousCart.map((item) =>
          item._id === product._id
            ? {
                ...item,
                quantity:
                  item.quantity + 1
              }
            : item
        );
      }

      return [
        ...previousCart,
        {
          ...product,
          quantity: 1
        }
      ];
    });
  };

  const trackProductView = (
    productId: string
  ) => {
    setViewedProductIds((previousIds) =>
      previousIds.includes(productId)
        ? previousIds
        : [...previousIds, productId]
    );
  };

  const increaseQuantity = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart.map((item) =>
        item._id === productId
          ? {
              ...item,
              quantity:
                item.quantity + 1
            }
          : item
      )
    );
  };

  const decreaseQuantity = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart
        .map((item) =>
          item._id === productId
            ? {
                ...item,
                quantity:
                  item.quantity - 1
              }
            : item
        )
        .filter(
          (item) => item.quantity > 0
        )
    );
  };

  const removeFromCart = (
    productId: string
  ) => {
    setCart((previousCart) =>
      previousCart.filter(
        (item) =>
          item._id !== productId
      )
    );
  };

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      item.price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce(
    (total, item) =>
      total + item.quantity,
    0
  );

  // ==============================
  // FILTER PRODUCTS
  // ==============================

  const categories = [
    "All",
    ...Array.from(
      new Set(
        products.map(
          (product) => product.category
        )
      )
    )
  ];

  const filteredProducts =
    products.filter((product) => {
      const matchesSearch =
        product.name
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          ) ||
        product.description
          .toLowerCase()
          .includes(
            searchTerm.toLowerCase()
          );

      const matchesCategory =
        selectedCategory === "All" ||
        product.category ===
          selectedCategory;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  // ==============================
  // AI RECOMMENDATIONS
  // CONTENT-BASED SCORING MODEL
  // ==============================

  useEffect(() => {
    if (products.length === 0) {
      setRecommendations([]);
      return;
    }

    const candidateProducts =
      products.filter(
        (product) =>
          !cart.some(
            (item) =>
              item._id === product._id
          )
      );

    if (candidateProducts.length === 0) {
      setRecommendations([]);
      return;
    }

    const cartCategories =
      cart.map(
        (item) => item.category
      );

    const viewedProducts =
      products.filter((product) =>
        viewedProductIds.includes(
          product._id
        )
      );

    const viewedCategories =
      viewedProducts.map(
        (product) =>
          product.category
      );

    const hasInteraction =
      cartCategories.length > 0 ||
      viewedProductIds.length > 0;

    const scoredRecommendations:
      Recommendation[] =
      candidateProducts.map(
        (product) => {
          let score = 0;
          const reasons: string[] = [];

          if (
            cartCategories.includes(
              product.category
            )
          ) {
            score += 50;
            reasons.push(
              "matches your cart category"
            );
          }

          if (
            viewedCategories.includes(
              product.category
            )
          ) {
            score += 30;
            reasons.push(
              "matches products you viewed"
            );
          }

          const ratingScore =
            Math.min(
              Math.max(
                product.rating,
                0
              ),
              5
            ) * 4;

          score += ratingScore;

          if (product.rating >= 4.5) {
            reasons.push(
              "high customer rating"
            );
          }

          if (!hasInteraction) {
            score = ratingScore;
            reasons.length = 0;

            if (
              product.rating >= 4.5
            ) {
              reasons.push(
                "high customer rating"
              );
            } else {
              reasons.push(
                "popular quality product"
              );
            }
          }

          return {
            ...product,
            recommendationScore:
              Math.round(
                score * 10
              ) / 10,
            reason:
              reasons.length > 0
                ? reasons.join(" • ")
                : "recommended for you"
          };
        }
      );

    scoredRecommendations.sort(
      (a, b) =>
        b.recommendationScore -
          a.recommendationScore ||
        b.rating - a.rating ||
        a.name.localeCompare(
          b.name
        )
    );

    setRecommendations(
      scoredRecommendations.slice(
        0,
        4
      )
    );
  }, [
    cart,
    products,
    viewedProductIds
  ]);

  // ==============================
  // RECOMMENDATION EVALUATION
  // DETERMINISTIC TEST
  // ==============================

  useEffect(() => {
    if (
      recommendations.length === 0 ||
      products.length === 0
    ) {
      setEvaluation(null);
      return;
    }

    const cartCategories =
      new Set(
        cart.map(
          (item) => item.category
        )
      );

    const viewedCategories =
      new Set(
        products
          .filter((product) =>
            viewedProductIds.includes(
              product._id
            )
          )
          .map(
            (product) =>
              product.category
          )
      );

    const interestCategories =
      new Set([
        ...cartCategories,
        ...viewedCategories
      ]);

    if (
      interestCategories.size === 0
    ) {
      setEvaluation(null);
      return;
    }

    const relevantProducts =
      products.filter(
        (product) =>
          interestCategories.has(
            product.category
          ) &&
          !cart.some(
            (item) =>
              item._id === product._id
          )
      );

    const result =
      evaluateRecommendations(
        recommendations,
        relevantProducts,
        4
      );

    setEvaluation(result);
  }, [
    recommendations,
    products,
    cart,
    viewedProductIds
  ]);

  // ==============================
  // ADMIN DASHBOARD
  // ==============================

  const loadAdminDashboard =
    async (
      userOverride?: User
    ) => {
      const currentUser =
        userOverride ||
        loggedInUser;

      if (!currentUser) {
        alert(
          "Please login as admin."
        );

        setAuthMode("login");
        setShowAuth(true);
        return;
      }

      if (
        currentUser.role !==
        "admin"
      ) {
        alert(
          "Access denied. Admin account required."
        );
        return;
      }

      try {
        setLoadingAdmin(true);
        setShowAdmin(true);
        setShowOrders(false);

        const userId =
          currentUser.id;

        const [
          statsResponse,
          productsResponse,
          usersResponse,
          ordersResponse
        ] = await Promise.all([
          fetch(
            `http://localhost:5000/api/admin/stats/${userId}`
          ),
          fetch(
            `http://localhost:5000/api/admin/products/${userId}`
          ),
          fetch(
            `http://localhost:5000/api/admin/users/${userId}`
          ),
          fetch(
            `http://localhost:5000/api/admin/orders/${userId}`
          )
        ]);

        const statsData =
          await statsResponse.json();

        const productsData =
          await productsResponse.json();

        const usersData =
          await usersResponse.json();

        const ordersData =
          await ordersResponse.json();

        if (!statsResponse.ok) {
          alert(
            statsData.message ||
              "Admin access denied."
          );

          setShowAdmin(false);
          return;
        }

        setAdminStats(
          statsData.stats
        );

        setAdminProducts(
          productsData.products ||
            []
        );

        setAdminUsers(
          usersData.users || []
        );

        setAdminOrders(
          ordersData.orders || []
        );

        setTimeout(() => {
          document
            .getElementById(
              "admin"
            )
            ?.scrollIntoView({
              behavior: "smooth"
            });
        }, 100);
      } catch (error) {
        console.error(
          "Admin dashboard error:",
          error
        );

        alert(
          "Unable to load admin dashboard."
        );
      } finally {
        setLoadingAdmin(false);
      }
    };

  // ==============================
  // LOGIN / REGISTER
  // ==============================

  const resetAuthForm = () => {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
  };

  const handleAuth = async () => {
    try {
      const endpoint =
        authMode === "login"
          ? "http://localhost:5000/api/auth/login"
          : "http://localhost:5000/api/auth/register";

      const body =
        authMode === "login"
          ? {
              email: authEmail,
              password:
                authPassword
            }
          : {
              name: authName,
              email: authEmail,
              password:
                authPassword
            };

      const response =
        await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify(body)
        });

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Authentication failed"
        );
        return;
      }

      if (authMode === "login") {
        const user: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role:
            data.user.role ===
            "admin"
              ? "admin"
              : "user"
        };

        console.log(
          "QuickKart Login User:",
          user
        );

        console.log(
          "QuickKart Login Role:",
          user.role
        );

        setLoggedInUser(user);

        alert(
          user.role === "admin"
            ? "Admin login successful! 🎉"
            : "Login successful!"
        );

        setShowAuth(false);
        setShowOrders(false);
        resetAuthForm();

        if (user.role === "admin") {
          setTimeout(() => {
            loadAdminDashboard(user);
          }, 300);
        }
      } else {
        alert(
          "Registration successful! Please login."
        );

        setAuthMode("login");
        setAuthName("");
        setAuthPassword("");
      }
    } catch (error) {
      console.error(
        "Authentication error:",
        error
      );

      alert(
        "Unable to connect to backend."
      );
    }
  };

  const logout = () => {
    setLoggedInUser(null);
    setShowAdmin(false);
    setShowOrders(false);
    setOrders([]);
    setAdminStats(null);
    setAdminProducts([]);
    setAdminUsers([]);
    setAdminOrders([]);

    alert(
      "Logged out successfully."
    );
  };

  // ==============================
  // MY ORDERS
  // ==============================

  const loadOrders = async () => {
    if (!loggedInUser) {
      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    try {
      const response =
        await fetch(
          `http://localhost:5000/api/orders/user/${loggedInUser.id}`
        );

      const data =
        await response.json();

      if (data.success) {
        setOrders(
          data.orders || []
        );

        setShowOrders(true);
        setShowAdmin(false);

        setTimeout(() => {
          document
            .getElementById(
              "orders"
            )
            ?.scrollIntoView({
              behavior: "smooth"
            });
        }, 100);
      }
    } catch (error) {
      console.error(
        "Orders fetch error:",
        error
      );
    }
  };

  // ==============================
  // PLACE ORDER
  // ==============================

  const placeOrder = async () => {
    if (!loggedInUser) {
      alert(
        "Please login before checkout."
      );

      setAuthMode("login");
      setShowAuth(true);
      return;
    }

    if (cart.length === 0) {
      alert(
        "Your cart is empty."
      );
      return;
    }

    try {
      const orderItems =
        cart.map((item) => ({
          productId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        }));

      const response =
        await fetch(
          "http://localhost:5000/api/orders",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              userId:
                loggedInUser.id,
              items: orderItems,
              totalAmount:
                cartTotal,
              paymentMethod:
                "Cash on Delivery"
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Order failed"
        );
        return;
      }

      alert(
        "Order placed successfully! 🎉"
      );

      setCart([]);
    } catch (error) {
      console.error(
        "Order placement error:",
        error
      );

      alert(
        "Unable to place order."
      );
    }
  };

  // ==============================
  // DELETE PRODUCT - ADMIN
  // ==============================

  const deleteAdminProduct =
    async (
      productId: string
    ) => {
      if (!loggedInUser) return;

      const confirmDelete =
        window.confirm(
          "Are you sure you want to delete this product?"
        );

      if (!confirmDelete) return;

      try {
        const response =
          await fetch(
            `http://localhost:5000/api/admin/products/${loggedInUser.id}/${productId}`,
            {
              method: "DELETE"
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data.message ||
              "Failed to delete product"
          );
          return;
        }

        alert(
          "Product deleted successfully."
        );

        await loadAdminDashboard();

        const productsResponse =
          await fetch(
            "http://localhost:5000/api/products"
          );

        const productsData =
          await productsResponse.json();

        setProducts(
          productsData.products ||
            []
        );
      } catch (error) {
        console.error(
          "Delete product error:",
          error
        );

        alert(
          "Unable to delete product."
        );
      }
    };

  // ==============================
  // UPDATE ORDER STATUS - ADMIN
  // ==============================

  const updateOrderStatus =
    async (
      orderId: string,
      status: string
    ) => {
      if (!loggedInUser) return;

      try {
        const response =
          await fetch(
            `http://localhost:5000/api/admin/orders/${loggedInUser.id}/${orderId}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                status
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          alert(
            data.message ||
              "Failed to update status"
          );
          return;
        }

        setAdminOrders(
          (previousOrders) =>
            previousOrders.map(
              (order) =>
                order._id ===
                orderId
                  ? {
                      ...order,
                      status
                    }
                  : order
            )
        );

        alert(
          "Order status updated successfully."
        );
      } catch (error) {
        console.error(
          "Status update error:",
          error
        );

        alert(
          "Unable to update order status."
        );
      }
    };

  return (
    <div className="app">

      {/* ================= HEADER ================= */}

      <header className="header">

        <div className="logo">
          🛒{" "}
          <span>
            QuickKart <b>AI</b>
          </span>
        </div>

        <nav>
          <a href="#home">
            Home
          </a>

          <a href="#categories">
            Categories
          </a>

          <a href="#products">
            Products
          </a>

          <a href="#cart">
            Cart
          </a>

          {loggedInUser && (
            <button
              className="nav-orders-btn"
              onClick={loadOrders}
            >
              My Orders
            </button>
          )}

          {loggedInUser?.role ===
            "admin" && (
            <button
              className="nav-orders-btn"
              onClick={() =>
                loadAdminDashboard()
              }
            >
              Admin Dashboard
            </button>
          )}

          <a href="#about">
            About
          </a>
        </nav>

        <div className="header-actions">

          <button className="icon-btn">
            ♡
          </button>

          <button
            className="icon-btn"
            onClick={() => {
              document
                .getElementById(
                  "cart"
                )
                ?.scrollIntoView({
                  behavior: "smooth"
                });
            }}
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
            <button
              className="login-btn"
              onClick={logout}
            >
              Logout
            </button>
          )}

        </div>

      </header>

      {/* ================= MAIN ================= */}

      <main>

        {/* ================= HERO ================= */}

        <section
          className="hero-section"
          id="home"
        >

          <div className="hero-content">

            <p className="tagline">
              ✨ AI-Powered Shopping
            </p>

            <h1>
              Shop Smarter with
              <span>
                {" "}
                QuickKart AI
              </span>
            </h1>

            <p className="hero-text">
              Discover products you'll
              love with personalized AI
              recommendations made
              especially for you.
            </p>

            {backendMessage && (
              <p className="backend-status">
                🟢 Backend:{" "}
                {backendMessage}
              </p>
            )}

            {loggedInUser && (
              <p className="backend-status">
                👋 Welcome,{" "}
                {loggedInUser.name}
                {loggedInUser.role ===
                  "admin" && (
                  <> • Admin</>
                )}
              </p>
            )}

            <div className="hero-buttons">

              <button
                className="primary-btn"
                onClick={() => {
                  document
                    .getElementById(
                      "products"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth"
                    });
                }}
              >
                Start Shopping →
              </button>

              <button
                className="secondary-btn"
                onClick={() => {
                  document
                    .getElementById(
                      "products"
                    )
                    ?.scrollIntoView({
                      behavior: "smooth"
                    });
                }}
              >
                Explore Products
              </button>

            </div>

          </div>

          <div className="hero-card">

            <div className="shopping-icon">
              🛍️
            </div>

            <h3>
              Personalized For You
            </h3>

            <p>
              AI recommendations based
              on your shopping interests.
            </p>

            <div className="recommendation">

              <span>
                🤖
              </span>

              <div>
                <strong>
                  AI Recommendation
                </strong>

                <small>
                  Products selected
                  for you
                </small>
              </div>

            </div>

          </div>

        </section>

        {/* ================= CATEGORIES ================= */}

        <section
          className="section"
          id="categories"
        >

          <div className="section-heading">

            <p>
              EXPLORE
            </p>

            <h2>
              Shop by Category
            </h2>

          </div>

          <div className="categories">

            <div
              className="category-card"
              onClick={() =>
                setSelectedCategory(
                  "Electronics"
                )
              }
            >
              <div>📱</div>

              <h3>
                Electronics
              </h3>

              <p>
                Latest gadgets
              </p>
            </div>

            <div
              className="category-card"
              onClick={() =>
                setSelectedCategory(
                  "Fashion"
                )
              }
            >
              <div>👕</div>

              <h3>
                Fashion
              </h3>

              <p>
                Trendy styles
              </p>
            </div>

            <div
              className="category-card"
              onClick={() =>
                setSelectedCategory(
                  "Home & Living"
                )
              }
            >
              <div>🏠</div>

              <h3>
                Home & Living
              </h3>

              <p>
                Make your home better
              </p>
            </div>

            <div
              className="category-card"
              onClick={() =>
                setSelectedCategory(
                  "Gaming"
                )
              }
            >
              <div>🎮</div>

              <h3>
                Gaming
              </h3>

              <p>
                Level up your game
              </p>
            </div>

          </div>

        </section>

        {/* ================= AI SECTION ================= */}

        <section className="ai-section">

          <div className="ai-content">

            <p className="tagline">
              🤖 SMART RECOMMENDATIONS
            </p>

            <h2>
              Recommended For You
            </h2>

            <p>
              QuickKart AI learns from
              your product interactions
              and helps you discover
              products that match
              your interests.
            </p>

            <button
              className="primary-btn"
              onClick={() => {
                document
                  .getElementById(
                    "recommendations"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth"
                  });
              }}
            >
              View Recommendations →
            </button>

          </div>

        </section>

        {/* ================= PRODUCTS ================= */}

        <section
          className="section"
          id="products"
        >

          <div className="section-heading">

            <p>
              POPULAR
            </p>

            <h2>
              Featured Products
            </h2>

          </div>

          <div className="product-controls">

            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />

            <select
              value={selectedCategory}
              onChange={(event) =>
                setSelectedCategory(
                  event.target.value
                )
              }
            >

              {categories.map(
                (category) => (
                  <option
                    key={category}
                    value={category}
                  >
                    {category}
                  </option>
                )
              )}

            </select>

          </div>

          {filteredProducts.length ===
          0 ? (

            <div className="loading">
              No products found.
            </div>

          ) : (

            <div className="products">

              {filteredProducts.map(
                (product) => (

                  <div
                    className="product-card"
                    key={product._id}
                    onClick={() =>
                      trackProductView(
                        product._id
                      )
                    }
                  >

                    <div className="product-image">

                      {product.image ? (
                        <img
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                        />
                      ) : (
                        "🛍️"
                      )}

                    </div>

                    <span className="product-category">
                      {product.category}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.description}
                    </p>

                    <strong>
                      ₹{product.price}
                    </strong>

                    <p className="product-rating">
                      ⭐{" "}
                      {product.rating}
                    </p>

                    <p className="stock">
                      Stock:{" "}
                      {product.stock}
                    </p>

                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(
                          product
                        );
                      }}
                    >
                      Add to Cart
                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* ================= RECOMMENDATIONS ================= */}

        <section
          className="section"
          id="recommendations"
        >

          <div className="section-heading">

            <p>
              AI POWERED
            </p>

            <h2>
              Personalized Recommendations
            </h2>

          </div>

          {recommendations.length ===
          0 ? (

            <div className="empty-cart">

              <div className="shopping-icon">
                🤖
              </div>

              <h3>
                Building your
                recommendations
              </h3>

              <p>
                Add or view products to
                help QuickKart AI
                understand your interests.
              </p>

            </div>

          ) : (

            <div className="products">

              {recommendations.map(
                (product) => (

                  <div
                    className="product-card"
                    key={product._id}
                  >

                    <div className="product-image">

                      {product.image ? (
                        <img
                          src={
                            product.image
                          }
                          alt={
                            product.name
                          }
                        />
                      ) : (
                        "🛍️"
                      )}

                    </div>

                    <span className="product-category">
                      {product.category}
                    </span>

                    <h3>
                      {product.name}
                    </h3>

                    <p>
                      {product.description}
                    </p>

                    <strong>
                      ₹{product.price}
                    </strong>

                    <p className="product-rating">
                      ⭐{" "}
                      {product.rating}
                    </p>

                    <p className="stock">
                      🤖{" "}
                      {product.reason}
                    </p>

                    <p className="stock">
                      Recommendation Score:{" "}
                      {
                        product.recommendationScore
                      }
                    </p>

                    <button
                      onClick={() =>
                        addToCart(
                          product
                        )
                      }
                    >
                      Add to Cart
                    </button>

                  </div>

                )
              )}

            </div>

          )}

          {/* ================= EVALUATION ================= */}

          {evaluation && (
            <div
              style={{
                marginTop: "30px",
                padding: "22px",
                borderRadius: "16px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                textAlign: "center"
              }}
            >

              <h3>
                📊 Recommendation
                Evaluation
              </h3>

              <p>
                <strong>
                  Evaluation Method:
                </strong>{" "}
                Deterministic
                Precision@4 and
                Hit Rate@4
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "center",
                  gap: "40px",
                  flexWrap: "wrap",
                  marginTop: "15px"
                }}
              >

                <div>

                  <strong>
                    Precision@
                    {evaluation.k}
                  </strong>

                  <h2>
                    {(
                      evaluation.precisionAtK *
                      100
                    ).toFixed(0)}
                    %
                  </h2>

                </div>

                <div>

                  <strong>
                    Hit Rate@
                    {evaluation.k}
                  </strong>

                  <h2>
                    {(
                      evaluation.hitRateAtK *
                      100
                    ).toFixed(0)}
                    %
                  </h2>

                </div>

              </div>

              <p
                style={{
                  marginTop: "15px",
                  fontSize: "14px"
                }}
              >
                <strong>
                  Recommended Products:
                </strong>{" "}
                {evaluation
                  .recommendedProducts
                  .join(", ")}
              </p>

              <p
                style={{
                  fontSize: "14px"
                }}
              >
                <strong>
                  Relevant Products:
                </strong>{" "}
                {evaluation
                  .relevantProducts
                  .length > 0
                  ? evaluation
                      .relevantProducts
                      .join(", ")
                  : "None"}
              </p>

              <p
                style={{
                  fontSize: "13px",
                  opacity: 0.75,
                  marginTop: "12px"
                }}
              >
                This evaluation uses
                the actual products and
                recommendation results
                generated by QuickKart AI.
                No fake accuracy value is
                used.
              </p>

            </div>
          )}

          <div
            style={{
              marginTop: "25px",
              textAlign: "center",
              opacity: 0.85
            }}
          >

            <p>
              <strong>
                Recommendation method:
              </strong>{" "}
              Content-based scoring using
              category interest, product
              interactions, and customer
              rating.
            </p>

          </div>

        </section>

        {/* ================= CART ================= */}

        <section
          className="section cart-section"
          id="cart"
        >

          <div className="section-heading">

            <p>
              YOUR CART
            </p>

            <h2>
              Shopping Cart
            </h2>

          </div>

          {cart.length === 0 ? (

            <div className="empty-cart">

              <div className="shopping-icon">
                🛒
              </div>

              <h3>
                Your cart is empty
              </h3>

              <p>
                Add some products to
                your cart.
              </p>

            </div>

          ) : (

            <>

              <div className="cart-items">

                {cart.map((item) => (

                  <div
                    className="cart-item"
                    key={item._id}
                  >

                    <div>

                      <h3>
                        {item.name}
                      </h3>

                      <p>
                        ₹{item.price}
                      </p>

                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems:
                          "center",
                        gap: "10px"
                      }}
                    >

                      <button
                        className="icon-btn"
                        onClick={() =>
                          decreaseQuantity(
                            item._id
                          )
                        }
                      >
                        −
                      </button>

                      <strong>
                        {item.quantity}
                      </strong>

                      <button
                        className="icon-btn"
                        onClick={() =>
                          increaseQuantity(
                            item._id
                          )
                        }
                      >
                        +
                      </button>

                      <button
                        className="remove-btn"
                        onClick={() =>
                          removeFromCart(
                            item._id
                          )
                        }
                      >
                        Remove
                      </button>

                    </div>

                  </div>

                ))}

              </div>

              <div className="cart-summary">

                <h3>
                  Cart Summary
                </h3>

                <p>
                  Total Items:{" "}
                  <strong>
                    {cartItemCount}
                  </strong>
                </p>

                <h2>
                  Total: ₹
                  {cartTotal}
                </h2>

                <button
                  className="primary-btn"
                  onClick={
                    placeOrder
                  }
                >
                  Proceed to Checkout →
                </button>

              </div>

            </>

          )}

        </section>

        {/* ================= MY ORDERS ================= */}

        {showOrders && (
          <section
            className="section orders-section"
            id="orders"
          >

            <div className="section-heading">

              <p>
                ORDER HISTORY
              </p>

              <h2>
                My Orders
              </h2>

            </div>

            <div className="orders-container">

              <button
                className="close-orders-btn"
                onClick={() =>
                  setShowOrders(
                    false
                  )
                }
              >
                Close Orders
              </button>

              {orders.length === 0 ? (

                <div className="empty-cart">

                  <div className="shopping-icon">
                    📦
                  </div>

                  <h3>
                    No orders yet
                  </h3>

                  <p>
                    Your placed orders
                    will appear here.
                  </p>

                </div>

              ) : (

                <div className="orders-list">

                  {orders.map(
                    (order) => (

                      <div
                        className="order-card"
                        key={order._id}
                      >

                        <div className="order-header">

                          <div>

                            <h3>
                              Order #
                              {order._id.slice(
                                -6
                              )}
                            </h3>

                            <p>
                              {new Date(
                                order.createdAt
                              ).toLocaleString()}
                            </p>

                          </div>

                          <span className="order-status">
                            {
                              order.status
                            }
                          </span>

                        </div>

                        <div className="order-products">

                          {order.items.map(
                            (
                              item,
                              index
                            ) => (

                              <div
                                className="order-product"
                                key={`${item.productId}-${index}`}
                              >

                                <div>

                                  <strong>
                                    {
                                      item.name
                                    }
                                  </strong>

                                  <p>
                                    Quantity:{" "}
                                    {
                                      item.quantity
                                    }
                                  </p>

                                </div>

                                <strong>
                                  ₹
                                  {item.price *
                                    item.quantity}
                                </strong>

                              </div>

                            )
                          )}

                        </div>

                        <div className="order-footer">

                          <span>
                            Payment:{" "}
                            {
                              order.paymentMethod
                            }
                          </span>

                          <strong>
                            Total: ₹
                            {
                              order.totalAmount
                            }
                          </strong>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          </section>
        )}

        {/* ================= ADMIN DASHBOARD ================= */}

        {showAdmin &&
          loggedInUser?.role ===
            "admin" && (
            <section
              className="section"
              id="admin"
            >

              <div className="section-heading">

                <p>
                  ADMIN PANEL
                </p>

                <h2>
                  QuickKart AI Admin
                  Dashboard
                </h2>

              </div>

              {loadingAdmin ? (

                <div className="loading">
                  Loading Admin
                  Dashboard...
                </div>

              ) : (

                <>

                  {/* ADMIN STATS */}

                  {adminStats && (
                    <div className="categories">

                      <div className="category-card">

                        <div>
                          📦
                        </div>

                        <h3>
                          Total Products
                        </h3>

                        <h2>
                          {
                            adminStats.totalProducts
                          }
                        </h2>

                      </div>

                      <div className="category-card">

                        <div>
                          👥
                        </div>

                        <h3>
                          Total Users
                        </h3>

                        <h2>
                          {
                            adminStats.totalUsers
                          }
                        </h2>

                      </div>

                      <div className="category-card">

                        <div>
                          🛒
                        </div>

                        <h3>
                          Total Orders
                        </h3>

                        <h2>
                          {
                            adminStats.totalOrders
                          }
                        </h2>

                      </div>

                      <div className="category-card">

                        <div>
                          💰
                        </div>

                        <h3>
                          Total Sales
                        </h3>

                        <h2>
                          ₹
                          {
                            adminStats.totalSales
                          }
                        </h2>

                      </div>

                    </div>
                  )}

                  {/* ADMIN PRODUCTS */}

                  <div
                    style={{
                      marginTop:
                        "60px"
                    }}
                  >

                    <div className="section-heading">

                      <p>
                        MANAGEMENT
                      </p>

                      <h2>
                        Manage Products
                      </h2>

                    </div>

                    {adminProducts.length ===
                    0 ? (

                      <div className="loading">
                        No products found.
                      </div>

                    ) : (

                      <div className="products">

                        {adminProducts.map(
                          (product) => (

                            <div
                              className="product-card"
                              key={
                                product._id
                              }
                            >

                              <div className="product-image">

                                {product.image ? (
                                  <img
                                    src={
                                      product.image
                                    }
                                    alt={
                                      product.name
                                    }
                                  />
                                ) : (
                                  "🛍️"
                                )}

                              </div>

                              <span className="product-category">
                                {
                                  product.category
                                }
                              </span>

                              <h3>
                                {
                                  product.name
                                }
                              </h3>

                              <strong>
                                ₹
                                {
                                  product.price
                                }
                              </strong>

                              <p>
                                Stock:{" "}
                                {
                                  product.stock
                                }
                              </p>

                              <button
                                onClick={() =>
                                  deleteAdminProduct(
                                    product._id
                                  )
                                }
                                style={{
                                  background:
                                    "#dc2626"
                                }}
                              >
                                Delete Product
                              </button>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                  {/* ADMIN USERS */}

                  <div
                    style={{
                      marginTop:
                        "60px"
                    }}
                  >

                    <div className="section-heading">

                      <p>
                        USERS
                      </p>

                      <h2>
                        Registered Users
                      </h2>

                    </div>

                    <div className="orders-list">

                      {adminUsers.map(
                        (user) => (

                          <div
                            className="order-card"
                            key={
                              user.id ||
                              user._id
                            }
                          >

                            <div className="order-header">

                              <div>

                                <h3>
                                  {
                                    user.name
                                  }
                                </h3>

                                <p>
                                  {
                                    user.email
                                  }
                                </p>

                              </div>

                              <span className="order-status">
                                {
                                  user.role
                                }
                              </span>

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  </div>

                  {/* ADMIN ORDERS */}

                  <div
                    style={{
                      marginTop:
                        "60px"
                    }}
                  >

                    <div className="section-heading">

                      <p>
                        ORDERS
                      </p>

                      <h2>
                        Manage Orders
                      </h2>

                    </div>

                    {adminOrders.length ===
                    0 ? (

                      <div className="empty-cart">

                        <div className="shopping-icon">
                          📦
                        </div>

                        <h3>
                          No orders found
                        </h3>

                      </div>

                    ) : (

                      <div className="orders-list">

                        {adminOrders.map(
                          (order) => (

                            <div
                              className="order-card"
                              key={
                                order._id
                              }
                            >

                              <div className="order-header">

                                <div>

                                  <h3>
                                    Order #
                                    {order._id.slice(
                                      -6
                                    )}
                                  </h3>

                                  <p>
                                    {typeof order.userId ===
                                    "object"
                                      ? `${order.userId.name} - ${order.userId.email}`
                                      : "Customer"}
                                  </p>

                                </div>

                                <select
                                  value={
                                    order.status
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    updateOrderStatus(
                                      order._id,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                  style={{
                                    padding:
                                      "8px",
                                    borderRadius:
                                      "8px",
                                    border:
                                      "1px solid #cbd5e1"
                                  }}
                                >

                                  <option value="Pending">
                                    Pending
                                  </option>

                                  <option value="Confirmed">
                                    Confirmed
                                  </option>

                                  <option value="Shipped">
                                    Shipped
                                  </option>

                                  <option value="Delivered">
                                    Delivered
                                  </option>

                                  <option value="Cancelled">
                                    Cancelled
                                  </option>

                                </select>

                              </div>

                              <div className="order-products">

                                {order.items.map(
                                  (
                                    item,
                                    index
                                  ) => (

                                    <div
                                      className="order-product"
                                      key={`${item.productId}-${index}`}
                                    >

                                      <div>

                                        <strong>
                                          {
                                            item.name
                                          }
                                        </strong>

                                        <p>
                                          Quantity:{" "}
                                          {
                                            item.quantity
                                          }
                                        </p>

                                      </div>

                                      <strong>
                                        ₹
                                        {item.price *
                                          item.quantity}
                                      </strong>

                                    </div>

                                  )
                                )}

                              </div>

                              <div className="order-footer">

                                <span>
                                  Payment:{" "}
                                  {
                                    order.paymentMethod
                                  }
                                </span>

                                <strong>
                                  Total: ₹
                                  {
                                    order.totalAmount
                                  }
                                </strong>

                              </div>

                            </div>

                          )
                        )}

                      </div>

                    )}

                  </div>

                </>

              )}

            </section>
          )}

      </main>

      {/* ================= AUTH MODAL ================= */}

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
              {authMode ===
              "login"
                ? "🔐"
                : "👤"}
            </div>

            <h2>
              {authMode ===
              "login"
                ? "Welcome Back"
                : "Create Account"}
            </h2>

            <p className="auth-subtitle">
              {authMode ===
              "login"
                ? "Login to continue shopping"
                : "Register to start shopping"}
            </p>

            {authMode ===
              "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={authName}
                onChange={(event) =>
                  setAuthName(
                    event.target.value
                  )
                }
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(event) =>
                setAuthEmail(
                  event.target.value
                )
              }
            />

            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(event) =>
                setAuthPassword(
                  event.target.value
                )
              }
            />

            <button
              className="auth-submit"
              onClick={
                handleAuth
              }
            >
              {authMode ===
              "login"
                ? "Login"
                : "Register"}
            </button>

            <p className="auth-switch">

              {authMode ===
              "login"
                ? "Don't have an account? "
                : "Already have an account? "}

              <button
                onClick={() => {
                  setAuthMode(
                    authMode ===
                      "login"
                      ? "register"
                      : "login"
                  );

                  resetAuthForm();
                }}
              >
                {authMode ===
                "login"
                  ? "Register"
                  : "Login"}
              </button>

            </p>

          </div>

        </div>
      )}

      {/* ================= FOOTER ================= */}

      <footer id="about">

        <div>

          <h3>
            🛒 QuickKart AI
          </h3>

          <p>
            AI-powered e-commerce
            platform.
          </p>

        </div>

        <p>
          © 2026 QuickKart AI.
          All rights reserved.
        </p>

      </footer>

    </div>
  );
}

export default App;