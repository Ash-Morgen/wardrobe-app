import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File upload config - store in /tmp
const uploadDir = '/tmp/wardrobe-uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// In-memory data store (for demo - in production use database)
interface Clothing {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  color?: string;
  season?: string;
}

interface Outfit {
  id: string;
  name: string;
  description?: string;
  items: OutfitItem[];
  coverImageUrl?: string;
  createdAt: string;
}

interface OutfitItem {
  clothingId: string;
  position: { x: number; y: number };
}

const clothingStore: Map<string, Clothing> = new Map();
const outfitStore: Map<string, Outfit> = new Map();

// Categories configuration
const CATEGORIES = [
  { id: 'tops', name: '上衣', subcategories: ['T恤', '衬衫', '卫衣', '毛衣', '针织衫'] },
  { id: 'bottoms', name: '裤子', subcategories: ['牛仔裤', '休闲裤', '短裤', '运动裤', '裙子'] },
  { id: 'outerwear', name: '外套', subcategories: ['夹克', '大衣', '风衣', '羽绒服', '西装'] },
  { id: 'dresses', name: '裙子', subcategories: ['连衣裙', '半裙', '礼服'] },
  { id: 'bags', name: '包包', subcategories: ['背包', '手提包', '单肩包', '钱包', '旅行包'] },
  { id: 'accessories', name: '配饰', subcategories: ['帽子', '围巾', '腰带', '首饰', '眼镜'] }
];

// Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get categories
app.get('/api/v1/categories', (req: Request, res: Response) => {
  res.json({ success: true, data: CATEGORIES });
});

// Upload and process clothing image (with background removal simulation)
app.post('/api/v1/clothing/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const fileId = uuidv4();
    const originalPath = path.join(uploadDir, `${fileId}-original.png`);
    const processedPath = path.join(uploadDir, `${fileId}-processed.png`);

    // Save original image
    await sharp(req.file.buffer).png().toFile(originalPath);

    // Simulate background removal using sharp
    // In production, use remove.bg API or similar service
    // For demo, we'll resize the image to reasonable size
    const processedBuffer = await sharp(req.file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();

    await sharp(processedBuffer).toFile(processedPath);

    // Generate URLs (in production, upload to object storage)
    const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
    const imageUrl = `${baseUrl}/uploads/${fileId}-processed.png`;
    const thumbnailUrl = `${baseUrl}/uploads/${fileId}-processed.png`;

    res.json({
      success: true,
      data: {
        id: fileId,
        imageUrl,
        thumbnailUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to process image' });
  }
});

// Create clothing record
app.post('/api/v1/clothing', (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name?: string;
      category?: string;
      subcategory?: string;
      imageUrl?: string;
      thumbnailUrl?: string;
      color?: string;
      season?: string;
    };

    const { name, category, subcategory, imageUrl, thumbnailUrl, color, season } = body;

    if (!name || !category || !imageUrl) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const clothing: Clothing = {
      id: uuidv4(),
      name,
      category,
      subcategory: subcategory || '',
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      createdAt: new Date().toISOString(),
      color,
      season
    };

    clothingStore.set(clothing.id, clothing);

    res.json({ success: true, data: clothing });
  } catch (error) {
    console.error('Create clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to create clothing' });
  }
});

// Get all clothing (with optional category filter)
app.get('/api/v1/clothing', (req: Request, res: Response) => {
  try {
    const categoryQuery = req.query.category;
    const category = typeof categoryQuery === 'string' ? categoryQuery : undefined;
    let items = Array.from(clothingStore.values());

    if (category && category !== 'all') {
      items = items.filter(c => c.category === category);
    }

    // Sort by created time descending
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get clothing' });
  }
});

// Get single clothing
app.get('/api/v1/clothing/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const clothing = clothingStore.get(id);
    if (!clothing) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }
    res.json({ success: true, data: clothing });
  } catch (error) {
    console.error('Get clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get clothing' });
  }
});

// Update clothing
app.put('/api/v1/clothing/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const clothing = clothingStore.get(id);
    if (!clothing) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }

    const body = req.body as {
      name?: string;
      category?: string;
      subcategory?: string;
      color?: string;
      season?: string;
    };

    const { name, category, subcategory, color, season } = body;
    if (name) clothing.name = name;
    if (category) clothing.category = category;
    if (subcategory) clothing.subcategory = subcategory;
    if (color) clothing.color = color;
    if (season) clothing.season = season;

    clothingStore.set(clothing.id, clothing);
    res.json({ success: true, data: clothing });
  } catch (error) {
    console.error('Update clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to update clothing' });
  }
});

// Delete clothing
app.delete('/api/v1/clothing/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!clothingStore.has(id)) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }
    clothingStore.delete(id);
    res.json({ success: true, message: 'Clothing deleted' });
  } catch (error) {
    console.error('Delete clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete clothing' });
  }
});

// Create outfit (combination)
app.post('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const body = req.body as {
      name?: string;
      description?: string;
      items?: Array<{ clothingId: string; position?: { x: number; y: number } }>;
    };

    const { name, description, items } = body;

    if (!name || !items || items.length === 0) {
      res.status(400).json({ success: false, error: 'Name and items are required' });
      return;
    }

    const outfit: Outfit = {
      id: uuidv4(),
      name,
      description,
      items: items.map((item) => ({
        clothingId: item.clothingId,
        position: item.position || { x: 0, y: 0 }
      })),
      createdAt: new Date().toISOString()
    };

    outfitStore.set(outfit.id, outfit);
    res.json({ success: true, data: outfit });
  } catch (error) {
    console.error('Create outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to create outfit' });
  }
});

// Get all outfits
app.get('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const outfits = Array.from(outfitStore.values()).map(outfit => {
      // Attach clothing details to each outfit item
      const itemsWithDetails = outfit.items.map(item => {
        const clothing = clothingStore.get(item.clothingId);
        return {
          ...item,
          clothing: clothing || null
        };
      });

      return {
        ...outfit,
        items: itemsWithDetails
      };
    });

    // Sort by created time descending
    outfits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, data: outfits });
  } catch (error) {
    console.error('Get outfits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get outfits' });
  }
});

// Get single outfit
app.get('/api/v1/outfits/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const outfit = outfitStore.get(id);
    if (!outfit) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }

    // Attach clothing details
    const itemsWithDetails = outfit.items.map(item => {
      const clothing = clothingStore.get(item.clothingId);
      return {
        ...item,
        clothing: clothing || null
      };
    });

    res.json({ success: true, data: { ...outfit, items: itemsWithDetails } });
  } catch (error) {
    console.error('Get outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to get outfit' });
  }
});

// Delete outfit
app.delete('/api/v1/outfits/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!outfitStore.has(id)) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }
    outfitStore.delete(id);
    res.json({ success: true, message: 'Outfit deleted' });
  } catch (error) {
    console.error('Delete outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete outfit' });
  }
});

// Serve uploaded files (for demo - in production use CDN/object storage)
app.use('/uploads', express.static(uploadDir));

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File size exceeds limit (max 50MB)' });
  }
  next(err);
});

app.listen(port, () => {
  console.log(`Wardrobe server listening at http://localhost:${port}/`);
  console.log(`Categories: ${CATEGORIES.map(c => c.name).join(', ')}`);
});
