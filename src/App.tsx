import React, { useState, useEffect, Component, useCallback } from 'react';
import { ShoppingCart, Sprout, Wheat, Mail, Phone, MapPin, ChevronRight, Star, Trash2, Plus, Minus, CheckCircle2, LogOut, User as UserIcon, Package, Menu, X, Search, Settings as SettingsIcon, Edit2, PlusCircle, Trash, Eye, EyeOff, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isValidPhoneNumber, CountryCode as LibPhoneCountryCode } from 'libphonenumber-js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from './firebase';

// Image Uploader Component
const ImageUploader = ({ 
  currentImage, 
  onUpload, 
  onRemove, 
  label = "Upload Image",
  disabled = false 
}: { 
  currentImage: string | null | undefined, 
  onUpload: (base64: string) => void, 
  onRemove: () => void,
  label?: string,
  disabled?: boolean
}) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { // 800KB limit for Firestore documents (base64 overhead)
        alert("Image size should be less than 800KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpload(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84]">{label}</label>
      <div className="flex items-center gap-4">
        {currentImage && (
          <div className="relative w-20 h-20 group">
            <img 
              src={currentImage} 
              alt="Preview" 
              className="w-full h-full object-cover rounded-xl border border-[#E5E1D8]" 
              referrerPolicy="no-referrer"
            />
            {!disabled && (
              <button 
                onClick={onRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
        {!disabled && (
          <label className="flex-1 cursor-pointer">
            <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#E5E1D8] rounded-xl hover:border-[#8B9D77] transition-all bg-white">
              <Upload size={20} className="text-[#8B9D77] mb-1" />
              <span className="text-[10px] font-bold text-[#8E8A84]">Click to upload</span>
            </div>
            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );
};

// Comprehensive list of countries with codes
const COUNTRIES = [
  { name: 'India', code: '+91', id: 'IN' },
  { name: 'United States', code: '+1', id: 'US' },
  { name: 'United Kingdom', code: '+44', id: 'GB' },
  { name: 'Singapore', code: '+65', id: 'SG' },
  { name: 'United Arab Emirates', code: '+971', id: 'AE' },
  { name: 'Australia', code: '+61', id: 'AU' },
  { name: 'Canada', code: '+1', id: 'CA' },
  { name: 'Germany', code: '+49', id: 'DE' },
  { name: 'France', code: '+33', id: 'FR' },
  { name: 'Japan', code: '+81', id: 'JP' },
  { name: 'China', code: '+86', id: 'CN' },
  { name: 'Brazil', code: '+55', id: 'BR' },
  { name: 'South Africa', code: '+27', id: 'ZA' },
  { name: 'Malaysia', code: '+60', id: 'MY' },
  { name: 'Indonesia', code: '+62', id: 'ID' },
  { name: 'Thailand', code: '+66', id: 'TH' },
  { name: 'Vietnam', code: '+84', id: 'VN' },
  { name: 'Philippines', code: '+63', id: 'PH' },
  { name: 'New Zealand', code: '+64', id: 'NZ' },
  { name: 'Sri Lanka', code: '+94', id: 'LK' },
  { name: 'Nepal', code: '+977', id: 'NP' },
  { name: 'Bangladesh', code: '+880', id: 'BD' },
  { name: 'Pakistan', code: '+92', id: 'PK' },
  { name: 'Saudi Arabia', code: '+966', id: 'SA' },
  { name: 'Qatar', code: '+974', id: 'QA' },
  { name: 'Kuwait', code: '+965', id: 'KW' },
  { name: 'Oman', code: '+968', id: 'OM' },
  { name: 'Bahrain', code: '+973', id: 'BH' },
  { name: 'Italy', code: '+39', id: 'IT' },
  { name: 'Spain', code: '+34', id: 'ES' },
  { name: 'Netherlands', code: '+31', id: 'NL' },
  { name: 'Switzerland', code: '+41', id: 'CH' },
  { name: 'Sweden', code: '+46', id: 'SE' },
  { name: 'Norway', code: '+47', id: 'NO' },
  { name: 'Denmark', code: '+45', id: 'DK' },
  { name: 'Finland', code: '+358', id: 'FI' },
  { name: 'Ireland', code: '+353', id: 'IE' },
  { name: 'Belgium', code: '+32', id: 'BE' },
  { name: 'Austria', code: '+43', id: 'AT' },
  { name: 'Portugal', code: '+351', id: 'PT' },
  { name: 'Greece', code: '+30', id: 'GR' },
  { name: 'Russia', code: '+7', id: 'RU' },
  { name: 'Turkey', code: '+90', id: 'TR' },
  { name: 'Israel', code: '+972', id: 'IL' },
  { name: 'South Korea', code: '+82', id: 'KR' },
  { name: 'Mexico', code: '+52', id: 'MX' },
  { name: 'Argentina', code: '+54', id: 'AR' },
  { name: 'Chile', code: '+56', id: 'CL' },
  { name: 'Colombia', code: '+57', id: 'CO' },
  { name: 'Peru', code: '+51', id: 'PE' },
  { name: 'Egypt', code: '+20', id: 'EG' },
  { name: 'Nigeria', code: '+234', id: 'NG' },
  { name: 'Kenya', code: '+254', id: 'KE' },
  { name: 'Ghana', code: '+233', id: 'GH' },
  { name: 'Morocco', code: '+212', id: 'MA' },
].sort((a, b) => a.name.localeCompare(b.name));

// Types
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  rating: number;
  order?: number;
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
  role?: 'admin' | 'user';
}

interface Settings {
  email: string;
  phone: string;
  location: string;
  googleMapsLink: string;
  googleMapsEmbed: string;
  heroImage: string;
  menuFontColor: string;
  menuIconColor: string;
  brandTitleColor: string;
  brandIconColor: string;
  footerText: string;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  timestamp: any;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  customer: {
    id: string;
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

const COLOR_PALETTE = [
  '#8B9D77', // Brand Green
  '#2D2A26', // Brand Dark
  '#8E8A84', // Brand Gray
  '#D4AF37', // Gold
  '#C04000', // Mahogany
  '#4A5D23', // Deep Forest
  '#E5E1D8', // Off White
  '#000000', // Black
  '#FFFFFF', // White
  '#FF5733', // Vibrant Orange
  '#3357FF', // Vibrant Blue
  '#FF33A1', // Vibrant Pink
];

class ErrorBoundary extends (Component as any) {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Something went wrong.';
      try {
        const firestoreError = JSON.parse(this.state.error.message);
        errorMessage = `Firestore Error: ${firestoreError.error} during ${firestoreError.operationType} on ${firestoreError.path}`;
      } catch (e) {
        errorMessage = this.state.error.message || String(this.state.error);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FDFCF7] p-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-[#E5E1D8] shadow-sm text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <X size={32} />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-4">Application Error</h2>
            <p className="text-[#8E8A84] mb-8 text-sm">{errorMessage}</p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-[#8B9D77] text-white py-4 rounded-xl font-bold hover:bg-[#7A8C66] transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [view, setView] = useState<'shop' | 'story' | 'wholesale' | 'contact' | 'account' | 'admin'>('shop');
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [selectedSearchProducts, setSelectedSearchProducts] = useState<Product[]>([]);
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
  const [loginForm, setLoginForm] = useState({ usernameOrEmail: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [registerForm, setRegisterForm] = useState({
    name: '',
    username: '',
    password: '',
    email: '',
    countryCode: '+91',
    phone: ''
  });
  const [registerError, setRegisterError] = useState('');

  const [lastOrder, setLastOrder] = useState<{items: CartItem[], total: number, id: string} | null>(null);
  const [orderHistory, setOrderHistory] = useState<Order[]>(() => {
    const saved = localStorage.getItem('vinayak_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const [inquiryForm, setInquiryForm] = useState({
    companyName: '',
    businessType: 'Restaurant',
    email: '',
    phone: '',
    countryCode: '+91',
    volume: '',
    message: ''
  });

  const [isAdminEditMode, setIsAdminEditMode] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<Settings | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isSettingsChanged, setIsSettingsChanged] = useState(false);
  const [isSettingsSaved, setIsSettingsSaved] = useState(false);
  const [adminData, setAdminData] = useState<{
    users: User[],
    orders: Order[],
    inquiries: any[]
  }>({ users: [], orders: [], inquiries: [] });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductForm, setNewProductForm] = useState<Partial<Product>>({
    name: '',
    description: '',
    image: '',
    category: 'Specialty',
    price: 0,
    rating: 5
  });

  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetForm, setResetForm] = useState({
    username: '',
    email: '',
    phone: '',
    countryCode: '+91',
    newPassword: ''
  });

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = `${resetForm.countryCode} ${resetForm.phone}`;
    const country = COUNTRIES.find(c => c.code === resetForm.countryCode);
    if (country) {
      if (!isValidPhoneNumber(fullPhone, country.id as LibPhoneCountryCode)) {
        alert(`Invalid phone number for ${country.name}. Please check the length and format.`);
        return;
      }
    }

    try {
      await sendPasswordResetEmail(auth, resetForm.email);
      alert('Password reset email sent. Please check your inbox.');
      setForgotPassword(false);
      setAuthMode('login');
      setResetForm({
        username: '',
        email: '',
        phone: '',
        countryCode: '+91',
        newPassword: ''
      });
    } catch (error: any) {
      console.error('Reset error:', error);
      alert(error.message || 'Reset failed. Please try again.');
    }
  };

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // Auth State Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Use onSnapshot for real-time profile updates and better offline resilience
        const unsubProfile = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.data() as User;
            setCurrentUser({ ...userData, id: snapshot.id });
            localStorage.setItem('vinayak_user', JSON.stringify(userData));

            // Backfill username mapping if it doesn't exist
            if (userData.username) {
              const usernameRef = doc(db, 'usernames', userData.username);
              try {
                // Use getDoc as a one-time check
                const usernameDoc = await getDoc(usernameRef);
                if (!usernameDoc.exists()) {
                  await setDoc(usernameRef, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email
                  });
                }
              } catch (e) {
                // Log only if not an offline error to avoid spam
                if (!(e instanceof Error && e.message.includes('offline'))) {
                  console.warn('Optional username check failed:', e);
                }
              }
            }
          } else {
            // If it's a known admin email, auto-create the profile
            const isAdminEmail = firebaseUser.email === "arunachalam.gnanam@gmail.com" || firebaseUser.email === "vinayakorganicfarmvmm@gmail.com";
            if (isAdminEmail) {
              const adminUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Admin',
                username: firebaseUser.email?.split('@')[0] || 'admin',
                email: firebaseUser.email || '',
                phone: '',
                role: 'admin'
              };
              await setDoc(doc(db, 'users', firebaseUser.uid), adminUser);
              setCurrentUser(adminUser);
              localStorage.setItem('vinayak_user', JSON.stringify(adminUser));
            } else {
              console.warn('User authenticated but no Firestore profile found');
            }
          }
          setIsAuthReady(true);
        }, (error) => {
          if (error.message.includes('offline')) {
            console.info('Firestore client is offline, waiting for connection...');
          } else {
            console.error('Error fetching user profile:', error);
          }
          setIsAuthReady(true);
        });

        return () => unsubProfile();
      } else {
        setCurrentUser(null);
        localStorage.removeItem('vinayak_user');
        setIsAuthReady(true);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Connection Test and Migration
  useEffect(() => {
    const runSetup = async () => {
      // Only run setup if we have an admin user logged in
      if (!currentUser || currentUser.role !== 'admin') return;

      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'farm'));
        if (!settingsDoc.exists()) {
          // Initial settings migration
          const initialSettings = {
            email: "vinayakorganicfarmvmm@gmail.com",
            phone: "+91 9791414470",
            location: "Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India",
            googleMapsLink: "https://maps.app.goo.gl/G92xNNFMdpTmzGp38",
            googleMapsEmbed: "https://maps.google.com/maps?q=Vinayak%20Organic%20Farm,%20Opposite%20to%20Jain%20Math,%20Tirumalai,%20Vadamathimangalam,%20Tiruvannamalai%20District,%20Tamil%20Nadu%20606907,%20India&t=&z=15&ie=UTF8&iwloc=&output=embed",
            heroImage: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=1920",
            menuFontColor: "#2D2A27",
            menuIconColor: "#8B9D77",
            brandTitleColor: "#8B9D77",
            brandIconColor: "#8B9D77",
            footerText: ""
          };
          await setDoc(doc(db, 'settings', 'farm'), initialSettings);
        }

        const productsSnap = await getDocs(collection(db, 'products'));
        if (productsSnap.empty) {
          // Initial products migration
          const initialProducts = [
            { id: "1775361764012", name: "Seeraga Samba", description: "", image: "", category: "Specialty", price: 0, rating: 5, order: 0 },
            { id: "1", name: "Premium Basmati Rice", description: "Extra long grain, aged for 2 years for superior aroma and taste.", price: 24.99, image: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800", category: "Basmati", rating: 4.9, order: 1 },
            { id: "2", name: "Organic Jasmine Rice", description: "Fragrant and slightly sticky, perfect for Asian cuisine.", price: 18.5, image: "https://images.unsplash.com/photo-1591814448473-7057b7975e81?auto=format&fit=crop&q=80&w=800", category: "Jasmine", rating: 4.8, order: 2 },
            { id: "3", name: "Brown Wholegrain Rice", description: "Nutritious and fiber-rich, ideal for healthy meals.", price: 15.99, image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=800", category: "Brown", rating: 4.7, order: 3 },
            { id: "4", name: "Sona Masuri Rice", description: "Lightweight and aromatic medium-grain rice.", price: 19.99, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&q=80&w=800", category: "Medium Grain", rating: 4.6, order: 4 },
            { id: "5", name: "Black Forbidden Rice", description: "Exotic heirloom rice with a nutty flavor and deep purple color.", price: 29.99, image: "https://images.unsplash.com/photo-1508061461508-cb18c242f556?auto=format&fit=crop&q=80&w=800", category: "Specialty", rating: 4.9, order: 5 },
            { id: "6", name: "Red Cargo Rice", description: "Unpolished rice with a reddish-brown bran layer.", price: 22.5, image: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&q=80&w=800", category: "Specialty", rating: 4.5, order: 6 }
          ];
          await Promise.all(initialProducts.map(p => setDoc(doc(db, 'products', p.id), p)));
        }
      } catch (error: any) {
        if (error.code === 'permission-denied') {
          // Silently skip if no permission (e.g. not logged in as admin yet)
          return;
        }
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.info("Firestore is currently offline. Initial setup will be completed once connection is restored.");
        } else {
          console.error("Initial setup error:", error);
        }
      }
    };
    runSetup();
  }, [currentUser]);

  // Persist cart to Firestore for logged-in users
  useEffect(() => {
    if (currentUser && isAuthReady) {
      const syncCart = async () => {
        try {
          await updateDoc(doc(db, 'users', currentUser.id), {
            cart: cart
          });
        } catch (error) {
          console.error('Error syncing cart to Firestore:', error);
        }
      };
      // Debounce sync
      const timer = setTimeout(syncCart, 1000);
      return () => clearTimeout(timer);
    }
  }, [cart, currentUser, isAuthReady]);

  // Load cart from Firestore on login
  useEffect(() => {
    if (currentUser && isAuthReady) {
      // Use onSnapshot for cart too, to be more resilient and keep it in sync
      const unsubCart = onSnapshot(doc(db, 'users', currentUser.id), (snapshot) => {
        if (snapshot.exists()) {
          const userData = snapshot.data();
          if (userData.cart && userData.cart.length > 0 && cart.length === 0) {
            setCart(userData.cart);
          }
        }
      }, (error) => {
        if (!error.message.includes('offline')) {
          console.error('Error loading cart from Firestore:', error);
        }
      });
      return () => unsubCart();
    }
  }, [currentUser, isAuthReady, cart.length]);

  // Fetch user orders
  useEffect(() => {
    if (currentUser && isAuthReady) {
      const unsub = onSnapshot(
        query(collection(db, 'orders'), where('customer.id', '==', currentUser.id)),
        (snapshot) => {
          const orders = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order));
          setUserOrders(orders.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds));
        }
      );
      return () => unsub();
    } else {
      setUserOrders([]);
    }
  }, [currentUser, isAuthReady]);

  useEffect(() => {
    window.scrollTo(0, 0);
    // Reset search when view changes
    setSearchQuery('');
    setSearchResults([]);
  }, [view]);

  // Real-time products and settings
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
      // Sort by order if exists
      setProducts(productsData.sort((a: any, b: any) => (a.order || 0) - (b.order || 0)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'farm'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Settings;
        setSettings(data);
        setOriginalSettings(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/farm');
    });

    return () => {
      unsubProducts();
      unsubSettings();
    };
  }, []);

  // Real-time admin data
  useEffect(() => {
    if (view === 'admin' && currentUser?.role === 'admin') {
      const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
        setAdminData(prev => ({ ...prev, users: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)) }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'users'));

      const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
        setAdminData(prev => ({ ...prev, orders: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)) }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));

      const unsubInquiries = onSnapshot(collection(db, 'inquiries'), (snapshot) => {
        setAdminData(prev => ({ ...prev, inquiries: snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) }));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'inquiries'));

      return () => {
        unsubUsers();
        unsubOrders();
        unsubInquiries();
      };
    }
  }, [view, currentUser]);

  // Fetch user order history
  useEffect(() => {
    if (currentUser && view === 'account') {
      const q = query(collection(db, 'orders'), where('customer.id', '==', currentUser.id));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setOrderHistory(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Order)));
      }, (error) => handleFirestoreError(error, OperationType.LIST, 'orders'));
      return () => unsubscribe();
    }
  }, [currentUser, view]);

  // Search logic
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  const toggleSearchProduct = (product: Product) => {
    setSelectedSearchProducts(prev => {
      const exists = prev.find(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });

    // Scroll to product
    setView('shop');
    setTimeout(() => {
      const element = document.getElementById(`product-${product.id}`);
      if (element) {
        const headerOffset = 100;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }, 100);
  };

  // Load order history from Firestore is already handled by the onSnapshot listener above.
  // The fetch call to /api/orders/${currentUser.id} is legacy and will not work on Netlify.

  const sendEmail = async (to: string, subject: string, body: string) => {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, subject, body }),
      });
      const data = await response.json();
      
      if (data.isSimulation) {
        console.info('Email Simulation:', data.message);
        console.info('To:', to);
        console.info('Subject:', subject);
        console.info('Body:', body);
      } else if (!data.success) {
        console.error('Email failed to send:', data.error);
      }
      
      return data.success;
    } catch (error) {
      console.error('Email API Error:', error);
      return false;
    }
  };

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

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
      alert(`Order ${orderId} status updated to ${status}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      alert('Order deleted successfully');
    } catch (error) {
      console.error('Delete order error:', error);
      alert('Failed to delete order. Check your internet connection or permissions.');
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const deleteInquiry = async (inquiryId: string) => {
    if (!window.confirm('Are you sure you want to delete this wholesale inquiry?')) return;
    try {
      await deleteDoc(doc(db, 'inquiries', inquiryId));
      alert('Inquiry deleted successfully');
    } catch (error) {
      console.error('Delete inquiry error:', error);
      alert('Failed to delete inquiry. Check your internet connection or permissions.');
      handleFirestoreError(error, OperationType.DELETE, `inquiries/${inquiryId}`);
    }
  };

  const deleteUser = async (userId: string, username?: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      if (username) {
        try {
          await deleteDoc(doc(db, 'usernames', username));
        } catch (usernameError) {
          console.warn('Could not delete username mapping:', usernameError);
        }
      }
      alert('User deleted successfully');
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete user. Check your internet connection or permissions.');
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      alert('Please login or register to place an order');
      return;
    }

    setCheckoutStatus('loading');
    try {
      const orderId = 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
      const orderData: Order = {
        id: orderId,
        customer: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        },
        items: [...cart],
        total: cartTotal,
        timestamp: serverTimestamp(),
        status: 'pending'
      };

      // Save order to Firestore
      try {
        await setDoc(doc(db, 'orders', orderId), orderData);
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `orders/${orderId}`);
      }

      console.log(`Order Sent to ${settings?.email || 'vinayakorganicfarmvmm@gmail.com'}:`, orderData);
      
      // Construct email content
      const subject = `New Order: ${orderId}`;
      const body = `
ORDER CONFIRMATION - VINAYAK ORGANIC FARM
Order ID: ${orderId}
Date: ${formatDate(new Date())}

Customer Details:
Name: ${currentUser.name}
Email: ${currentUser.email}
Phone: ${currentUser.phone}

Items:
${cart.map(item => `- ${item.name} x ${item.quantity}`).join('\n')}

Our sales team would get in touch with you shortly.
Thank you for your order!
Vinayak Organic Rice Farm
      `.trim();
      
      // Send automated emails via backend
      const salesEmail = settings?.email || 'vinayakorganicfarmvmm@gmail.com';
      await sendEmail(salesEmail, subject, body);
      
      setLastOrder({ 
        items: [...cart], 
        total: cartTotal, 
        id: orderId,
        timestamp: { seconds: Math.floor(Date.now() / 1000) },
        customer: {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          phone: currentUser.phone
        }
      } as any);
      setCheckoutStatus('success');
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error(err);
      setCheckoutStatus('error');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const { name, username, password, email, phone, countryCode } = registerForm;
    if (!name || !username || !password || !email || !phone) {
      alert('Please fill in all fields');
      return;
    }

    const fullPhone = `${countryCode} ${phone}`;

    // Phone validation
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (country) {
      if (!isValidPhoneNumber(fullPhone, country.id as LibPhoneCountryCode)) {
        setRegisterError(`Invalid phone number for ${country.name}. Please check the length and format.`);
        return;
      }
    }

    try {
      // Check for unique username using the usernames collection
      const usernameDoc = await getDoc(doc(db, 'usernames', username));
      if (usernameDoc.exists()) {
        setRegisterError('Username already exists. Please choose another.');
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      const isAdminEmail = email === "arunachalam.gnanam@gmail.com" || email === "vinayakorganicfarmvmm@gmail.com";
      const newUser: User = { 
        id: firebaseUser.uid, 
        name, 
        username, 
        email, 
        phone: fullPhone,
        role: isAdminEmail ? 'admin' : 'user'
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        // Also create the username mapping
        await setDoc(doc(db, 'usernames', username), {
          uid: firebaseUser.uid,
          email: email
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }

      setCurrentUser(newUser);
      localStorage.setItem('vinayak_user', JSON.stringify(newUser));
      setAuthMode('login');
      setRegisterError('');
      // Reset form
      setRegisterForm({
        name: '',
        username: '',
        password: '',
        email: '',
        countryCode: '+91',
        phone: ''
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      setRegisterError(error.message || 'Registration failed');
      alert(error.message || 'Registration failed');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { usernameOrEmail, password } = loginForm;
    if (!usernameOrEmail || !password) {
      setLoginError('Please enter both username/email and password');
      return;
    }

    try {
      let email = usernameOrEmail;
      
      // If it's not an email, assume it's a username and look up the email in the usernames collection
      if (!usernameOrEmail.includes('@')) {
        const usernameDoc = await getDoc(doc(db, 'usernames', usernameOrEmail));
        if (!usernameDoc.exists()) {
          setLoginError('Username not found');
          return;
        }
        email = usernameDoc.data().email;
      }

      await signInWithEmailAndPassword(auth, email, password);
      setLoginError('');
      setLoginForm({ usernameOrEmail: '', password: '' });
      setView('shop');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        setLoginError("Email/Password authentication is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
      } else if (error.code === 'auth/invalid-credential') {
        setLoginError("Invalid email/username or password. If you haven't registered yet, please create an account.");
      } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setLoginError("Invalid credentials. Please check your username/email and password.");
      } else {
        setLoginError(error.message || 'Login failed');
      }
      // alert(error.message || 'Login failed'); // Removed alert to avoid nested popups
    }
  };

  const handleLogout = useCallback(async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      localStorage.removeItem('vinayak_user');
      setView('shop');
      // Reset all forms
      setLoginForm({ usernameOrEmail: '', password: '' });
      setRegisterForm({
        name: '',
        username: '',
        password: '',
        email: '',
        countryCode: '+91',
        phone: ''
      });
      setResetForm({
        username: '',
        email: '',
        phone: '',
        countryCode: '+91',
        newPassword: ''
      });
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Session Timeout (2 minutes of inactivity)
  useEffect(() => {
    if (!currentUser) return;

    let timeoutId: NodeJS.Timeout;
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        alert('Session is timed out due to inactivity.');
      }, TIMEOUT_MS);
    };

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [currentUser, handleLogout]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    let d: Date;
    if (date.seconds) {
      d = new Date(date.seconds * 1000);
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return 'Invalid Date';

    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const downloadOrderCopy = (order: Order | null = null, user: User | null = null) => {
    const targetOrder = order || lastOrder;
    const targetUser = user || currentUser;
    
    if (!targetOrder || !targetUser) return;
    
    const content = `
ORDER CONFIRMATION - VINAYAK ORGANIC FARM
Order ID: ${targetOrder.id}
Date: ${formatDate(targetOrder.timestamp)}

Customer Details:
Name: ${targetUser.name}
Email: ${targetUser.email}
Phone: ${targetUser.phone}

Items:
${targetOrder.items.map(item => `- ${item.name} x ${item.quantity}`).join('\n')}

Thank you for your order!
Our sales team will reach out to you shortly!!
Vinayak Organic Rice Farm
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Order_${targetOrder.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryForm.companyName || !inquiryForm.message) {
      alert('Please fill in the required fields');
      return;
    }

    setInquiryStatus('loading');
    try {
      const fullPhone = `${inquiryForm.countryCode} ${inquiryForm.phone}`;
      const country = COUNTRIES.find(c => c.code === inquiryForm.countryCode);
      if (country) {
        if (!isValidPhoneNumber(fullPhone, country.id as LibPhoneCountryCode)) {
          alert(`Invalid phone number for ${country.name}. Please check the length and format.`);
          setInquiryStatus('idle');
          return;
        }
      }

      // Save inquiry to Firestore
      const inquiryId = Date.now().toString();
      try {
        await setDoc(doc(db, 'inquiries', inquiryId), {
          ...inquiryForm,
          id: inquiryId,
          date: serverTimestamp()
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `inquiries/${inquiryId}`);
      }
      
      // Construct email content
      const subject = `Wholesale Inquiry: ${inquiryForm.companyName}`;
      const body = `
Company Name: ${inquiryForm.companyName}
Business Type: ${inquiryForm.businessType}
Email: ${inquiryForm.email || 'Not provided'}
Phone: ${inquiryForm.countryCode} ${inquiryForm.phone}
Estimated Volume: ${inquiryForm.volume}

Message:
${inquiryForm.message}
      `.trim();
      
      // Send automated email via backend
      const salesEmail = settings?.email || 'vinayakorganicfarmvmm@gmail.com';
      await sendEmail(salesEmail, subject, body);
      
      setInquiryStatus('success');
      setInquiryForm({
        companyName: '',
        businessType: 'Restaurant',
        email: '',
        phone: '',
        countryCode: '+91',
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

                {forgotPassword ? (
                  <form onSubmit={handleResetPassword} className="space-y-6">
                    {/* ... reset form ... */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username</label>
                      <input 
                        type="text" 
                        required
                        value={resetForm.username}
                        onChange={(e) => setResetForm({...resetForm, username: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Email</label>
                      <input 
                        type="email" 
                        required
                        value={resetForm.email}
                        onChange={(e) => setResetForm({...resetForm, email: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Phone</label>
                      <div className="flex gap-2">
                        <select 
                          value={resetForm.countryCode}
                          onChange={(e) => setResetForm({...resetForm, countryCode: e.target.value})}
                          className="w-32 px-2 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm"
                        >
                          {COUNTRIES.map(c => (
                            <option key={`${c.id}-${c.code}`} value={c.code}>{c.code} ({c.id})</option>
                          ))}
                        </select>
                        <input 
                          type="tel" 
                          required
                          value={resetForm.phone}
                          onChange={(e) => setResetForm({...resetForm, phone: e.target.value})}
                          className="flex-1 px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">New Password</label>
                      <div className="relative">
                        <input 
                          type={showResetPassword ? "text" : "password"} 
                          required
                          value={resetForm.newPassword}
                          onChange={(e) => setResetForm({...resetForm, newPassword: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] pr-12" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8A84] hover:text-[#8B9D77] transition-colors"
                        >
                          {showResetPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <button type="submit" className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">
                        Reset Password
                      </button>
                      <button 
                        type="button"
                        onClick={() => setForgotPassword(false)}
                        className="text-sm font-bold text-[#8B9D77] hover:underline"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                ) : authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-6">
                    {loginError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold">
                        {loginError}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username or Email Address</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Enter your username or email"
                        value={loginForm.usernameOrEmail}
                        onChange={(e) => setLoginForm({...loginForm, usernameOrEmail: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                      <div className="relative">
                        <input 
                          type={showLoginPassword ? "text" : "password"} 
                          required
                          placeholder="Enter password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] pr-12" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8A84] hover:text-[#8B9D77] transition-colors"
                        >
                          {showLoginPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4">
                      <button type="submit" className="w-full bg-[#2D2A26] text-white py-4 rounded-xl font-bold hover:bg-black transition-colors">
                        Sign In
                      </button>
                      <button 
                        type="button"
                        onClick={() => setForgotPassword(true)}
                        className="text-sm font-bold text-[#8B9D77] hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-4">
                    {registerError && (
                      <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-bold">
                        {registerError}
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Full Name</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Enter full name"
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
                        placeholder="Enter username"
                        value={registerForm.username}
                        onChange={(e) => setRegisterForm({...registerForm, username: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Password</label>
                      <div className="relative">
                        <input 
                          type={showRegisterPassword ? "text" : "password"} 
                          required
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] pr-12" 
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8A84] hover:text-[#8B9D77] transition-colors"
                        >
                          {showRegisterPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
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
                      <div className="flex gap-2">
                        <select 
                          value={registerForm.countryCode}
                          onChange={(e) => setRegisterForm({...registerForm, countryCode: e.target.value})}
                          className="w-32 px-2 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm"
                        >
                          {COUNTRIES.map(c => (
                            <option key={`${c.id}-${c.code}`} value={c.code}>{c.code} ({c.id})</option>
                          ))}
                        </select>
                        <input 
                          type="tel" 
                          required
                          value={registerForm.phone}
                          onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                          className="flex-1 px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                        />
                      </div>
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
                      {orderHistory?.map((order) => (
                        <div key={order.id} className="p-6 rounded-2xl bg-[#F5F3ED] border border-[#E5E1D8]">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <p className="text-xs font-bold text-[#8B9D77] uppercase tracking-wider mb-1">{order.id}</p>
                              <p className="text-sm text-[#8E8A84]">{formatDate(order.timestamp)}</p>
                            </div>
                            <button 
                              onClick={() => downloadOrderCopy(order, currentUser!)}
                              className="p-2 text-[#8B9D77] hover:bg-[#8B9D77]/10 rounded-lg transition-colors"
                              title="Download Invoice"
                            >
                              <Package size={20} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span>{item.name} x {item.quantity}</span>
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
                      Thank you for your interest. Our wholesale team will review your inquiry and get back to you within 24-48 hours. A copy of this inquiry has been sent to {settings?.email || 'vinayakorganicfarmvmm@gmail.com'}.
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Email (Optional)</label>
                        <input 
                          type="email" 
                          value={inquiryForm.email}
                          onChange={(e) => setInquiryForm({...inquiryForm, email: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Phone Number</label>
                        <div className="flex gap-2">
                          <select 
                            value={inquiryForm.countryCode}
                            onChange={(e) => setInquiryForm({...inquiryForm, countryCode: e.target.value})}
                            className="w-32 px-2 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm"
                          >
                            {COUNTRIES.map(c => (
                              <option key={`${c.id}-${c.code}`} value={c.code}>{c.code} ({c.id})</option>
                            ))}
                          </select>
                          <input 
                            type="tel" 
                            required
                            placeholder="98765 43210"
                            value={inquiryForm.phone}
                            onChange={(e) => setInquiryForm({...inquiryForm, phone: e.target.value})}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                          />
                        </div>
                      </div>
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
      case 'admin':
        if (currentUser?.role !== 'admin') {
          setView('shop');
          return null;
        }
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-7xl mx-auto px-4 py-24"
          >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
              <div>
                <h2 className="text-sm uppercase tracking-[0.3em] text-[#8B9D77] font-bold mb-4">Admin Dashboard</h2>
                <h3 className="text-4xl font-serif font-bold">Manage Your Farm</h3>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={async () => {
                    if (!confirm('This will create login mappings for all existing users. Continue?')) return;
                    try {
                      const usersSnap = await getDocs(collection(db, 'users'));
                      let count = 0;
                      for (const userDoc of usersSnap.docs) {
                        const data = userDoc.data() as User;
                        if (data.username && data.email) {
                          await setDoc(doc(db, 'usernames', data.username), {
                            uid: data.id,
                            email: data.email
                          });
                          count++;
                        }
                      }
                      alert(`Successfully backfilled ${count} usernames.`);
                    } catch (error) {
                      console.error('Backfill error:', error);
                      alert('Failed to backfill usernames. Check console for details.');
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-[#8B9D77]/10 text-[#8B9D77] hover:bg-[#8B9D77]/20 transition-all"
                  title="Fix username login for old users"
                >
                  <UserIcon size={20} /> Backfill Usernames
                </button>
                <button 
                  onClick={() => setIsAdminEditMode(!isAdminEditMode)}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${isAdminEditMode ? 'bg-[#2D2A26] text-white' : 'bg-[#8B9D77]/10 text-[#8B9D77] hover:bg-[#8B9D77]/20'}`}
                >
                  <Edit2 size={20} /> {isAdminEditMode ? 'Exit Edit Mode' : 'Edit Details'}
                </button>
                {isAdminEditMode && (
                  <button 
                    onClick={() => setIsAddingProduct(true)}
                    className="flex items-center gap-2 bg-[#8B9D77] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#7A8C66] transition-all"
                  >
                    <PlusCircle size={20} /> Add Product
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-12">
                {/* Products Section */}
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-serif font-bold flex items-center gap-2">
                      <Package size={24} className="text-[#8B9D77]" /> Products
                    </h4>
                    {!isAdminEditMode && (
                      <span className="text-[10px] uppercase tracking-widest bg-[#F5F3ED] text-[#8E8A84] px-3 py-1 rounded-full font-bold border border-[#E5E1D8]">
                        Read Only
                      </span>
                    )}
                  </div>
                  <div className={`space-y-4 transition-all duration-500 ${!isAdminEditMode ? 'opacity-80' : ''}`}>
                    {isAdminEditMode && isAddingProduct && (
                      <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-[#8B9D77]/5 border-2 border-dashed border-[#8B9D77]">
                        <div className="flex-1 w-full space-y-4">
                          <h5 className="font-bold text-[#8B9D77]">Add New Product</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input 
                              type="text" 
                              placeholder="Product Name"
                              value={newProductForm.name}
                              onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
                              className="w-full px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]"
                            />
                            <ImageUploader 
                              currentImage={newProductForm.image}
                              onUpload={(base64) => setNewProductForm({...newProductForm, image: base64})}
                              onRemove={() => setNewProductForm({...newProductForm, image: ''})}
                              label="Product Image"
                            />
                          </div>
                          <textarea 
                            placeholder="Description"
                            rows={2}
                            value={newProductForm.description}
                            onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                            className="w-full px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]"
                          />
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => setIsAddingProduct(false)}
                              className="px-6 py-2 rounded-xl text-[#8E8A84] font-bold hover:bg-[#F5F3ED]"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={async () => {
                                if (newProductForm.name) {
                                  const productId = Date.now().toString();
                                  const product = {
                                    id: productId,
                                    name: newProductForm.name,
                                    description: newProductForm.description || '',
                                    image: newProductForm.image || 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
                                    category: 'Specialty',
                                    price: 0,
                                    rating: 5,
                                    order: products.length
                                  };
                                  try {
                                    await setDoc(doc(db, 'products', productId), product);
                                    setIsAddingProduct(false);
                                    setNewProductForm({ name: '', description: '', image: '', category: 'Specialty', price: 0, rating: 5 });
                                    alert('Product added successfully!');
                                  } catch (error) {
                                    handleFirestoreError(error, OperationType.CREATE, `products/${productId}`);
                                  }
                                } else {
                                  alert('Please enter at least the product name.');
                                }
                              }}
                              className="px-6 py-2 bg-[#8B9D77] text-white rounded-xl font-bold hover:bg-[#7A8C66]"
                            >
                              Save Product
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {products.map((product, index) => (
                      <div key={product.id} className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-[#F5F3ED] border border-[#E5E1D8]">
                        <img src={product.image || null} alt={product.name} className="w-20 h-20 object-cover rounded-xl" referrerPolicy="no-referrer" />
                        <div className="flex-1 text-center sm:text-left">
                          {editingProduct?.id === product.id ? (
                            <div className="space-y-2">
                              <input 
                                type="text" 
                                value={editingProduct.name}
                                onChange={(e) => setEditingProduct({...editingProduct, name: e.target.value})}
                                className="w-full px-3 py-1 rounded-lg border border-[#E5E1D8]"
                              />
                              <textarea 
                                value={editingProduct.description}
                                onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                                className="w-full px-3 py-1 rounded-lg border border-[#E5E1D8]"
                              />
                              <ImageUploader 
                                currentImage={editingProduct.image}
                                onUpload={(base64) => setEditingProduct({...editingProduct, image: base64})}
                                onRemove={() => setEditingProduct({...editingProduct, image: ''})}
                                label="Product Image"
                              />
                            </div>
                          ) : (
                            <>
                              <h5 className="font-bold text-lg">{product.name}</h5>
                              <p className="text-sm text-[#8E8A84] line-clamp-1">{product.description}</p>
                            </>
                          )}
                        </div>
                        {isAdminEditMode && (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col gap-1 mr-2">
                              <button 
                                onClick={async () => {
                                  if (index > 0) {
                                    const newProducts = [...products];
                                    [newProducts[index - 1], newProducts[index]] = [newProducts[index], newProducts[index - 1]];
                                    // Update all products with their new order
                                    try {
                                      await Promise.all(newProducts.map((p, i) => 
                                        updateDoc(doc(db, 'products', p.id), { order: i })
                                      ));
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.UPDATE, 'products/reorder');
                                    }
                                  }
                                }}
                                disabled={index === 0}
                                className="p-1 text-[#8E8A84] hover:text-[#8B9D77] disabled:opacity-20"
                              >
                                <Plus className="rotate-0" size={16} />
                              </button>
                              <button 
                                onClick={async () => {
                                  if (index < products.length - 1) {
                                    const newProducts = [...products];
                                    [newProducts[index + 1], newProducts[index]] = [newProducts[index], newProducts[index + 1]];
                                    // Update all products with their new order
                                    try {
                                      await Promise.all(newProducts.map((p, i) => 
                                        updateDoc(doc(db, 'products', p.id), { order: i })
                                      ));
                                    } catch (error) {
                                      handleFirestoreError(error, OperationType.UPDATE, 'products/reorder');
                                    }
                                  }
                                }}
                                disabled={index === products.length - 1}
                                className="p-1 text-[#8E8A84] hover:text-[#8B9D77] disabled:opacity-20"
                              >
                                <Minus className="rotate-0" size={16} />
                              </button>
                            </div>
                            {editingProduct?.id === product.id ? (
                              <>
                                <button 
                                  onClick={async () => {
                                    if (editingProduct) {
                                      try {
                                        await setDoc(doc(db, 'products', product.id), editingProduct);
                                        setEditingProduct(null);
                                        alert('Product updated successfully!');
                                      } catch (error) {
                                        handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
                                      }
                                    }
                                  }}
                                  className="px-4 py-2 bg-[#8B9D77] text-white rounded-lg text-sm font-bold"
                                >
                                  Save
                                </button>
                                <button 
                                  onClick={() => setEditingProduct(null)}
                                  className="px-4 py-2 bg-[#8E8A84] text-white rounded-lg text-sm font-bold"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button 
                                onClick={() => setEditingProduct(product)}
                                className="p-2 text-[#8E8A84] hover:text-[#8B9D77] transition-colors"
                              >
                                <Edit2 size={20} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Users Section */}
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <h4 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
                    <UserIcon size={24} className="text-[#8B9D77]" /> Registered Users
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#E5E1D8]">
                          <th className="py-4 text-xs font-bold uppercase tracking-wider text-[#8E8A84]">Name</th>
                          <th className="py-4 text-xs font-bold uppercase tracking-wider text-[#8E8A84]">Username</th>
                          <th className="py-4 text-xs font-bold uppercase tracking-wider text-[#8E8A84]">Email</th>
                          <th className="py-4 text-xs font-bold uppercase tracking-wider text-[#8E8A84]">Phone</th>
                          <th className="py-4 text-xs font-bold uppercase tracking-wider text-[#8E8A84] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5E1D8]">
                        {adminData.users?.map(user => (
                          <tr key={user.id}>
                            <td className="py-4 text-sm font-medium">{user.name}</td>
                            <td className="py-4 text-sm text-[#8E8A84]">{user.username}</td>
                            <td className="py-4 text-sm text-[#8E8A84]">{user.email}</td>
                            <td className="py-4 text-sm text-[#8E8A84]">{user.phone}</td>
                            <td className="py-4 text-sm text-right">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteUser(user.id, user.username);
                                }}
                                className="p-2 text-[#8E8A84] hover:text-red-500 transition-colors bg-white/50 rounded-lg inline-flex"
                                title="Delete User"
                                disabled={user.email === currentUser?.email}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Inquiries Section */}
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <h4 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
                    <Mail size={24} className="text-[#8B9D77]" /> Wholesale Inquiries
                  </h4>
                  <div className="space-y-6">
                    {adminData.inquiries?.map(inquiry => (
                      <div key={inquiry.id} className="p-6 rounded-2xl bg-[#F5F3ED] border border-[#E5E1D8]">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h5 className="font-bold text-lg">{inquiry.companyName}</h5>
                            <p className="text-sm text-[#8B9D77] font-medium">{inquiry.businessType}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-xs text-[#8E8A84]">{formatDate(inquiry.date)}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteInquiry(inquiry.id);
                              }}
                              className="p-2 text-[#8E8A84] hover:text-red-500 transition-colors bg-white/50 rounded-lg"
                              title="Delete Inquiry"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-[#8E8A84]">
                            <Mail size={14} /> {inquiry.email || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2 text-[#8E8A84]">
                            <Phone size={14} /> {inquiry.countryCode} {inquiry.phone}
                          </div>
                        </div>
                        <p className="text-sm text-[#2D2A26] bg-white p-4 rounded-xl border border-[#E5E1D8]">
                          {inquiry.message}
                        </p>
                      </div>
                    ))}
                    {(!adminData.inquiries || adminData.inquiries.length === 0) && (
                      <p className="text-center text-[#8E8A84] py-8">No inquiries yet.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Settings Section */}
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-serif font-bold flex items-center gap-2">
                      <SettingsIcon size={24} className="text-[#8B9D77]" /> Farm Settings
                    </h4>
                    {!isAdminEditMode && (
                      <span className="text-[10px] uppercase tracking-widest bg-[#F5F3ED] text-[#8E8A84] px-3 py-1 rounded-full font-bold border border-[#E5E1D8]">
                        Read Only
                      </span>
                    )}
                  </div>
                  <div className={`space-y-6 transition-all duration-500 ${!isAdminEditMode ? 'opacity-60 pointer-events-none grayscale-[0.2]' : ''}`}>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Sales Email</label>
                      <input 
                        type="email" 
                        disabled={!isAdminEditMode}
                        value={settings?.email || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, email: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Phone Number</label>
                      <input 
                        type="text" 
                        disabled={!isAdminEditMode}
                        value={settings?.phone || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, phone: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Location Address</label>
                      <textarea 
                        rows={3}
                        disabled={!isAdminEditMode}
                        value={settings?.location || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, location: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Google Maps Link</label>
                      <input 
                        type="text" 
                        disabled={!isAdminEditMode}
                        value={settings?.googleMapsLink || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, googleMapsLink: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Google Maps Embed URL</label>
                      <input 
                        type="text" 
                        disabled={!isAdminEditMode}
                        value={settings?.googleMapsEmbed || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, googleMapsEmbed: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7]"
                      />
                    </div>
                    <div>
                      <ImageUploader 
                        currentImage={settings?.heroImage}
                        onUpload={(base64) => {
                          setSettings(prev => prev ? {...prev, heroImage: base64} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        onRemove={() => {
                          setSettings(prev => prev ? {...prev, heroImage: ''} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        label="Homepage Hero Image"
                        disabled={!isAdminEditMode}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Brand Title Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            disabled={!isAdminEditMode}
                            value={settings?.brandTitleColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, brandTitleColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="w-12 h-12 rounded-lg border border-[#E5E1D8] cursor-pointer disabled:cursor-default"
                          />
                          <input 
                            type="text" 
                            disabled={!isAdminEditMode}
                            value={settings?.brandTitleColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, brandTitleColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm disabled:bg-[#FDFCF7]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Brand Icon Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            disabled={!isAdminEditMode}
                            value={settings?.brandIconColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, brandIconColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="w-12 h-12 rounded-lg border border-[#E5E1D8] cursor-pointer disabled:cursor-default"
                          />
                          <input 
                            type="text" 
                            disabled={!isAdminEditMode}
                            value={settings?.brandIconColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, brandIconColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm disabled:bg-[#FDFCF7]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Menu Font Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            disabled={!isAdminEditMode}
                            value={settings?.menuFontColor || '#2D2A26'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, menuFontColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="w-12 h-12 rounded-lg border border-[#E5E1D8] cursor-pointer disabled:cursor-default"
                          />
                          <input 
                            type="text" 
                            disabled={!isAdminEditMode}
                            value={settings?.menuFontColor || '#2D2A26'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, menuFontColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm disabled:bg-[#FDFCF7]"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Menu Icon Color</label>
                        <div className="flex gap-2">
                          <input 
                            type="color" 
                            disabled={!isAdminEditMode}
                            value={settings?.menuIconColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, menuIconColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="w-12 h-12 rounded-lg border border-[#E5E1D8] cursor-pointer disabled:cursor-default"
                          />
                          <input 
                            type="text" 
                            disabled={!isAdminEditMode}
                            value={settings?.menuIconColor || '#8B9D77'}
                            onChange={(e) => {
                              setSettings(prev => prev ? {...prev, menuIconColor: e.target.value} : null);
                              setIsSettingsChanged(true);
                              setIsSettingsSaved(false);
                            }}
                            className="flex-1 px-4 py-2 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm disabled:bg-[#FDFCF7]"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Custom Footer Note</label>
                      <p className="text-[10px] text-[#8E8A84] mb-2 italic">This text will appear below the copyright notice in the footer.</p>
                      <textarea 
                        rows={3}
                        disabled={!isAdminEditMode}
                        placeholder="e.g. Terms & Conditions | Privacy Policy | FSSAI License: 1234567890"
                        value={settings?.footerText || ''}
                        onChange={(e) => {
                          setSettings(prev => prev ? {...prev, footerText: e.target.value} : null);
                          setIsSettingsChanged(true);
                          setIsSettingsSaved(false);
                        }}
                        className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] disabled:bg-[#FDFCF7] text-sm"
                      />
                    </div>

                    {isAdminEditMode && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-3">Customize Color Palette</label>
                          <div className="flex flex-wrap gap-2">
                            {COLOR_PALETTE.map((color) => (
                              <button
                                key={color}
                                onClick={() => {
                                  // Ask which one to set or set both? 
                                  // Let's set icon color by default, or maybe add a toggle.
                                  // For simplicity, let's set icon color.
                                  setSettings(prev => prev ? {...prev, menuIconColor: color} : null);
                                  setIsSettingsChanged(true);
                                  setIsSettingsSaved(false);
                                }}
                                className="w-8 h-8 rounded-full border border-[#E5E1D8] transition-transform hover:scale-110 active:scale-95"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-4">
                          <button 
                            onClick={() => {
                              if (originalSettings) {
                                setSettings(originalSettings);
                                setIsSettingsChanged(false);
                                setIsSettingsSaved(false);
                              }
                            }}
                            className="flex-1 py-4 rounded-xl font-bold text-[#8E8A84] bg-[#F5F3ED] hover:bg-[#E5E1D8] transition-all"
                          >
                            Discard Changes
                          </button>
                          <button 
                            onClick={async () => {
                              if (settings) {
                                try {
                                  await setDoc(doc(db, 'settings', 'farm'), settings);
                                  setIsSettingsChanged(false);
                                  setIsSettingsSaved(true);
                                  setOriginalSettings(settings);
                                  setTimeout(() => setIsSettingsSaved(false), 3000);
                                } catch (error) {
                                  handleFirestoreError(error, OperationType.UPDATE, 'settings/farm');
                                }
                              }
                            }}
                            className={`flex-[2] py-4 rounded-xl font-bold transition-all ${
                              isSettingsSaved 
                                ? 'bg-[#8B9D77]/20 text-[#8B9D77] opacity-50' 
                                : isSettingsChanged 
                                  ? 'bg-[#8B9D77] text-white shadow-lg shadow-[#8B9D77]/20 scale-[1.02]' 
                                  : 'bg-[#E5E1D8] text-[#8E8A84] cursor-not-allowed'
                            }`}
                          >
                            {isSettingsSaved ? 'Settings Saved!' : 'Save Farm Settings'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Orders Section */}
                <div className="bg-white p-8 rounded-3xl border border-[#E5E1D8]">
                  <h4 className="text-xl font-serif font-bold mb-6 flex items-center gap-2">
                    <ShoppingCart size={24} className="text-[#8B9D77]" /> Recent Orders
                  </h4>
                  <div className="space-y-4">
                    {adminData.orders?.map(order => (
                      <div key={order.id} className="p-4 rounded-xl bg-[#F5F3ED] border border-[#E5E1D8]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-[#8E8A84]">#{order.id.slice(-6)}</span>
                          <span className="text-xs text-[#8E8A84]">{formatDate(order.timestamp)}</span>
                        </div>
                        <p className="text-sm font-bold mb-1">{order.customer.name}</p>
                        <div className="text-xs text-[#8E8A84] mb-3 space-y-1">
                          {order.items?.map((item, idx) => (
                            <div key={idx}>{item.name} x {item.quantity}</div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center">
                          <select 
                            value={order.status || 'pending'} 
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as Order['status'])}
                            className="text-sm font-bold bg-transparent border-none text-[#8B9D77] focus:ring-0 cursor-pointer hover:underline"
                          >
                            <option value="pending">Order Received</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteOrder(order.id);
                            }}
                            className="p-2 text-[#8E8A84] hover:text-red-500 transition-colors bg-white/50 rounded-lg"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!adminData.orders || adminData.orders.length === 0) && (
                      <p className="text-center text-[#8E8A84] py-4 text-sm">No orders yet.</p>
                    )}
                  </div>
                </div>
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
                <p className="text-[#8E8A84]">{settings?.email || 'vinayakorganicfarmvmm@gmail.com'}</p>
              </div>
              <div className="bg-white p-10 rounded-3xl border border-[#E5E1D8] text-center">
                <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                  <Phone size={32} />
                </div>
                <h4 className="text-xl font-serif font-bold mb-2">Call Us</h4>
                <p className="text-[#8E8A84]">{settings?.phone || '+91 9791414470'}</p>
                <p className="text-[#8E8A84]">9am-6pm IST</p>
              </div>
              <div className="bg-white p-10 rounded-3xl border border-[#E5E1D8] text-center">
                <div className="w-16 h-16 bg-[#8B9D77]/10 rounded-full flex items-center justify-center text-[#8B9D77] mx-auto mb-6">
                  <MapPin size={32} />
                </div>
                <h4 className="text-xl font-serif font-bold mb-2">Visit Us</h4>
                <div className="text-[#8E8A84] mb-4 text-sm leading-relaxed">
                  <span className="font-bold block text-[#2D2A26] mb-1">Vinayak Organic Farm</span>
                  {settings?.location || 'Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India'}
                </div>
                <a 
                  href={settings?.googleMapsLink || "https://maps.app.goo.gl/G92xNNFMdpTmzGp38"} 
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
              <div className="text-[#8E8A84] mb-8 max-w-md mx-auto">
                <span className="font-bold block text-[#2D2A26] mb-1">Vinayak Organic Farm</span>
                {settings?.location || 'Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India'}
              </div>
              
              <div className="rounded-2xl overflow-hidden h-[400px] border border-[#E5E1D8] shadow-sm bg-white mb-8">
                <iframe 
                  src={settings?.googleMapsEmbed || "https://maps.google.com/maps?q=Vinayak%20Organic%20Farm,%20Opposite%20to%20Jain%20Math,%20Tirumalai,%20Vadamathimangalam,%20Tiruvannamalai%20District,%20Tamil%20Nadu%20606907,%20India&t=&z=15&ie=UTF8&iwloc=&output=embed"} 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen 
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>

              <a 
                href={settings?.googleMapsLink || "https://maps.app.goo.gl/G92xNNFMdpTmzGp38"} 
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
                  src={settings?.heroImage || "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&q=80&w=1920"} 
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
                <div className="flex flex-col items-end gap-4">
                  <div className="relative w-full md:w-80">
                    <div className="flex items-center gap-2 px-4 py-3 bg-[#F5F3ED] rounded-xl border border-[#E5E1D8] focus-within:border-[#8B9D77] transition-all">
                      <Search size={18} className="text-[#8E8A84]" />
                      <input 
                        type="text" 
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent outline-none text-sm w-full"
                      />
                    </div>
                    <AnimatePresence>
                      {searchQuery.trim().length > 0 && searchResults.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E5E1D8] overflow-hidden z-[100]"
                        >
                          {searchResults.map(product => (
                            <div 
                              key={product.id}
                              onClick={() => {
                                toggleSearchProduct(product);
                                setSearchQuery('');
                              }}
                              className="flex items-center gap-4 p-4 hover:bg-[#F5F3ED] cursor-pointer transition-colors border-b border-[#F5F3ED] last:border-0"
                            >
                              <img src={product.image || null} alt={product.name} className="w-12 h-12 object-cover rounded-lg" referrerPolicy="no-referrer" />
                              <div>
                                <p className="font-bold text-sm">{product.name}</p>
                                <p className="text-xs text-[#8E8A84] line-clamp-1">{product.description}</p>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {selectedSearchProducts.length > 0 && (
                <div className="mb-12 p-6 bg-[#8B9D77]/5 rounded-3xl border border-[#8B9D77]/20">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-serif font-bold text-xl">Selected Products</h4>
                    <button 
                      onClick={() => setSelectedSearchProducts([])}
                      className="text-sm text-[#8E8A84] hover:text-[#2D2A26] font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {selectedSearchProducts.map(product => (
                      <div key={product.id} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-[#E5E1D8]">
                        <img src={product.image || null} alt={product.name} className="w-16 h-16 object-cover rounded-xl" referrerPolicy="no-referrer" />
                        <div className="flex-1">
                          <h5 className="font-bold text-sm">{product.name}</h5>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => addToCart(product)}
                              className="text-xs text-[#8B9D77] font-bold hover:underline"
                            >
                              Add to Cart
                            </button>
                            <button 
                              onClick={() => {
                                setView('shop');
                                setTimeout(() => {
                                  const element = document.getElementById(`product-${product.id}`);
                                  if (element) {
                                    const headerOffset = 100;
                                    const elementPosition = element.getBoundingClientRect().top;
                                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                                  }
                                }, 100);
                              }}
                              className="text-xs text-[#8E8A84] font-bold hover:underline"
                            >
                              View
                            </button>
                          </div>
                        </div>
                        <button 
                          onClick={() => toggleSearchProduct(product)}
                          className="text-[#8E8A84] hover:text-red-500"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                {products.map((product) => (
                  <motion.div 
                    key={product.id}
                    id={`product-${product.id}`}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group"
                  >
                    <div className="mb-4">
                      <h4 className="text-2xl font-serif font-bold">{product.name}</h4>
                    </div>
                    <div className="relative aspect-video overflow-hidden rounded-2xl mb-6 bg-[#F5F3ED]">
                      {product.image.includes('mp4') || product.image.includes('youtube') || product.image.includes('vimeo') ? (
                        <div className="w-full h-full flex items-center justify-center bg-black">
                          <p className="text-white text-xs">Video Content</p>
                        </div>
                      ) : (
                        <img 
                          src={product.image || null} 
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <button 
                        onClick={() => addToCart(product)}
                        className="absolute bottom-6 left-6 right-6 bg-white text-[#2D2A26] py-4 rounded-xl font-bold opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-xl hover:bg-[#8B9D77] hover:text-white"
                      >
                        Add to Cart
                      </button>
                    </div>
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-[#F2C94C] text-[#F2C94C]" : "text-[#E5E1D8]"} />
                      ))}
                      <span className="text-xs text-[#8E8A84] ml-1">{product.rating}</span>
                    </div>
                    <p className="text-[#8E8A84] text-sm leading-relaxed">
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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF7]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="text-[#8B9D77]"
        >
          <Sprout size={48} />
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
                <div 
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center text-white shadow-sm"
                  style={{ backgroundColor: settings?.brandIconColor || '#8B9D77' }}
                >
                  <Sprout className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <span 
                  className="text-xl md:text-2xl font-serif font-bold tracking-tight"
                  style={{ color: settings?.brandTitleColor || '#8B9D77' }}
                >
                  Vinayak Organic Rice Farm
                </span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium uppercase tracking-wider">
              <div className="relative group hidden lg:block">
                <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F3ED] rounded-full border border-transparent focus-within:border-[#8B9D77] transition-all">
                  <Search size={18} className="text-[#8E8A84]" />
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent outline-none text-xs w-32 focus:w-48 transition-all lowercase"
                  />
                </div>
                <AnimatePresence>
                  {searchQuery.trim().length > 0 && searchResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E5E1D8] overflow-hidden z-[100] min-w-[250px]"
                    >
                      {searchResults.map(product => (
                        <div 
                          key={product.id}
                          onClick={() => {
                            toggleSearchProduct(product);
                            setSearchQuery('');
                          }}
                          className="flex items-center gap-4 p-4 hover:bg-[#F5F3ED] cursor-pointer transition-colors border-b border-[#F5F3ED] last:border-0"
                        >
                          <img src={product.image || null} alt={product.name} className="w-10 h-10 object-cover rounded-lg" referrerPolicy="no-referrer" />
                          <div className="text-left">
                            <p className="font-bold text-xs normal-case">{product.name}</p>
                            <p className="text-[10px] text-[#8E8A84] line-clamp-1 normal-case">{product.description}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => setView('story')}
                style={{ color: view === 'story' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                className="transition-colors hover:opacity-70"
              >
                Our Story
              </button>
              <button 
                onClick={() => setView('shop')}
                style={{ color: view === 'shop' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                className="transition-colors hover:opacity-70"
              >
                Products
              </button>
              <button 
                onClick={() => setView('wholesale')}
                style={{ color: view === 'wholesale' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                className="transition-colors hover:opacity-70"
              >
                Wholesale
              </button>
              <button 
                onClick={() => setView('contact')}
                style={{ color: view === 'contact' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                className="transition-colors hover:opacity-70"
              >
                Contact
              </button>
              {currentUser?.role === 'admin' && (
                <button 
                  onClick={() => setView('admin')}
                  style={{ color: view === 'admin' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                  className="flex items-center gap-2 transition-colors hover:opacity-70"
                >
                  <SettingsIcon size={18} style={{ color: settings?.menuIconColor || '#8B9D77' }} /> Admin
                </button>
              )}
              {currentUser ? (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('account')}
                    style={{ color: view === 'account' ? (settings?.menuIconColor || '#8B9D77') : (settings?.menuFontColor || '#2D2A26') }}
                    className="flex items-center gap-2 transition-colors hover:opacity-70"
                  >
                    <div className="w-8 h-8 bg-[#8B9D77]/10 rounded-full flex items-center justify-center" style={{ color: settings?.menuIconColor || '#8B9D77' }}>
                      <UserIcon size={16} />
                    </div>
                    <span className="hidden lg:inline">My Account</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-[#8E8A84] hover:text-red-500 transition-colors"
                  >
                    <UserIcon size={18} />
                    <span className="hidden lg:inline text-sm font-bold">Logout</span>
                  </button>
                </div>
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
              {/* Backdrop with solid brand background */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#FDFCF7] z-[60] md:hidden"
              />
              
              {/* Full-screen Menu Content */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[70] md:hidden flex flex-col bg-[#FDFCF7]"
              >
                <div className="p-6 flex justify-between items-center bg-[#FDFCF7] border-b border-[#E5E1D8]/50">
                  <button 
                    onClick={() => { setView('shop'); setIsMenuOpen(false); }}
                    className="flex items-center gap-3"
                  >
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: settings?.brandIconColor || '#8B9D77' }}
                    >
                      <Sprout size={24} />
                    </div>
                    <span 
                      className="font-serif font-bold text-lg leading-tight text-left"
                      style={{ color: settings?.brandTitleColor || '#8B9D77' }}
                    >
                      Vinayak Organic Rice Farm
                    </span>
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
                    className="space-y-3 w-full max-w-sm"
                  >
                    <div className="relative w-full mb-8">
                      <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-xl border border-[#E5E1D8] focus-within:border-[#8B9D77] transition-all shadow-sm">
                        <Search size={20} className="text-[#8E8A84]" />
                        <input 
                          type="text" 
                          placeholder="Search products..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-transparent outline-none text-sm w-full"
                        />
                      </div>
                      <AnimatePresence>
                        {searchQuery.trim().length > 0 && searchResults.length > 0 && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-[#E5E1D8] overflow-hidden z-[100]"
                          >
                            {searchResults.map(product => (
                              <div 
                                key={product.id}
                                onClick={() => {
                                  toggleSearchProduct(product);
                                  setSearchQuery('');
                                  setIsMenuOpen(false);
                                }}
                                className="flex items-center gap-4 p-4 hover:bg-[#F5F3ED] cursor-pointer transition-colors border-b border-[#F5F3ED] last:border-0 text-left"
                              >
                                <img src={product.image || null} alt={product.name} className="w-10 h-10 object-cover rounded-lg" referrerPolicy="no-referrer" />
                                <div>
                                  <p className="font-bold text-xs text-[#2D2A26]">{product.name}</p>
                                  <p className="text-[10px] text-[#8E8A84] line-clamp-1">{product.description}</p>
                                </div>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {[
                      { label: 'Products', icon: Wheat, view: 'shop' },
                      { label: 'Wholesale', icon: Package, view: 'wholesale' },
                      { label: 'Our Story', icon: Star, view: 'story' },
                      { label: 'Contact', icon: Mail, view: 'contact' },
                      ...(currentUser?.role === 'admin' ? [{ label: 'Admin Panel', icon: SettingsIcon, view: 'admin' }] : []),
                      ...(currentUser ? [{ label: 'Logout', icon: LogOut, action: handleLogout }] : [])
                    ].map((item, index) => (
                      <motion.button
                        key={index}
                        variants={{
                          hidden: { opacity: 0, y: 20 },
                          visible: { opacity: 1, y: 0 }
                        }}
                        onClick={() => { 
                          if ('action' in item) {
                            item.action();
                          } else {
                            setView(item.view as any); 
                          }
                          setIsMenuOpen(false); 
                        }}
                        style={{ 
                          backgroundColor: ('view' in item && view === item.view) ? (settings?.menuIconColor || '#8B9D77') : 'white',
                          color: ('view' in item && view === item.view) ? 'white' : (settings?.menuFontColor || '#2D2A26')
                        }}
                        className={`flex items-center justify-between w-full p-4 rounded-xl transition-all duration-300 group ${
                          ('view' in item && view === item.view) 
                            ? 'shadow-lg shadow-[#8B9D77]/20 scale-[1.01]' 
                            : 'bg-white/70 border border-[#E5E1D8] hover:bg-white hover:border-[#8B9D77]/30'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 ${
                              ('view' in item && view === item.view) 
                                ? 'bg-white/20 text-white' 
                                : 'bg-[#8B9D77]/10 group-hover:bg-[#8B9D77] group-hover:text-white'
                            }`}
                            style={{ color: ('view' in item && view === item.view) ? 'white' : (settings?.menuIconColor || '#8B9D77') }}
                          >
                            <item.icon size={20} />
                          </div>
                          <span className="text-lg font-serif font-bold transition-colors">
                            {item.label}
                          </span>
                        </div>
                        <ChevronRight className={`transition-all duration-300 ${
                          ('view' in item && view === item.view) ? 'text-white translate-x-0 opacity-100' : 'text-[#8B9D77] -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
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
                        <div className="space-y-4">
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
                          <button 
                            onClick={() => { handleLogout(); setIsMenuOpen(false); }}
                            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-all"
                          >
                            <UserIcon size={20} /> Logout
                          </button>
                        </div>
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
                Thank you for your purchase. We've sent the order details to our sales team ({settings?.email || 'vinayakorganicfarmvmm@gmail.com'}). You can download a copy of your order below.
              </p>
              
              <div className="mb-8">
                <button 
                  onClick={() => downloadOrderCopy()}
                  className="w-full flex items-center justify-center gap-2 bg-[#F5F3ED] text-[#2D2A26] py-3 rounded-xl font-bold hover:bg-[#E5E1D8] transition-colors text-sm"
                >
                  <Package size={18} /> Download Order Copy
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
                {cart.length === 0 && userOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#8E8A84]">
                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {cart.length > 0 && (
                      <div className="space-y-8">
                        <h4 className="text-sm uppercase tracking-widest font-bold text-[#8B9D77]">Current Cart</h4>
                        {cart.map((item) => (
                          <div key={item.id} className="flex gap-4">
                            <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#F5F3ED] flex-shrink-0">
                              <img src={item.image || undefined} className="w-full h-full object-cover" alt={item.name} />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <h4 className="font-bold">{item.name}</h4>
                                <button onClick={() => removeFromCart(item.id)} className="text-[#8E8A84] hover:text-red-500">
                                  <Trash2 size={16} />
                                </button>
                              </div>
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

                    {userOrders.length > 0 && (
                      <div className="space-y-6">
                        <h4 className="text-sm uppercase tracking-widest font-bold text-[#8B9D77]">Order History</h4>
                        {userOrders?.map((order) => (
                          <div key={order.id} className="p-4 rounded-xl bg-[#F5F3ED] border border-[#E5E1D8]">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-[#8E8A84]">#{order.id.slice(-6)}</span>
                              <span className="text-xs text-[#8E8A84]">
                                {formatDate(order.timestamp)}
                              </span>
                              <button 
                                onClick={() => downloadOrderCopy(order, currentUser!)}
                                className="p-1 text-[#8B9D77] hover:bg-[#8B9D77]/10 rounded-lg transition-colors"
                                title="Download Invoice"
                              >
                                <Package size={14} />
                              </button>
                            </div>
                            <div className="space-y-1">
                              {order.items?.map((item, idx) => (
                                <p key={idx} className="text-xs text-[#8E8A84]">{item.name} x {item.quantity}</p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
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
                            <label className="block text-xs font-bold uppercase tracking-wider text-[#8E8A84] mb-2">Username or Email</label>
                            <input 
                              type="text" 
                              required
                              value={loginForm.usernameOrEmail}
                              onChange={(e) => setLoginForm({...loginForm, usernameOrEmail: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                              placeholder="Enter username or email"
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
                              <div className="flex gap-2">
                                <select 
                                  value={registerForm.countryCode}
                                  onChange={(e) => setRegisterForm({...registerForm, countryCode: e.target.value})}
                                  className="w-32 px-2 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77] text-sm"
                                >
                                  {COUNTRIES.map(c => (
                                    <option key={`${c.id}-${c.code}`} value={c.code}>{c.code} ({c.id})</option>
                                  ))}
                                </select>
                                <input 
                                  type="tel" 
                                  required
                                  value={registerForm.phone}
                                  onChange={(e) => setRegisterForm({...registerForm, phone: e.target.value})}
                                  className="flex-1 px-4 py-3 rounded-xl border border-[#E5E1D8] outline-none focus:ring-2 focus:ring-[#8B9D77]" 
                                />
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-[#8E8A84] mb-4 italic">
                            * Username, email, and phone number must be unique.
                          </p>
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
                  <span className="break-all">{settings?.email || 'vinayakorganicfarmvmm@gmail.com'}</span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-white/5 text-center text-[#8E8A84] text-sm">
            <p>© {new Date().getFullYear()} Vinayak Organic Rice Farm. All rights reserved.</p>
            {settings?.footerText && (
              <p className="mt-2 text-[#8E8A84]/80 italic whitespace-pre-wrap">{settings.footerText}</p>
            )}
          </div>
        </div>
      </footer>
    </div>
  </ErrorBoundary>
  );
}
