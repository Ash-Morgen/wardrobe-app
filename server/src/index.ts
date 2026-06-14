import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { S3Storage } from "coze-coding-dev-sdk";

// Initialize S3 Storage
const s3Storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// File upload config - store in memory (will upload to S3)
const upload = multer({
  storage: multer.memoryStorage(),
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
  updatedAt?: string;
}

interface OutfitItem {
  clothingId: string;
  position: { x: number; y: number };
}

const clothingStore: Map<string, Clothing> = new Map();
const outfitStore: Map<string, Outfit> = new Map();

// Initialize with sample data (Unsplash images)
const sampleClothing: Omit<Clothing, 'id'>[] = [
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
  { name: '小黑裙', category: 'dresses', subcategory: '连衣裙', imageUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400', thumbnailUrl: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200', createdAt: new Date().toISOString() },
];

// Load sample data into store
sampleClothing.forEach((item) => {
  const id = uuidv4();
  clothingStore.set(id, { ...item, id } as Clothing);
});
console.log('Loaded', clothingStore.size, 'sample clothing items');

// Helper function to remove background based on corner color detection
async function removeBackgroundByColor(buffer: Buffer): Promise<Buffer> {
  try {
    // Step 1: Resize for faster processing
    const resized = await sharp(buffer)
      .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data: rawData, info } = resized;
    const { width, height, channels } = info;
    
    // Step 2: Sample corners to detect background color
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
    
    // Calculate average corner color
    const bgR = Math.round(corners.reduce((sum, c) => sum + c[0], 0) / corners.length);
    const bgG = Math.round(corners.reduce((sum, c) => sum + c[1], 0) / corners.length);
    const bgB = Math.round(corners.reduce((sum, c) => sum + c[2], 0) / corners.length);
    
    console.log('Detected background color (RGB):', bgR, bgG, bgB);
    
    // Check if background is light colored (white, light gray, etc.)
    const brightness = (bgR + bgG + bgB) / 3;
    if (brightness < 180) {
      console.log('Background is dark, skipping background removal');
      return buffer;
    }
    
    // Step 3: Create alpha channel - make background transparent
    // Calculate color distance threshold
    const threshold = 50; // Color distance threshold for background detection
    
    // Create output buffer with alpha channel
    const outputData = Buffer.alloc(width * height * 4); // RGBA
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * channels;
        const dstIdx = (y * width + x) * 4;
        
        const r = rawData[srcIdx];
        const g = channels >= 3 ? rawData[srcIdx + 1] : r;
        const b = channels >= 3 ? rawData[srcIdx + 2] : r;
        
        // Calculate color distance from background
        const dist = Math.sqrt(
          Math.pow(r - bgR, 2) + 
          Math.pow(g - bgG, 2) + 
          Math.pow(b - bgB, 2)
        );
        
        // Calculate edge proximity for soft edge
        const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
        const edgeFactor = Math.min(1, edgeDist / 5); // 5 pixel soft edge
        
        // Determine alpha based on distance from background color
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
    
    // Step 4: Convert back to PNG with transparency
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

// Health check
app.get('/api/v1/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get categories
app.get('/api/v1/categories', (req: Request, res: Response) => {
  res.json({ success: true, data: CATEGORIES });
});

// Upload and process clothing image (with automatic background removal)
app.post('/api/v1/clothing/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    const fileId = uuidv4();
    const fileBuffer = req.file.buffer;
    const contentType = req.file.mimetype || 'image/png';
    const ext = 'png'; // Output as PNG for transparency support

    console.log('Starting background removal for image:', fileId);

    // Step 1: Remove background based on corner color detection
    let processedBuffer: Buffer;
    try {
      processedBuffer = await removeBackgroundByColor(fileBuffer);
      console.log('Background removed successfully, size:', processedBuffer.length);
    } catch (bgRemovalError) {
      console.warn('Background removal failed, using original image:', bgRemovalError);
      // Fallback: use original image if background removal fails
      processedBuffer = fileBuffer;
    }

    // Step 2: Resize the processed image (ensure alpha channel is preserved)
    let uploadBuffer = processedBuffer;
    try {
      const processedMeta = await sharp(processedBuffer).metadata();
      // Only resize if the image is larger than 800x800
      if (processedMeta.width && processedMeta.height && 
          (processedMeta.width > 800 || processedMeta.height > 800)) {
        uploadBuffer = await sharp(processedBuffer)
          .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
          .png({ compressionLevel: 9 })
          .toBuffer();
      } else {
        // Just ensure it's PNG format without extra processing
        uploadBuffer = await sharp(processedBuffer)
          .png({ compressionLevel: 9 })
          .toBuffer();
      }
    } catch (sharpError) {
      console.warn('Sharp processing failed, using processed image:', sharpError);
      uploadBuffer = processedBuffer;
    }

    // Step 3: Upload to S3 storage
    const key = await s3Storage.uploadFile({
      fileContent: uploadBuffer,
      fileName: `clothing/${fileId}.${ext}`,
      contentType: 'image/png',
    });

    // Step 4: Generate presigned URL for the uploaded image
    const imageUrl = await s3Storage.generatePresignedUrl({
      key: key,
      expireTime: 86400 * 30, // 30 days
    });

    res.json({
      success: true,
      data: {
        id: fileId,
        imageUrl,
        thumbnailUrl: imageUrl
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

    // Map items to include full clothing info
    const itemsWithClothing = items.map((item) => {
      const clothing = clothingStore.get(item.clothingId);
      return {
        clothingId: item.clothingId,
        position: item.position || { x: 0, y: 0 },
        clothing: clothing || null // Include full clothing object for resilience
      };
    });

    const outfit: Outfit = {
      id: uuidv4(),
      name,
      description,
      items: itemsWithClothing,
      createdAt: new Date().toISOString()
    };

    outfitStore.set(outfit.id, outfit);
    res.json({ success: true, data: outfit });
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

    const outfit = outfitStore.get(id);
    if (!outfit) {
      res.status(404).json({ success: false, error: 'Outfit not found' });
      return;
    }

    // Update outfit data
    if (name) outfit.name = name;
    if (description !== undefined) outfit.description = description;
    if (items !== undefined) outfit.items = items;
    outfit.updatedAt = new Date().toISOString();

    outfitStore.set(id, outfit);
    res.json({ success: true, data: outfit });
  } catch (error) {
    console.error('Update outfit error:', error);
    res.status(500).json({ success: false, error: 'Failed to update outfit' });
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

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, error: 'File size exceeds limit (max 50MB)' });
  }
  next(err);
});

app.listen(Number(port), '0.0.0.0', () => {
  console.log(`Wardrobe server listening at http://0.0.0.0:${port}/`);
  console.log(`Categories: ${CATEGORIES.map(c => c.name).join(', ')}`);
});
