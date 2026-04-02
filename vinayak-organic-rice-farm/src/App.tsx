import React, { useState, useEffect } from 'react';
import { ShoppingCart, Sprout, Wheat, Mail, Phone, MapPin, ChevronRight, Star, Trash2, Plus, Minus, CheckCircle2, LogOut, User as UserIcon, Package, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
}

interface CartItem extends Product {
  quantity: number;
}

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  password?: string;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: string;
  customer: {
    name: string;
    email: string;
    phone: string;
  };
}

// Mock Data
const PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Premium Basmati Rice',
    description: 'Extra long grain, aged for 2 years for superior aroma and taste.',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
    category: 'Basmati',
    rating: 4.9
  },
  {
    id: '2',
    name: 'Organic Jasmine Rice',
    description: 'Fragrant and slightly sticky, perfect for Asian cuisine.',
    price: 18.50,
    image: 'https://images.unsplash.com/photo-1591814448473-7057b7975e81?auto=format&fit=crop&q=80&w=800',
    category: 'Jasmine',
    rating: 4.8
  },
  {
    id: '3',
    name: 'Brown Wholegrain Rice',
    description: 'Nutritious and fiber-rich, ideal for healthy meals.',
    price: 15.99,
    image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=800',
    category: 'Brown',
    rating: 4.7
  },
  {
    id: '4',
    name: 'Sona Masuri Rice',
    description: 'Lightweight and aromatic medium-grain rice.',
    price: 19.99,
    image: 'https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&q=80&w=800',
    category: 'Medium Grain',
    rating: 4.6
  },
  {
    id: '5',
    name: 'Black Forbidden Rice',
    description: 'Exotic heirloom rice with a nutty flavor and deep purple color.',
    price: 29.99,
    image: 'https://images.unsplash.com/photo-1508061461508-cb18c242f556?auto=format&fit=crop&q=80&w=800',
    category: 'Specialty',
    rating: 4.9
  },
  {
    id: '6',
    name: 'Red Cargo Rice',
    description: 'Unpolished rice with a reddish-brown bran layer.',
    price: 22.50,
    image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800',
    category: 'Specialty',
    rating: 4.5
  }
];

export default function App() {
  const [view, setView] = useState<'shop' | 'story' | 'wholesale' | 'contact' | 'account'>('shop');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [inquiryStatus, setInquiryStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('vinayak_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    phone: ''
  });

  const [lastOrder, setLastOrder] = useState<{items: CartItem[], total: number, id: string} | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => {
    const saved = localStorage.getItem('vinayak_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [inquiryForm, setInquiryForm] = useState({
    companyName: '',
    businessType: 'Restaurant',
    volume: '',
    message: ''
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!currentUser) {
      alert('Please login or register to place an order');
      return;
    }

    setCheckoutStatus('loading');
    try {
      // Simulate a network delay for order processing and email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const orderData: Order = {
        id: orderId,
        customer: {
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        },
        items: [...cart],
        total: cartTotal,
        timestamp: new Date().toISOString()
      };

      console.log('Order Sent to vinayakorganicfarmvmm@gmail.com:', orderData);
      
      const newHistory = [orderData, ...orderHistory];
      setOrderHistory(newHistory);
      localStorage.setItem('vinayak_orders', JSON.stringify(newHistory));

      setLastOrder({ items: [...cart], total: cartTotal, id: orderId });
      setCheckoutStatus('success');
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error(err);
      setCheckoutStatus('error');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const { name, username, password, email, phone } = registerForm;
    if (!name || !username || !password || !email || !phone) {
      alert('Please fill in all fields');
      return;
    }

    const users = JSON.parse(localStorage.getItem('vinayak_users') || '[]');
    if (users.find((u: User) => u.username === username)) {
      alert('Username already exists');
      return;
    }

    const newUser: User = { id: Date.now().toString(), name, username, password, email, phone };
    users.push(newUser);
    localStorage.setItem('vinayak_users', JSON.stringify(users));
    
    const { password: _, ...userWithoutPassword } = newUser;
    setCurrentUser(userWithoutPassword);
    localStorage.setItem('vinayak_user', JSON.stringify(userWithoutPassword));
    setAuthMode('login');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('vinayak_users') || '[]');
    const user = users.find((u: any) => u.username === loginForm.username && u.password === loginForm.password);
    
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      setCurrentUser(userWithoutPassword);
      localStorage.setItem('vinayak_user', JSON.stringify(userWithoutPassword));
      
      // Load user specific orders if we had them scoped, but for now we use global history
      // In a real app, orders would be filtered by userId
    } else {
      alert('Invalid username or password');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('vinayak_user');
    setView('shop');
  };

  const downloadOrderCopy = () => {
    if (!lastOrder || !currentUser) return;
    
    const content = `
ORDER CONFIRMATION - VINAYAK ORGANIC FARM
Order ID: ${lastOrder.id}
Date: ${new Date().toLocaleString()}

Customer Details:
Name: ${currentUser.name}
Email: ${currentUser.email}
Phone: ${currentUser.phone}

Items:
${lastOrder.items.map(item => `- ${item.name} x ${item.quantity} ($${(item.price * item.quantity).toFixed(2)})`).join('\n')}

Total Amount: $${lastOrder.total.toFixed(2)}

Thank you for your order!
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Order_${lastOrder.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const emailOrderCopy = () => {
    if (currentUser) {
      alert(`Order copy has been sent to ${currentUser.email}`);
    }
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.companyName || !inquiryForm.message) {
      alert('Please fill in the required fields');
      return;
    }

    setInquiryStatus('loading');
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      console.log('Simulated Wholesale Inquiry:', inquiryForm);
      
      setInquiryStatus('success');
      setInquiryForm({
        companyName: '',
        businessType: 'Restaurant',
        volume: '',
        message: ''
      });
    } catch (err) {
      console.error(err);
      setInquiryStatus('error');
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'account':
        if (!currentUser) {
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-md mx-auto px-4 py-24"
            >
              <div className="text-center mb-12">
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Join Vinayak Organic Rice Farm</h2>
                <h3 className="text-4xl font-serif font-bold">Customer Login</h3>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8] shadow-sm">
                <div className="flex gap-4 p-1 bg-[#F5F3ED] rounded-xl mb-8">
                  <button 
                    onClick={() => setAuthMode('login')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-[#8B9D77]' : 'text-[#8E8A84]'}`}
                  >
                    Login
                  </button>
                  <button 
                    onClick={() => setAuthMode('register')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-[#8B9D77]' : 'text-[#8E8A84]'}`}
                  >
                    Register
                  </button>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username</label>
                      <input 
                        type="text" 
                        required
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                      <input 
                        type="password" 
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">
                      Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username</label>
                      <input 
                        type="text" 
                        required
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                      <input 
                        type="password" 
                        required
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Email</label>
                      <input 
                        type="email" 
                        required
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Phone</label>
                      <input 
                        type="tel" 
                        required
                        value={registerForm.phone}
                        onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <button type="submit" className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-colors mt-4">
                      Create Account
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          );
        }
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 py-24"
          >
            <div className="flex justify-between items-end mb-12">
              <div>
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Welcome Back</h2>
                <h3 className="text-5xl font-serif font-bold">{currentUser?.name}</h3>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 font-bold hover:underline"
              >
                <LogOut size={18} /> Logout
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <h4 className="text-xl font-serif font-bold mb-6">Profile Details</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-1">Username</label>
                      <p className="font-medium">{currentUser?.username}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-1">Email</label>
                      <p className="font-medium">{currentUser?.email}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-1">Phone</label>
                      <p className="font-medium">{currentUser?.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <h4 className="text-xl font-serif font-bold mb-6">Order History</h4>
                  {orderHistory.length === 0 ? (
                    <div className="text-center py-12 text-[#8E8A84]">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p>You haven't placed any orders yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orderHistory.map((order) => (
                        <div key={order.id} className="p-6 rounded-2xl bg-[#F5F3ED] border border-[#E5E1D8]">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-xs font-bold text-[#8B9D77] uppercase tracking-wider mb-1">{order.id}</p>
                              <p className="text-sm text-[#8E8A84]">{new Date(order.timestamp).toLocaleDateString()}</p>
                            </div>
                            <p className="text-xl font-serif font-bold">${order.total.toFixed(2)}</p>
                          </div>
                          <div className="space-y-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.name} x {item.quantity}</span>
                                <span className="text-[#8E8A84]">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'story':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto px-4 py-24"
          >
            <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">OUR HERITAGE</h2>
            <h3 className="text-5xl font-serif font-bold mb-8">Protecting the New Generation</h3>
            <div className="prose prose-lg text-[#8E8A84] leading-relaxed space-y-12">
              <p className="text-xl text-[#2D2A26] font-medium italic border-l-4 border-[#8B9D77] pl-6">
                "We chose the 'old ways' to protect the new generation. By reviving ancient traditional farming without a single drop of synthetic pesticides, we harvest rice that isn't just food—it’s medicine. Our grains are heavy with nutrition and rich in the authentic taste of Tamil Nadu’s soil."
              </p>
              
              <div>
                <h4 className="text-2xl font-serif font-bold text-[#2D2A26] mb-4">The Journey</h4>
                <p>
                  Today, our traditional farming has crossed regional boundaries. We are proud to supply major urban hubs, bringing the purity of the farm to families in Chennai, Tiruvannamalai, Coimbatore, and Trichy. From a small village patch to shops and stores across the state, our mission remains the same: delivering nutrient-rich, certified organic rice to every table.
                </p>
              </div>

              <img 
                src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=1200" 
                className="w-full h-96 object-cover rounded-3xl my-8"
                alt="Our Traditional Fields"
                referrerPolicy="no-referrer"
              />

              <div>
                <h4 className="text-2xl font-serif font-bold text-[#2D2A26] mb-4">The Promise</h4>
                <p>
                  Nature’s purity, verified by science. Our farming is TNO(F) Certified, ensuring that every bag you open meets the highest organic standards in the state.
                </p>
              </div>

              <div className="bg-[#F5F3ED] p-8 rounded-3xl border border-[#E5E1D8]">
                <h4 className="text-xl font-serif font-bold text-[#2D2A26] mb-6">At a Glance</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#8B9D77] mb-1">Method</span>
                    <p className="text-sm font-medium text-[#2D2A26]">100% Pesticide-Free & Traditional Natural Farming.</p>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#8B9D77] mb-1">Quality</span>
                    <p className="text-sm font-medium text-[#2D2A26]">Superior nutrient density and heirloom taste.</p>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#8B9D77] mb-1">Reach</span>
                    <p className="text-sm font-medium text-[#2D2A26]">Major hubs across Tamil Nadu.</p>
                  </div>
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#8B9D77] mb-1">Trust</span>
                    <p className="text-sm font-medium text-[#2D2A26]">Proudly TNO(F) Certified and recognized.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12 border-t border-[#E5E1D8]">
                <div className="text-center">
                  <div className="text-4xl font-serif font-bold text-[#2D2A26] mb-2">10+</div>
                  <div className="text-sm uppercase tracking-widest text-[#8E8A84]">Years of Experience</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-serif font-bold text-[#2D2A26] mb-2">10+</div>
                  <div className="text-sm uppercase tracking-widest text-[#8E8A84]">Partner Farmers</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-serif font-bold text-[#2D2A26] mb-2">TNO(F)1017</div>
                  <div className="text-sm uppercase tracking-widest text-[#8E8A84]">TNO(F) Certified</div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      case 'wholesale':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 py-24"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <div>
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Partner With Us</h2>
                <h3 className="text-5xl font-serif font-bold mb-8">Wholesale & Distribution</h3>
                <p className="text-xl text-[#8E8A84] mb-12 leading-relaxed">
                  Supply your restaurant, hotel, or retail chain with the world's finest rice. We offer competitive bulk pricing, custom packaging solutions, and reliable global logistics.
                </p>
                <ul className="space-y-6 mb-12">
                  {[
                    'Custom milling specifications',
                    'Private labeling options',
                    'Bulk shipping (25kg, 50kg, and Tonne bags)',
                    'Dedicated account management',
                    'Quality assurance certifications'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-[#2D2A26] font-medium">
                      <div className="w-6 h-6 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77]">
                        <CheckCircle2 size={16} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <button className="bg-[#2D2A26] text-white px-10 py-5 rounded-full font-bold hover:bg-black transition-all">
                  Download Wholesale Catalog
                </button>
              </div>
              <div className="bg-[#F5F3ED] p-12 rounded-3xl">
                <h4 className="text-2xl font-serif font-bold mb-8">Inquiry Form</h4>
                {inquiryStatus === 'success' ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                      <CheckCircle2 size={32} />
                    </div>
                    <h5 className="text-xl font-serif font-bold mb-2">Inquiry Sent!</h5>
                    <p className="text-[#8E8A84] mb-8">
                      Thank you for your interest. Our wholesale team will review your inquiry and get back to you within 24-48 hours. A copy of this inquiry has been sent to vinayakorganicfarmvmm@gmail.com.
                    </p>
                    <button 
                      onClick={() => setInquiryStatus('idle')}
                      className="text-[#8B9D77] font-bold hover:underline"
                    >
                      Send another inquiry
                    </button>
                  </div>
                ) : (
                  <form className="space-y-6" onSubmit={handleInquiry}>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Company Name</label>
                        <input 
                          type="text" 
                          required
                          value={inquiryForm.companyName}
                          onChange={(e) => setInquiryForm({...inquiryForm, companyName: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Business Type</label>
                        <select 
                          value={inquiryForm.businessType}
                          onChange={(e) => setInquiryForm({...inquiryForm, businessType: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]"
                        >
                          <option>Restaurant</option>
                          <option>Retailer</option>
                          <option>Distributor</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Estimated Monthly Volume</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 500kg" 
                        value={inquiryForm.volume}
                        onChange={(e) => setInquiryForm({...inquiryForm, volume: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Message</label>
                      <textarea 
                        rows={4} 
                        required
                        value={inquiryForm.message}
                        onChange={(e) => setInquiryForm({...inquiryForm, message: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]"
                      ></textarea>
                    </div>
                    <button 
                      type="submit"
                      disabled={inquiryStatus === 'loading'}
                      className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-colors disabled:opacity-50"
                    >
                      {inquiryStatus === 'loading' ? 'Sending...' : 'Submit Inquiry'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        );
      case 'contact':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 py-24"
          >
            <div className="text-center max-w-3xl mx-auto mb-24">
              <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Get In Touch</h2>
              <h3 className="text-5xl font-serif font-bold mb-8">We'd Love to Hear From You</h3>
              <p className="text-xl text-[#8E8A84]">
                Whether you have a question about our products, need help with an order, or just want to share your favorite rice recipe, our team is here for you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-24">
              <div className="bg-white p-10 rounded-3xl border border-[#E5E1D8] text-center">
                <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                  <Mail size={32} />
                </div>
                <h4 className="text-xl font-serif font-bold mb-2">Email Us</h4>
                <p className="text-[#8E8A84]">vinayakorganicfarmvmm@gmail.com</p>
              </div>
              <div className="bg-white p-10 rounded-3xl border border-[#E5E1D8] text-center">
                <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                  <Phone size={32} />
                </div>
                <h4 className="text-xl font-serif font-bold mb-2">Call Us</h4>
                <p className="text-[#8E8A84]">+91 9791414470</p>
                <p className="text-[#8E8A84]">9am-6pm IST</p>
              </div>
              <div className="bg-white p-10 rounded-3xl border border-[#E5E1D8] text-center">
                <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                  <MapPin size={32} />
                </div>
                <h4 className="text-xl font-serif font-bold mb-2">Visit Us</h4>
                <p className="text-[#8E8A84] mb-4 text-sm leading-relaxed">
                  <span className="font-bold block text-[#2D2A26] mb-1">Vinayak Organic Farm</span>
                  Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India
                </p>
                <a 
                  href="https://maps.app.goo.gl/G92xNNFMdpTmzGp38" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[#8B9D77] hover:underline font-medium"
                >
                  View on Google Maps
                </a>
              </div>
            </div>

            <div className="bg-[#F5F3ED] rounded-3xl p-12 text-center border border-[#E5E1D8]">
              <MapPin size={48} className="text-[#8B9D77] mx-auto mb-6" />
              <h4 className="text-2xl font-serif font-bold mb-4">Find Us on the Map</h4>
              <p className="text-[#8E8A84] mb-8 max-w-md mx-auto">
                <span className="font-bold block text-[#2D2A26] mb-1">Vinayak Organic Farm</span>
                Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India
              </p>
              
              <div className="rounded-2xl overflow-hidden h-[400px] border border-[#E5E1D8] shadow-sm bg-white mb-8">
                <iframe 
                  src="https://maps.google.com/maps?q=Vinayak%20Organic%20Farm,%20Opposite%20to%20Jain%20Math,%20Tirumalai,%20Vadamathimangalam,%20Tiruvannamalai%20District,%20Tamil%20Nadu%20606907,%20India&t=&z=15&ie=UTF8&iwloc=&output=embed" 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>

              <a 
                href="https://maps.app.goo.gl/G92xNNFMdpTmzGp38" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#8B9D77] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-all"
              >
                Open Google Maps <ChevronRight size={20} />
              </a>
            </div>
          </motion.div>
        );
      default:
        return (
          <>
            {/* Hero Section */}
            <header className="relative h-[70vh] flex items-center overflow-hidden">
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=1920" 
                  className="w-full h-full object-cover brightness-75"
                  alt="Rice Fields"
                />
              </div>
              <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <h1 className="text-6xl md:text-8xl font-serif font-bold leading-tight mb-6">
                    Pure Grains,<br />Honest Harvest.
                  </h1>
                  <p className="text-xl md:text-2xl text-white/90 max-w-2xl mb-10 font-light">
                    Directly from our farm to your kitchen. Experience the finest quality rice varieties grown with heritage and care.
                  </p>
                  <button 
                    onClick={() => {
                      const el = document.getElementById('products');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-[#8B9D77] hover:bg-[#7A8C66] text-white px-8 py-4 rounded-full text-lg font-medium transition-all transform hover:scale-105 flex items-center gap-2"
                  >
                    Shop Collection <ChevronRight size={20} />
                  </button>
                </motion.div>
              </div>
            </header>

            {/* Featured Products */}
            <main id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
              <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                <div>
                  <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Our Collection</h2>
                  <h3 className="text-4xl md:text-5xl font-serif font-bold">Premium Varieties</h3>
                </div>
                <div className="flex gap-4">
                  {['All', 'Basmati', 'Jasmine', 'Specialty'].map(cat => (
                    <button key={cat} className="px-6 py-2 rounded-full border border-[#E5E1D8] text-sm font-medium hover:border-[#8B9D77] transition-colors">
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {PRODUCTS.map((product) => (
                  <motion.div 
                    key={product.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden rounded-2xl mb-6 bg-[#F5F3ED]">
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        onClick={() => addToCart(product)}
                        className="absolute bottom-6 left-6 right-6 bg-white text-[#2D2A26] py-4 rounded-xl font-bold opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:bg-[#8B9D77] hover:text-white"
                      >
                        Add to Cart
                      </button>
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xl font-serif font-bold">{product.name}</h4>
                      <span className="text-lg font-medium">${product.price.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-[#F2C94C] text-[#F2C94C]" : "text-[#E5E1D8]"} />
                      ))}
                      <span className="text-xs text-[#8E8A84] ml-1">{product.rating}</span>
                    </div>
                    <p className="text-[#8E8A84] text-sm leading-relaxed line-clamp-2">
                      {product.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </main>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCF7] text-[#2D2A26] font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E1D8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 md:gap-4">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 hover:bg-[#F5F3ED] rounded-full transition-colors text-[#2D2A26]"
              >
                <Menu size={24} />
              </button>

              <button 
                onClick={() => setView('shop')}
                className="flex items-center gap-3 md:gap-4 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-[#8B9D77] rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Sprout className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <span className="text-xl md:text-2xl font-serif font-bold tracking-tight">Vinayak Organic Rice Farm</span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-wider">
              <button 
                onClick={() => setView('story')}
                className={`transition-colors ${view === 'story' ? 'text-[#8B9D77]' : 'hover:text-[#8B9D77]'}`}
              >
                Our Story
              </button>
              <button 
                onClick={() => setView('shop')}
                className={`transition-colors ${view === 'shop' ? 'text-[#8B9D77]' : 'hover:text-[#8B9D77]'}`}
              >
                Products
              </button>
              <button 
                onClick={() => setView('wholesale')}
                className={`transition-colors ${view === 'wholesale' ? 'text-[#8B9D77]' : 'hover:text-[#8B9D77]'}`}
              >
                Wholesale
              </button>
              <button 
                onClick={() => setView('contact')}
                className={`transition-colors ${view === 'contact' ? 'text-[#8B9D77]' : 'hover:text-[#8B9D77]'}`}
              >
                Contact
              </button>
              {currentUser ? (
                <button 
                  onClick={() => setView('account')}
                  className={`flex items-center gap-2 transition-colors ${view === 'account' ? 'text-[#8B9D77]' : 'hover:text-[#8B9D77]'}`}
                >
                  <div className="w-8 h-8 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77]">
                    <UserIcon size={16} />
                  </div>
                  <span className="hidden lg:inline">My Account</span>
                </button>
              ) : (
                <button 
                  onClick={() => { setView('account'); setAuthMode('login'); }}
                  className="bg-[#8B9D77] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#7A8C66] transition-colors"
                >
                  Login
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative p-2 hover:bg-[#F5F3ED] rounded-full transition-colors"
              >
                <ShoppingCart size={24} />
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#8B9D77] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Full-screen Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              {/* Backdrop with strong blur and brand tint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#FDFCF7]/95 backdrop-blur-2xl z-[60] md:hidden"
              />
              
              {/* Full-screen Menu Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[70] md:hidden flex flex-col"
              >
                <div className="p-6 flex justify-between items-center bg-white/50 backdrop-blur-sm border-b border-[#E5E1D8]/50">
                  <button 
                    onClick={() => { setView('shop'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-10 h-10 bg-[#8B9D77] rounded-lg flex items-center justify-center text-white">
                      <Sprout size={24} />
                    </div>
                    <span className="font-serif font-bold text-xl">Vinayak</span>
                  </button>
                  <button 
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 hover:bg-[#8B9D77]/10 rounded-full transition-colors text-[#2D2A26]"
                  >
                    <X size={32} />
                  </button>
                </div>

                <div className="flex-grow flex flex-col items-center justify-center px-6">
                  <motion.div 
                    initial="hidden"
                    animate="visible"
                    variants={{
                      visible: {
                        transition: {
                          staggerChildren: 0.1
                        }
                      }
                    }}
                    className="space-y-6 w-full max-w-sm"
                  >
                    {[
                      { label: 'Products', icon: Wheat, view: 'shop' },
                      { label: 'Wholesale', icon: Package, view: 'wholesale' },
                      { label: 'Our Story', icon: Star, view: 'story' },
                      { label: 'Contact', icon: Mail, view: 'contact' }
                    ].map((item, index) => (
                      <motion.button
                        key={index}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        onClick={() => { setView(item.view as any); setIsMenuOpen(false); }}
                        className={`flex items-center justify-between w-full p-5 rounded-2xl transition-all duration-300 group ${
                          view === item.view 
                            ? 'bg-[#8B9D77] text-white shadow-xl shadow-[#8B9D77]/20 scale-[1.02]' 
                            : 'bg-white/70 border border-[#E5E1D8] hover:bg-white hover:border-[#8B9D77]/30 hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center gap-6">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                            view === item.view 
                              ? 'bg-white/20 text-white' 
                              : 'bg-[#8B9D77]/10 text-[#8B9D77] group-hover:bg-[#8B9D77] group-hover:text-white'
                          }`}>
                            <item.icon size={24} />
                          </div>
                          <span className={`text-2xl md:text-3xl font-serif font-bold transition-colors ${
                            view === item.view ? 'text-white' : 'text-[#2D2A26] group-hover:text-[#8B9D77]'
                          }`}>
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight className={`transition-all duration-300 ${
                          view === item.view ? 'text-white translate-x-0 opacity-100' : 'text-[#8B9D77] -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                        }`} size={24} />
                      </motion.button>
                    ))}

                    <motion.div
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="pt-10 mt-10 border-t border-[#E5E1D8]"
                    >
                      {currentUser ? (
                        <button 
                          onClick={() => { setView('account'); setIsMenuOpen(false); }}
                          className="flex items-center justify-between w-full p-4 rounded-2xl bg-white border border-[#E5E1D8] hover:border-[#8B9D77] transition-all group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#8B9D77]/10 rounded-xl flex items-center justify-center text-[#8B9D77] group-hover:bg-[#8B9D77] group-hover:text-white transition-all">
                              <UserIcon size={24} />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-[#8E8A84]">Logged in as</p>
                              <p className="font-bold text-[#2D2A26] group-hover:text-[#8B9D77] transition-colors">{currentUser.name}</p>
                            </div>
                          </div>
                          <ChevronRight className="text-[#8B9D77] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" size={20} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => { setView('account'); setAuthMode('login'); setIsMenuOpen(false); }}
                          className="w-full bg-[#8B9D77] text-white py-5 rounded-2xl text-xl font-bold hover:bg-[#7A8C66] transition-all shadow-xl shadow-[#8B9D77]/20 flex items-center justify-center gap-3 group"
                        >
                          <UserIcon size={24} className="group-hover:scale-110 transition-transform" />
                          Login to Account
                        </button>
                      )}
                    </motion.div>
                  </motion.div>
                </div>

                <div className="p-10 text-center bg-white/30 backdrop-blur-sm border-t border-[#E5E1D8]/50">
                  <p className="text-[10px] text-[#8E8A84] font-bold tracking-[0.3em] uppercase">Vinayak Organic Rice Farm</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {renderContent()}

      {/* Success Modal */}
      <AnimatePresence>
        {checkoutStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-3xl p-12 max-w-md w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-[#8B9D77]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#8B9D77]">
                <CheckCircle2 size={48} />
              </div>
              <h3 className="text-3xl font-serif font-bold mb-4">Order Confirmed!</h3>
              <p className="text-[#8E8A84] mb-8">
                Thank you for your purchase. We've sent the order details to our sales team (vinayakorganicfarmvmm@gmail.com) and a confirmation to your email.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button 
                  onClick={downloadOrderCopy}
                  className="flex items-center justify-center gap-2 bg-[#F5F3ED] text-[#2D2A26] py-3 rounded-xl font-bold hover:bg-[#E5E1D8] transition-colors text-sm"
                >
                  <Package size={18} /> Download Copy
                </button>
                <button 
                  onClick={emailOrderCopy}
                  className="flex items-center justify-center gap-2 bg-[#F5F3ED] text-[#2D2A26] py-3 rounded-xl font-bold hover:bg-[#E5E1D8] transition-colors text-sm"
                >
                  <Mail size={18} /> Email Copy
                </button>
              </div>

              <button 
                onClick={() => setCheckoutStatus('idle')}
                className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-colors"
              >
                Continue Shopping
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-white shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-[#E5E1D8] flex justify-between items-center">
                <h3 className="text-xl font-serif font-bold">Your Cart</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-[#F5F3ED] rounded-full transition-colors">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#8E8A84]">
                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#F5F3ED] flex-shrink-0">
                          <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <h4 className="font-bold">{item.name}</h4>
                            <button onClick={() => removeFromCart(item.id)} className="text-[#8E8A84] hover:text-red-500">
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <p className="text-sm text-[#8E8A84] mb-3">${item.price.toFixed(2)}</p>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-full border border-[#E5E1D8] flex items-center justify-center hover:border-[#8B9D77]"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-medium">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-full border border-[#E5E1D8] flex items-center justify-center hover:border-[#8B9D77]"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-[#FDFCF7] border-t border-[#E5E1D8]">
                  {!currentUser ? (
                    <div className="space-y-6">
                      <div className="flex gap-4 p-1 bg-[#F5F3ED] rounded-xl">
                        <button 
                          onClick={() => setAuthMode('login')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-[#8B9D77]' : 'text-[#8E8A84]'}`}
                        >
                          Login
                        </button>
                        <button 
                          onClick={() => setAuthMode('register')}
                          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-[#8B9D77]' : 'text-[#8E8A84]'}`}
                        >
                          Register
                        </button>
                      </div>

                      {authMode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username</label>
                            <input 
                              type="text" 
                              required
                              value={loginForm.username}
                              onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                            <input 
                              type="password" 
                              required
                              value={loginForm.password}
                              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                            />
                          </div>
                          <button type="submit" className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">
                            Login to Checkout
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Full Name</label>
                              <input 
                                type="text" 
                                required
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm({...registerForm, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username</label>
                              <input 
                                type="text" 
                                required
                                value={registerForm.username}
                                onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                            <input 
                              type="password" 
                              required
                              value={registerForm.password}
                              onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Email</label>
                              <input 
                                type="email" 
                                required
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Phone</label>
                              <input 
                                type="tel" 
                                required
                                value={registerForm.phone}
                                onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                              />
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-colors">
                            Create Account
                          </button>
                        </form>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="mb-6 p-4 rounded-xl bg-[#8B9D77]/5 border border-[#8B9D77]/20">
                        <p className="text-sm text-[#8E8A84] mb-1">Logged in as</p>
                        <p className="font-bold text-[#2D2A26]">{currentUser.name}</p>
                      </div>
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[#8E8A84]">Subtotal</span>
                        <span className="text-2xl font-serif font-bold">${cartTotal.toFixed(2)}</span>
                      </div>
                      <button 
                        onClick={handleCheckout}
                        disabled={checkoutStatus === 'loading'}
                        className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {checkoutStatus === 'loading' ? 'Processing...' : 'Place Order (No Payment Required)'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-[#2D2A26] text-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="col-span-1 lg:col-span-2">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-[#8B9D77] rounded-xl flex items-center justify-center text-white shadow-sm">
                  <Sprout size={28} />
                </div>
                <span className="text-2xl font-serif font-bold tracking-tight">Vinayak Organic Rice Farm</span>
              </div>
              <p className="text-[#8E8A84] max-w-md leading-relaxed mb-8">
                We are dedicated to bringing the finest grains from our fields to your table. Our commitment to quality and sustainability ensures every meal is a celebration of nature's bounty.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer">
                  <Mail size={18} />
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer">
                  <Phone size={18} />
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer">
                  <MapPin size={18} />
                </div>
              </div>
            </div>
            
            <div>
              <h5 className="font-bold mb-8 uppercase tracking-widest text-xs text-[#8B9D77]">Quick Links</h5>
              <ul className="space-y-4 text-[#8E8A84]">
                <li><a href="#" className="hover:text-white transition-colors">Shop All</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Wholesale</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Shipping Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Returns</a></li>
              </ul>
            </div>

            <div>
              <h5 className="font-bold mb-8 uppercase tracking-widest text-xs text-[#8B9D77]">Contact Us</h5>
              <ul className="space-y-4 text-[#8E8A84]">
                <li className="flex items-start gap-3">
                  <MapPin size={18} className="mt-1 flex-shrink-0" />
                  <a href="https://maps.app.goo.gl/G92xNNFMdpTmzGp38" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors text-sm leading-relaxed">
                    Vinayak Organic Farm, Tirumalai, Vadamathimangalam, Tamil Nadu 606907
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Phone size={18} className="flex-shrink-0" />
                  <span>+91 9791414470</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail size={18} className="flex-shrink-0" />
                  <span className="break-all">vinayakorganicfarmvmm@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-white/5 text-center text-[#8E8A84] text-sm">
            © {new Date().getFullYear()} Vinayak Organic Rice Farm. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
