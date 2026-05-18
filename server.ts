import express from 'express';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REGISTER_FILE = path.join(process.cwd(), 'register.json');
const ORDERS_FILE = path.join(process.cwd(), 'order_details.json');
const PRODUCTS_FILE = path.join(process.cwd(), 'products.json');
const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const INQUIRIES_FILE = path.join(process.cwd(), 'inquiries.json');

// Default products
const DEFAULT_PRODUCTS = [
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

// Default settings
const DEFAULT_SETTINGS = {
  email: 'vinayakorganicfarmvmm@gmail.com',
  phone: '+91 9791414470',
  location: 'Opposite to Jain Math, Tirumalai, Vadamathimangalam, Tiruvannamalai District, Tamil Nadu 606907, India',
  googleMapsLink: 'https://maps.app.goo.gl/G92xNNFMdpTmzGp38',
  googleMapsEmbed: 'https://maps.google.com/maps?q=Vinayak%20Organic%20Farm,%20Opposite%20to%20Jain%20Math,%20Tirumalai,%20Vadamathimangalam,%20Tiruvannamalai%20District,%20Tamil%20Nadu%20606907,%20India&t=&z=15&ie=UTF8&iwloc=&output=embed'
};

// Admin user
const ADMIN_USER = {
  id: 'admin',
  name: 'Vinayak Organic Farm',
  username: 'Admin_arun_vel',
  password: 'V!n@y@k0202',
  email: 'vinayakorganicfarmvmm@gmail.com',
  phone: '+91 8870361912',
  role: 'admin'
};

// Helper to read/write JSON files
async function readJsonFile(filePath: string, defaultValue: any = []) {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return defaultValue;
  }
}

async function writeJsonFile(filePath: string, data: any) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// Initialize files
async function initFiles() {
  const users = await readJsonFile(REGISTER_FILE);
  if (!users.find((u: any) => u.username === ADMIN_USER.username)) {
    users.push(ADMIN_USER);
    await writeJsonFile(REGISTER_FILE, users);
  }

  const products = await readJsonFile(PRODUCTS_FILE);
  if (products.length === 0) {
    await writeJsonFile(PRODUCTS_FILE, DEFAULT_PRODUCTS);
  }

  const settings = await readJsonFile(SETTINGS_FILE, null);
  if (!settings) {
    await writeJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
  }

  const inquiries = await readJsonFile(INQUIRIES_FILE);
  if (inquiries.length === 0) {
    await writeJsonFile(INQUIRIES_FILE, []);
  }
}

initFiles();

let resendClient: Resend | null = null;

function getResendClient() {
  if (!resendClient) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendClient = new Resend(key);
  }
  return resendClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/send-email', async (req, res) => {
    const { to, subject, body } = req.body;

    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY is not set. Email will not be sent.');
      return res.status(200).json({ 
        success: true, 
        message: 'Email simulation (API key missing)',
        isSimulation: true 
      });
    }

    try {
      const resend = getResendClient();
      // NOTE: Resend's free tier (onboarding@resend.dev) only allows sending to the account owner's email.
      // To send to any recipient, you must verify your domain in the Resend dashboard.
      const data = await resend.emails.send({
        from: 'Vinayak Organic Farm <onboarding@resend.dev>',
        to: to,
        subject: subject,
        text: body,
      });

      if (data.error) {
        console.error('Resend Error:', data.error);
        return res.status(400).json({ success: false, error: data.error });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // User Registration
  app.post('/api/register', async (req, res) => {
    const newUser = req.body;
    const users = await readJsonFile(REGISTER_FILE);
    
    if (users.find((u: any) => u.username === newUser.username)) {
      return res.status(400).json({ success: false, message: 'Try register with different username' });
    }

    users.push(newUser);
    await writeJsonFile(REGISTER_FILE, users);
    res.json({ success: true, user: newUser });
  });

  // User Login
  app.post('/api/login', async (req, res) => {
    const { usernameOrEmail, password } = req.body;
    const users = await readJsonFile(REGISTER_FILE);
    
    const user = users.find((u: any) => u.username === usernameOrEmail || u.email === usernameOrEmail);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Username or Email not exist. Please register!' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, message: 'Password is incorrect!' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  });

  // Password Reset
  app.post('/api/reset-password', async (req, res) => {
    const { username, email, phone, newPassword } = req.body;
    const users = await readJsonFile(REGISTER_FILE);
    const userIndex = users.findIndex((u: any) => u.username === username && u.email === email && u.phone === phone);
    
    if (userIndex !== -1) {
      users[userIndex].password = newPassword;
      await writeJsonFile(REGISTER_FILE, users);
      res.json({ success: true, message: 'Password reset successful' });
    } else {
      res.status(404).json({ success: false, message: 'User not found with these details' });
    }
  });

  // Products
  app.get('/api/products', async (req, res) => {
    const products = await readJsonFile(PRODUCTS_FILE);
    res.json({ success: true, products });
  });

  app.post('/api/products', async (req, res) => {
    const product = req.body;
    const products = await readJsonFile(PRODUCTS_FILE);
    const index = products.findIndex((p: any) => p.id === product.id);
    
    if (index !== -1) {
      products[index] = product;
    } else {
      products.push(product);
    }
    
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true, product });
  });

  app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    let products = await readJsonFile(PRODUCTS_FILE);
    products = products.filter((p: any) => p.id !== id);
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true });
  });

  app.post('/api/products/reorder', async (req, res) => {
    const products = req.body;
    await writeJsonFile(PRODUCTS_FILE, products);
    res.json({ success: true });
  });

  // Settings
  app.get('/api/settings', async (req, res) => {
    const settings = await readJsonFile(SETTINGS_FILE, DEFAULT_SETTINGS);
    res.json({ success: true, settings });
  });

  app.post('/api/settings', async (req, res) => {
    const settings = req.body;
    await writeJsonFile(SETTINGS_FILE, settings);
    res.json({ success: true, settings });
  });

  // Orders
  app.post('/api/orders', async (req, res) => {
    const newOrder = req.body;
    const orders = await readJsonFile(ORDERS_FILE);
    orders.push(newOrder);
    await writeJsonFile(ORDERS_FILE, orders);
    res.json({ success: true, order: newOrder });
  });

  app.get('/api/orders/:userId', async (req, res) => {
    const { userId } = req.params;
    const orders = await readJsonFile(ORDERS_FILE);
    const userOrders = orders.filter((o: any) => o.customer.id === userId);
    res.json({ success: true, orders: userOrders });
  });

  // Inquiries
  app.post('/api/inquiries', async (req, res) => {
    const inquiry = req.body;
    const inquiries = await readJsonFile(INQUIRIES_FILE);
    inquiries.push({ ...inquiry, id: Date.now().toString(), date: new Date().toISOString() });
    await writeJsonFile(INQUIRIES_FILE, inquiries);
    res.json({ success: true });
  });

  // Admin Endpoints
  app.get('/api/admin/users', async (req, res) => {
    const users = await readJsonFile(REGISTER_FILE);
    res.json({ success: true, users: users.map((u: any) => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    }) });
  });

  app.get('/api/admin/orders', async (req, res) => {
    const orders = await readJsonFile(ORDERS_FILE);
    res.json({ success: true, orders });
  });

  app.get('/api/admin/inquiries', async (req, res) => {
    const inquiries = await readJsonFile(INQUIRIES_FILE);
    res.json({ success: true, inquiries });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
