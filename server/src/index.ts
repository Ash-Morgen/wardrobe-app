import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { S3Storage } from 'coze-coding-dev-sdk';

const app = express();
const port = process.env.PORT || 9091;
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Types
interface Clothing {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  thumbnailUrl: string;
  color?: string;
  season?: string;
  createdAt: string;
  updatedAt: string;
}

interface OutfitItem {
  clothingId: string;
  position: { x: number; y: number };
  scale?: number;
}

interface Outfit {
  id: string;
  name: string;
  description?: string;
  items: OutfitItem[];
  createdAt: string;
  updatedAt?: string;
}

// Categories
const CATEGORIES = [
  { name: '上衣', value: 'tops', icon: '👕' },
  { name: '裤子', value: 'bottoms', icon: '👖' },
  { name: '外套', value: 'outerwear', icon: '🧥' },
  { name: '裙子', value: 'dresses', icon: '👗' },
  { name: '包包', value: 'bags', icon: '👜' },
  { name: '配饰', value: 'accessories', icon: '🎒' }
];

// Initialize storage
const clothingStore = new Map<string, Clothing>();
const outfitStore = new Map<string, Outfit>();

// Initialize with sample data
const sampleClothing = [
  { name: '白色棉质T恤', category: 'tops', subcategory: 'T恤', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200', createdAt: new Date().toISOString() },
  { name: '蓝色条纹衬衫', category: 'tops', subcategory: '衬衫', imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=200', createdAt: new Date().toISOString() },
  { name: '黑色休闲裤', category: 'bottoms', subcategory: '休闲裤', imageUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=200', createdAt: new Date().toISOString() },
  { name: '蓝色牛仔裤', category: 'bottoms', subcategory: '牛仔裤', imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=200', createdAt: new Date().toISOString() },
  { name: '灰色连帽卫衣', category: 'tops', subcategory: '卫衣', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200', createdAt: new Date().toISOString() },
  { name: '黑色皮夹克', category: 'outerwear', subcategory: '夹克', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200', createdAt: new Date().toISOString() },
  { name: '驼色风衣', category: 'outerwear', subcategory: '风衣', imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=200', createdAt: new Date().toISOString() },
  { name: '棕色手提包', category: 'bags', subcategory: '手提包', imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200', createdAt: new Date().toISOString() },
  { name: '黑色双肩包', category: 'bags', subcategory: '背包', imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=200', createdAt: new Date().toISOString() },
  { name: '黑色棒球帽', category: 'accessories', subcategory: '帽子', imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=200', createdAt: new Date().toISOString() },
  { name: '小黑裙', category: 'dresses', subcategory: '连衣裙', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200', createdAt: new Date().toISOString() }
];

sampleClothing.forEach((item, index) => {
  const id = uuidv4();
  clothingStore.set(id, { ...item, id } as Clothing);
});

console.log('Loaded', clothingStore.size, 'sample clothing items');

// Fast background removal function
async function removeBackgroundEdgeBased(buffer: Buffer): Promise<Buffer> {
  try {
    console.log('Starting fast background removal...');
    
    const { data: rawData, info } = await sharp(buffer)
      .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { width, height, channels } = info;
    console.log('Processing ' + width + 'x' + height + ' image');
    
    const rgbaData = Buffer.alloc(width * height * 4);
    for (let i = 0; i < width * height; i++) {
      if (channels >= 3) {
        rgbaData[i * 4] = rawData[i * channels];
        rgbaData[i * 4 + 1] = rawData[i * channels + 1];
        rgbaData[i * 4 + 2] = rawData[i * channels + 2];
        rgbaData[i * 4 + 3] = channels === 4 ? rawData[i * channels + 3] : 255;
      }
    }
    
    // Sample corner colors
    const samples: number[][] = [];
    const n = Math.min(10, Math.floor(width / 10), Math.floor(height / 10));
    
    for (let i = 0; i < n; i++) {
      samples.push([rgbaData[(i * width + i) * 4], rgbaData[(i * width + i) * 4 + 1], rgbaData[(i * width + i) * 4 + 2]]);
      samples.push([rgbaData[(i * width + width - 1 - i) * 4], rgbaData[(i * width + width - 1 - i) * 4 + 1], rgbaData[(i * width + width - 1 - i) * 4 + 2]]);
      samples.push([rgbaData[((height - 1 - i) * width + i) * 4], rgbaData[((height - 1 - i) * width + i) * 4 + 1], rgbaData[((height - 1 - i) * width + i) * 4 + 2]]);
      samples.push([rgbaData[((height - 1 - i) * width + width - 1 - i) * 4], rgbaData[((height - 1 - i) * width + width - 1 - i) * 4 + 1], rgbaData[((height - 1 - i) * width + width - 1 - i) * 4 + 2]]);
    }
    
    const avgColor = samples.reduce((acc, [r, g, b]) => [acc[0] + r, acc[1] + g, acc[2] + b], [0, 0, 0]);
    const [bgR, bgG, bgB] = avgColor.map(v => Math.round(v / samples.length));
    const brightness = (bgR + bgG + bgB) / 3;
    
    console.log('Background: RGB(' + bgR + ',' + bgG + ',' + bgB + ') brightness:' + brightness.toFixed(0));
    
    if (brightness < 140 && brightness > 115) {
      console.log('Medium brightness background, keeping original');
      return buffer;
    }
    
    const isLightBg = brightness > 170;
    const threshold = isLightBg ? 70 : 50;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = rgbaData[idx];
        const g = rgbaData[idx + 1];
        const b = rgbaData[idx + 2];
        
        const dist = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
        const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
        
        let alpha = 255;
        if (dist < threshold) {
          const edgeFactor = Math.min(1, edgeDist / 8);
          alpha = Math.round(255 * (0.2 + 0.8 * edgeFactor));
        }
        
        rgbaData[idx + 3] = alpha;
      }
    }
    
    const output = await sharp(rgbaData, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();
    
    console.log('Background removal done, output size: ' + output.length);
    return output;
    
  } catch (error) {
    console.error('Background removal failed:', error);
    return buffer;
  }
}

// Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Wardrobe API is running' });
});

// Get categories
app.get('/api/v1/categories', (req: Request, res: Response) => {
  res.json({ success: true, data: CATEGORIES });
});

// Get all clothing
app.get('/api/v1/clothing', (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    let items = Array.from(clothingStore.values());
    
    if (category && typeof category === 'string') {
      items = items.filter(item => item.category === category);
    }
    
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('Get clothing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get clothing' });
  }
});

// Upload clothing
app.post('/api/v1/clothing/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    
    const { name, category, subcategory, color, season } = req.body;
    
    console.log('Processing upload:', { name, category, fileSize: req.file.size });
    
    // Process image with background removal
    let processedBuffer: Buffer = req.file.buffer;
    processedBuffer = await removeBackgroundEdgeBased(req.file.buffer);
    console.log('Background removed, processing size:', processedBuffer.length);
    
    // Generate unique filename
    const id = uuidv4();
    const filename = `${id}_${Date.now()}.png`;
    
    // Upload to storage
    const storage = new S3Storage();
    const objectKey = await storage.uploadFile({ fileContent: processedBuffer, fileName: `clothing/${filename}`, contentType: 'image/png' });
    const imageUrl = await storage.generatePresignedUrl({ key: objectKey as string });
    
    const clothing: Clothing = {
      id,
      name: name || '未命名',
      category: category || 'tops',
      subcategory: subcategory || undefined,
      imageUrl,
      thumbnailUrl: imageUrl,
      color: color || undefined,
      season: season || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    clothingStore.set(id, clothing);
    console.log('Clothing saved:', clothing.id, clothing.imageUrl);
    
    res.json({ success: true, data: clothing });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload clothing' });
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
    
    const { name, category, subcategory, color, season } = req.body;
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

// Get all outfits
app.get('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const outfits = Array.from(outfitStore.values()).map(outfit => {
      const itemsWithDetails = outfit.items.map(item => {
        const clothing = clothingStore.get(item.clothingId);
        return {
          ...item,
          clothing: clothing || null
        };
      });
      return { ...outfit, items: itemsWithDetails };
    });
    
    res.json({ success: true, data: outfits });
  } catch (error) {
    console.error('Get outfits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get outfits' });
  }
});

// Create outfit
app.post('/api/v1/outfits', (req: Request, res: Response) => {
  try {
    const { name, description, items } = req.body;
    
    if (!name) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }
    
    if (!items || !Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'Items array is required' });
      return;
    }
    
    const id = uuidv4();
    const outfit: Outfit = {
      id,
      name,
      description: description || undefined,
      items: items.map((item: any) => ({
        clothingId: String(item.clothingId),
        position: item.position || { x: 0, y: 0 },
        scale: item.scale || 1
      })),
      createdAt: new Date().toISOString()
    };
    
    outfitStore.set(id, outfit);
    res.json({ success: true, data: outfit });
  } catch (error) {
    console.error('Create outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to create outfit' });
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

// Update outfit
app.put('/api/v1/outfits/:id', (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const outfit = outfitStore.get(id);
    
    if (!outfit) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }
    
    const { name, description, items } = req.body;
    if (name) outfit.name = name;
    if (description !== undefined) outfit.description = description;
    if (items && Array.isArray(items)) {
      outfit.items = items.map((item: any) => ({
        clothingId: String(item.clothingId),
        position: item.position || { x: 0, y: 0 },
        scale: item.scale || 1
      }));
    }
    outfit.updatedAt = new Date().toISOString();
    
    outfitStore.set(id, outfit);
    res.json({ success: true, data: outfit });
  } catch (error) {
    console.error('Update outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to update outfit' });
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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File size exceeds limit (max 50MB)' });
  }
  next(err);
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log('Wardrobe server listening at http://0.0.0.0:' + port + '/');
  console.log('Categories: ' + CATEGORIES.map(c => c.name).join(', '));
});
