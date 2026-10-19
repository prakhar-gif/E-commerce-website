import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, UserRound, SlidersHorizontal, X, Plus, Minus, Trash2, ArrowRight, CheckCircle2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const money = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

async function request(path, options = {}, token = "") {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed");
  return data;
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(["All"]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [maxPrice, setMaxPrice] = useState(10000);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem("shopstack_cart") || "[]"));
  const [token, setToken] = useState(() => localStorage.getItem("shopstack_token") || "");
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("shopstack_user") || "null"));
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { localStorage.setItem("shopstack_cart", JSON.stringify(cart)); }, [cart]);

  async function loadProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, category, sort, maxPrice: String(maxPrice) });
      const data = await request(`/products?${params}`);
      setProducts(data.products);
      const catData = await request("/products/categories");
      setCategories(["All", ...catData.categories]);
    } catch (err) {
      setNotice(`${err.message}. Is the backend running?`);
    } finally { setLoading(false); }
  }

  useEffect(() => {
    const timer = setTimeout(loadProducts, 250);
    return () => clearTimeout(timer);
  }, [search, category, sort, maxPrice]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  function addToCart(product) {
    setCart(current => {
      const existing = current.find(item => item._id === product._id);
      if (existing) return current.map(item => item._id === product._id ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) } : item);
      return [...current, { ...product, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag`);
    setTimeout(() => setNotice(""), 2200);
  }

  function changeQty(id, delta) {
    setCart(current => current.map(item => item._id === id ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0 && item.quantity <= item.stock));
  }

  async function submitAuth(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const data = await request(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) });
      localStorage.setItem("shopstack_token", data.token);
      localStorage.setItem("shopstack_user", JSON.stringify(data.user));
      setToken(data.token); setUser(data.user); setAuthOpen(false);
      setNotice(`Welcome${data.user.name ? `, ${data.user.name}` : ""}!`);
    } catch (err) { setNotice(err.message); }
  }

  function logout() {
    localStorage.removeItem("shopstack_token");
    localStorage.removeItem("shopstack_user");
    setToken(""); setUser(null); setNotice("You have logged out.");
  }

  async function submitCheckout(event) {
    event.preventDefault();
    if (!token) { setCheckoutOpen(false); setAuthOpen(true); setNotice("Please log in to checkout."); return; }
    const shipping = Object.fromEntries(new FormData(event.currentTarget).entries());
    try {
      const data = await request("/orders", {
        method: "POST",
        body: JSON.stringify({ shipping, items: cart.map(item => ({ productId: item._id, quantity: item.quantity })) })
      }, token);

      if (data.demo) {
        setNotice(`Demo order created (${data.orderId}). No payment was taken. Add Razorpay test keys to enable checkout.`);
        setCart([]); setCheckoutOpen(false); setCartOpen(false);
        return;
      }

      if (!window.Razorpay) {
        setNotice("Razorpay Checkout could not load. Check your internet connection and try again.");
        return;
      }

      const checkout = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "ShopStack",
        description: "Order payment",
        order_id: data.razorpayOrderId,
        prefill: { name: shipping.fullName, contact: shipping.phone },
        handler: async (response) => {
          try {
            await request(`/orders/${data.orderId}/verify-payment`, {
              method: "POST", body: JSON.stringify(response)
            }, token);
            setCart([]); setCheckoutOpen(false); setCartOpen(false);
            setNotice("Payment verified successfully. Thank you for your order!");
          } catch (err) { setNotice(`Payment verification failed: ${err.message}`); }
        },
        modal: { ondismiss: () => setNotice("Checkout closed. Your order may still be pending.") },
        theme: { color: "#4f46e5" }
      });
      checkout.open();
    } catch (err) { setNotice(err.message); }
  }

  return (
    <div className="app-shell">
      <div className="announcement">A little something for your everyday ✦ Free shipping on orders over ₹2,000</div>
      <header className="topbar">
        <a className="brand" href="#"><span className="brand-mark">s.</span> shopstack</a>
        <div className="search-box"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your next favourite..." /></div>
        <div className="top-actions">
          {user ? <button className="user-button" onClick={logout}><UserRound size={18}/><span>{user.name || "Account"} · Log out</span></button> : <button className="user-button" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}><UserRound size={18}/><span>Sign in</span></button>}
          <button className="bag-button" onClick={() => setCartOpen(true)} aria-label="Open shopping bag"><ShoppingBag size={20}/><span>Bag</span><b>{cartCount}</b></button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <span className="eyebrow">THE EVERYDAY EDIT · NO. 01</span>
            <h1>Good things.<br/><em>Great finds.</em></h1>
            <p>Thoughtfully picked essentials for wherever life takes you. Discover your new favourites.</p>
            <button className="dark-button" onClick={() => document.getElementById("catalog").scrollIntoView({ behavior: "smooth" })}>Explore collection <ArrowRight size={17}/></button>
          </div>
          <div className="hero-art">
            <div className="hero-circle"></div>
            <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1100&auto=format&fit=crop" alt="Curated fashion essentials" />
            <div className="floating-note"><span>✳</span><div><b>Made for your everyday</b><small>Find the little things</small></div></div>
          </div>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="section-intro"><div><span className="eyebrow">THE COLLECTION</span><h2>Find your kind of good.</h2></div><p>Good design, everyday prices.</p></div>
          <div className="catalog-toolbar">
            <div className="category-pills">{categories.map(cat => <button key={cat} className={category === cat ? "pill selected" : "pill"} onClick={() => setCategory(cat)}>{cat}</button>)}</div>
            <label className="sort-select"><SlidersHorizontal size={16}/><select value={sort} onChange={e => setSort(e.target.value)}><option value="newest">Featured</option><option value="priceAsc">Price: low to high</option><option value="priceDesc">Price: high to low</option><option value="name">Name</option></select></label>
          </div>
          <div className="price-filter"><span>Up to {money(maxPrice)}</span><input type="range" min="500" max="10000" step="500" value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}/></div>
          {notice && <div className="notice" role="status"><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss"><X size={16}/></button></div>}
          {loading ? <div className="empty-state">Finding good things for you…</div> : products.length === 0 ? <div className="empty-state">No products match those filters. Try another search.</div> : <div className="product-grid">{products.map((product, index) => <article className="product-card" key={product._id}>
            <div className="product-image-wrap"><img src={product.image || "https://placehold.co/600x700?text=ShopStack"} alt={product.name} loading="lazy"/><span className="product-number">0{index + 1}</span><button className="quick-add" onClick={() => addToCart(product)} disabled={product.stock < 1}>{product.stock < 1 ? "Sold out" : <><Plus size={16}/> Add to bag</>}</button></div>
            <div className="product-info"><div><span className="product-category">{product.category}</span><h3>{product.name}</h3></div><strong>{money(product.price)}</strong></div>
            <p className="product-description">{product.description}</p>
          </article>)}</div>}
        </section>
        <section className="bottom-banner"><span>✳</span><div><h2>Make room for good things.</h2><p>Your next everyday favourite is just around the corner.</p></div><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Back to top ↑</button></section>
      </main>
      <footer><a className="brand" href="#"><span className="brand-mark">s.</span> shopstack</a><p>Thoughtful finds for everyday life.</p><span>© 2026 ShopStack</span></footer>

      {cartOpen && <div className="overlay" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false); }}><aside className="drawer"><div className="drawer-heading"><div><span className="eyebrow">YOUR SELECTION</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)}><X/></button></div>
        {cart.length === 0 ? <div className="empty-state">Your bag is waiting for something good.</div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item._id}><img src={item.image} alt={item.name}/><div className="cart-item-copy"><h3>{item.name}</h3><p>{money(item.price)}</p><div className="quantity"><button onClick={() => changeQty(item._id, -1)}><Minus size={14}/></button><span>{item.quantity}</span><button disabled={item.quantity >= item.stock} onClick={() => changeQty(item._id, 1)}><Plus size={14}/></button></div></div><button className="remove-item" onClick={() => setCart(c => c.filter(p => p._id !== item._id))} aria-label="Remove item"><Trash2 size={16}/></button></div>)}</div><div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><small>Shipping and taxes, if applicable, are calculated at checkout.</small><button className="dark-button full" onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}>Continue to checkout <ArrowRight size={17}/></button></div></>}
      </aside></div>}

      {authOpen && <div className="overlay modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false); }}><section className="modal"><button className="modal-close" onClick={() => setAuthOpen(false)}><X/></button><span className="eyebrow">WELCOME TO SHOPSTACK</span><h2>{authMode === "login" ? "Good to see you." : "Make yourself at home."}</h2><p>{authMode === "login" ? "Sign in to continue to your bag." : "Create an account to get started."}</p><form onSubmit={submitAuth}>{authMode === "register" && <label>Full name<input name="name" required minLength="2" autoComplete="name" placeholder="Your name"/></label>}<label>Email address<input name="email" type="email" required autoComplete="email" placeholder="you@example.com"/></label><label>Password<input name="password" type="password" required minLength="8" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="At least 8 characters"/></label><button className="dark-button full" type="submit">{authMode === "login" ? "Sign in" : "Create account"} <ArrowRight size={17}/></button></form><p className="switch-auth">{authMode === "login" ? "New around here?" : "Already have an account?"} <button onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Create an account" : "Sign in"}</button></p></section></div>}

      {checkoutOpen && <div className="overlay modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setCheckoutOpen(false); }}><section className="modal checkout-modal"><button className="modal-close" onClick={() => setCheckoutOpen(false)}><X/></button><span className="eyebrow">ALMOST YOURS</span><h2>Delivery details</h2><p>Order subtotal: <b>{money(subtotal)}</b></p>{!user && <div className="notice">Please sign in before placing your order.</div>}<form onSubmit={submitCheckout}><label>Full name<input name="fullName" required autoComplete="name" defaultValue={user?.name || ""}/></label><label>Address<input name="address" required autoComplete="street-address" placeholder="House, street, area"/></label><div className="two-fields"><label>City<input name="city" required autoComplete="address-level2"/></label><label>Postal code<input name="postalCode" required inputMode="numeric" autoComplete="postal-code"/></label></div><label>Phone number<input name="phone" required type="tel" autoComplete="tel" minLength="8"/></label><button className="dark-button full" type="submit">Place order · {money(subtotal)} <ArrowRight size={17}/></button><small className="secure-note"><CheckCircle2 size={14}/> Payment is processed through the configured payment provider.</small></form></section></div>}
    </div>
  );
}
