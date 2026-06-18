import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import db from "./db.js";

// Initialize database
db.initDb();

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
app.get('/api/v1/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Categories API
app.get('/api/v1/categories', (_req: Request, res: Response) => {
  res.json(CATEGORIES);
});

// Clothing API
app.get('/api/v1/clothing', (_req: Request, res: Response) => {
  const clothing = db.getAllClothing();
  res.json(clothing);
});

app.get('/api/v1/clothing/:id', (req: Request, res: Response) => {
  const id = req.params.id as string as string;
  const item = db.getClothingById(id);
  if (!item) {
    return res.status(404).json({ error: 'Clothing not found' });
  }
  res.json(item);
});

app.post('/api/v1/clothing/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { name, category } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    // Convert image to base64
    const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const newClothing = db.createClothing({
      name,
      category,
      imageUrl: base64Image
    });

    res.json(newClothing);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.put('/api/v1/clothing/:id', (req: Request, res: Response) => {
  const { name, category, imageUrl } = req.body;
  const updated = db.updateClothing(req.params.id as string, { name, category, imageUrl });
  if (!updated) {
    return res.status(404).json({ error: 'Clothing not found' });
  }
  res.json(updated);
});

app.delete('/api/v1/clothing/:id', (req: Request, res: Response) => {
  const deleted = db.deleteClothing(req.params.id as string);
  if (!deleted) {
    return res.status(404).json({ error: 'Clothing not found' });
  }
  res.json({ success: true });
});

// Outfit API
app.get('/api/v1/outfits', (_req: Request, res: Response) => {
  const outfits = db.getAllOutfits();
  res.json(outfits);
});

app.get('/api/v1/outfits/:id', (req: Request, res: Response) => {
  const outfit = db.getOutfitById(req.params.id as string);
  if (!outfit) {
    return res.status(404).json({ error: 'Outfit not found' });
  }
  res.json(outfit);
});

app.post('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const { name, description, items } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const newOutfit = db.createOutfit({
      name,
      description,
      items: items || []
    });

    res.json(newOutfit);
  } catch (error) {
    console.error('Create outfit error:', error);
    res.status(500).json({ error: 'Failed to create outfit' });
  }
});

app.put('/api/v1/outfits/:id', (req: Request, res: Response) => {
  try {
    const { name, description, items } = req.body;
    const updated = db.updateOutfit(req.params.id as string, { name, description, items });
    if (!updated) {
      return res.status(404).json({ error: 'Outfit not found' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Update outfit error:', error);
    res.status(500).json({ error: 'Failed to update outfit' });
  }
});

app.delete('/api/v1/outfits/:id', (req: Request, res: Response) => {
  const deleted = db.deleteOutfit(req.params.id as string);
  if (!deleted) {
    return res.status(404).json({ error: 'Outfit not found' });
  }
  res.json({ success: true });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/api/v1/health`);
});

export default app;
