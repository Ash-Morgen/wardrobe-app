import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import db, { 
  clothingToRow, rowToClothing, 
  outfitToRow, rowToOutfit 
} from "./db";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File upload config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Helper function to remove background based on corner color detection
async function removeBackgroundByColor(buffer: Buffer): Promise<Buffer> {
  try {
    const resized = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data: rawData, info } = resized;
    const { width, height, channels } = info;
    
    const corners: [number, number, number][] = [];
    const cornerPositions = [
      [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
      [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
      [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)]
    ];
    
    cornerPositions.forEach(([x, y]) => {
      const idx = (y * width + x) * channels;
      corners.push([rawData[idx], rawData[idx + 1], rawData[idx + 2]]);
    });
    
    const bgR = Math.round(corners.reduce((sum, c) => sum + c[0], 0) / corners.length);
    const bgG = Math.round(corners.reduce((sum, c) => sum + c[1], 0) / corners.length);
    const bgB = Math.round(corners.reduce((sum, c) => sum + c[2], 0) / corners.length);
    
    console.log('Detected background color (RGB):', bgR, bgG, bgB);
    
    const brightness = (bgR + bgG + bgB) / 3;
    if (brightness < 180) {
      console.log('Background is dark, skipping background removal');
      return buffer;
    }
    
    const threshold = 50;
    const outputData = Buffer.alloc(width * height * 4);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * channels;
        const dstIdx = (y * width + x) * 4;
        
        const r = rawData[srcIdx];
        const g = channels >= 3 ? rawData[srcIdx + 1] : r;
        const b = channels >= 3 ? rawData[srcIdx + 2] : r;
        
        const dist = Math.sqrt(
          Math.pow(r - bgR, 2) + 
          Math.pow(g - bgG, 2) + 
          Math.pow(b - bgB, 2)
        );
        
        const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
        const edgeFactor = Math.min(1, edgeDist / 5);
        
        let alpha: number;
        if (dist < threshold) {
          alpha = Math.round(255 * (1 - (dist / threshold)) * edgeFactor);
        } else {
          alpha = 255;
        }
        
        outputData[dstIdx] = r;
        outputData[dstIdx + 1] = g;
        outputData[dstIdx + 2] = b;
        outputData[dstIdx + 3] = alpha;
      }
    }
    
    return await sharp(outputData, {
      raw: { width, height, channels: 4 }
    })
      .png()
      .toBuffer();
  } catch (error) {
    console.error('Background removal error:', error);
    return buffer;
  }
}

// Categories configuration
const CATEGORIES = [
  { id: 'tops', name: '上衣', subcategories: ['T恤', '衬衫', '卫衣', '毛衣', '针织衫'] },
  { id: 'bottoms', name: '裤子', subcategories: ['牛仔裤', '休闲裤', '短裤', '运动裤', '裙子'] },
  { id: 'outerwear', name: '外套', subcategories: ['夹克', '大衣', '风衣', '羽绒服', '西装'] },
  { id: 'dresses', name: '裙子', subcategories: ['连衣裙', '半裙', '礼服'] },
  { id: 'bags', name: '包包', subcategories: ['背包', '手提包', '单肩包', '钱包', '旅行包'] },
  { id: 'accessories', name: '配饰', subcategories: ['帽子', '围巾', '腰带', '首饰', '眼镜'] }
];

// Initialize sample data if database is empty
function initSampleData() {
  const count = db.prepare('SELECT COUNT(*) as count FROM clothing').get() as { count: number };
  if (count.count === 0) {
    console.log('Initializing sample clothing data...');
    const sampleClothing = [
      { name: '白色棉质T恤', category: 'tops', subcategory: 'T恤', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200' },
      { name: '蓝色条纹衬衫', category: 'tops', subcategory: '衬衫', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200' },
      { name: '黑色休闲裤', category: 'bottoms', subcategory: '休闲裤', imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=200' },
      { name: '蓝色牛仔裤', category: 'bottoms', subcategory: '牛仔裤', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200' },
      { name: '灰色连帽卫衣', category: 'tops', subcategory: '卫衣', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200' },
      { name: '黑色皮夹克', category: 'outerwear', subcategory: '夹克', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200' },
      { name: '驼色风衣', category: 'outerwear', subcategory: '风衣', imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=200' },
      { name: '棕色手提包', category: 'bags', subcategory: '手提包', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200' },
      { name: '黑色双肩包', category: 'bags', subcategory: '背包', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200' },
      { name: '黑色棒球帽', category: 'accessories', subcategory: '帽子', imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=200' },
      { name: '小黑裙', category: 'dresses', subcategory: '连衣裙', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200' },
    ];
    
    const stmt = db.prepare(`
      INSERT INTO clothing (id, name, category, subcategory, imageUrl, thumbnailUrl, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const now = new Date().toISOString();
    for (const item of sampleClothing) {
      stmt.run(uuidv4(), item.name, item.category, item.subcategory, item.imageUrl, item.thumbnailUrl, now, now);
    }
    console.log('Sample data initialized with', sampleClothing.length, 'items');
  }
}

// Initialize sample data
initSampleData();

// Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get categories
app.get('/api/v1/categories', (req: Request, res: Response) => {
  res.json({ success: true, data: CATEGORIES });
});

// Upload and process clothing image (store base64 locally)
app.post('/api/v1/clothing/upload', (req: Request, res: Response) => {
  try {
    const { imageData } = req.body as { imageData?: string };

    if (!imageData) {
      res.status(400).json({ success: false, error: 'No image data provided' });
      return;
    }

    const fileId = uuidv4();

    if (imageData.length > 10 * 1024 * 1024) {
      res.status(400).json({ success: false, error: 'Image too large' });
      return;
    }

    res.json({
      success: true,
      data: {
        id: fileId,
        imageUrl: imageData,
        thumbnailUrl: imageData
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
    };

    const { name, category, subcategory, imageUrl, thumbnailUrl } = body;

    if (!name || !category || !imageUrl) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    const now = new Date().toISOString();
    const clothing = {
      id: uuidv4(),
      name,
      category,
      subcategory: subcategory || '',
      imageUrl,
      thumbnailUrl: thumbnailUrl || imageUrl,
      createdAt: now,
      updatedAt: now
    };

    const stmt = db.prepare(`
      INSERT INTO clothing (id, name, category, subcategory, imageUrl, thumbnailUrl, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(clothing.id, clothing.name, clothing.category, clothing.subcategory, clothing.imageUrl, clothing.thumbnailUrl, clothing.createdAt, clothing.updatedAt);

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
    
    let items;
    if (category && category !== 'all') {
      const stmt = db.prepare('SELECT * FROM clothing WHERE category = ? ORDER BY createdAt DESC');
      items = stmt.all(category).map(rowToClothing);
    } else {
      const stmt = db.prepare('SELECT * FROM clothing ORDER BY createdAt DESC');
      items = stmt.all().map(rowToClothing);
    }

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
    const stmt = db.prepare('SELECT * FROM clothing WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }
    res.json({ success: true, data: rowToClothing(row) });
  } catch (error) {
    console.error('Get clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get clothing' });
  }
});

// Update clothing
app.put('/api/v1/clothing/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const stmt = db.prepare('SELECT * FROM clothing WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }

    const body = req.body as {
      name?: string;
      category?: string;
      subcategory?: string;
    };

    const updates: string[] = [];
    const values: any[] = [];

    if (body.name) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.category) {
      updates.push('category = ?');
      values.push(body.category);
    }
    if (body.subcategory !== undefined) {
      updates.push('subcategory = ?');
      values.push(body.subcategory);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const updateStmt = db.prepare(`UPDATE clothing SET ${updates.join(', ')} WHERE id = ?`);
      updateStmt.run(...values);
    }

    const updated = db.prepare('SELECT * FROM clothing WHERE id = ?').get(id) as any;
    res.json({ success: true, data: rowToClothing(updated) });
  } catch (error) {
    console.error('Update clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to update clothing' });
  }
});

// Delete clothing
app.delete('/api/v1/clothing/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const stmt = db.prepare('SELECT id FROM clothing WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Clothing not found' });
      return;
    }
    
    const deleteStmt = db.prepare('DELETE FROM clothing WHERE id = ?');
    deleteStmt.run(id);
    res.json({ success: true, message: 'Clothing deleted' });
  } catch (error) {
    console.error('Delete clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete clothing' });
  }
});

// Helper to get clothing by ID
function getClothingById(id: string) {
  const stmt = db.prepare('SELECT * FROM clothing WHERE id = ?');
  const row = stmt.get(id) as any;
  return row ? rowToClothing(row) : null;
}

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

    const now = new Date().toISOString();
    const outfit = {
      id: uuidv4(),
      name,
      description: description || '',
      items: JSON.stringify(items.map((item) => ({
        clothingId: item.clothingId,
        position: item.position || { x: 0, y: 0 }
      }))),
      createdAt: now,
      updatedAt: now
    };

    const stmt = db.prepare(`
      INSERT INTO outfits (id, name, description, items, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(outfit.id, outfit.name, outfit.description, outfit.items, outfit.createdAt, outfit.updatedAt);

    // Fetch with clothing details
    const savedOutfit = rowToOutfit(db.prepare('SELECT * FROM outfits WHERE id = ?').get(outfit.id) as any)!;
    const itemsWithDetails = JSON.parse(savedOutfit.items).map((item: any) => ({
      ...item,
      clothing: getClothingById(item.clothingId)
    }));

    res.json({ success: true, data: { ...savedOutfit, items: itemsWithDetails } });
  } catch (error) {
    console.error('Create outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to create outfit' });
  }
});

// Update outfit
app.put('/api/v1/outfits/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const { name, description, items } = req.body;

    const stmt = db.prepare('SELECT * FROM outfits WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }
    if (items !== undefined) {
      updates.push('items = ?');
      values.push(JSON.stringify(items));
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      values.push(new Date().toISOString());
      values.push(id);
      
      const updateStmt = db.prepare(`UPDATE outfits SET ${updates.join(', ')} WHERE id = ?`);
      updateStmt.run(...values);
    }

    const updatedOutfit = rowToOutfit(db.prepare('SELECT * FROM outfits WHERE id = ?').get(id) as any)!;
    const itemsWithDetails = JSON.parse(updatedOutfit.items).map((item: any) => ({
      ...item,
      clothing: getClothingById(item.clothingId)
    }));

    res.json({ success: true, data: { ...updatedOutfit, items: itemsWithDetails } });
  } catch (error) {
    console.error('Update outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to update outfit' });
  }
});

// Get all outfits
app.get('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const stmt = db.prepare('SELECT * FROM outfits ORDER BY createdAt DESC');
    const rows = stmt.all() as any[];
    
    const outfits = rows.map(row => {
      const outfit = rowToOutfit(row)!;
      const itemsWithDetails = outfit.items.map((item: any) => ({
        ...item,
        clothing: getClothingById(item.clothingId)
      }));
      return { ...outfit, items: itemsWithDetails };
    });

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
    const stmt = db.prepare('SELECT * FROM outfits WHERE id = ?');
    const row = stmt.get(id) as any;
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }

    const outfit = rowToOutfit(row)!;
    const itemsWithDetails = outfit.items.map((item: any) => ({
      ...item,
      clothing: getClothingById(item.clothingId)
    }));

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
    const stmt = db.prepare('SELECT id FROM outfits WHERE id = ?');
    const row = stmt.get(id);
    
    if (!row) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }
    
    const deleteStmt = db.prepare('DELETE FROM outfits WHERE id = ?');
    deleteStmt.run(id);
    res.json({ success: true, message: 'Outfit deleted' });
  } catch (error) {
    console.error('Delete outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete outfit' });
  }
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File size exceeds limit (max 50MB)' });
  }
  next(err);
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Wardrobe server listening at http://0.0.0.0:${port}/`);
  console.log(`Database: SQLite (data/wardrobe.db)`);
  console.log(`Categories: ${CATEGORIES.map(c => c.name).join(', ')}`);
});
