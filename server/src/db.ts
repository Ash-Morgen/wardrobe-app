import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Simple file-based storage
const DATA_DIR = path.join(process.cwd(), 'data');
const CLOTHING_FILE = path.join(DATA_DIR, 'clothing.json');
const OUTFITS_FILE = path.join(DATA_DIR, 'outfits.json');

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Clothing types
interface ClothingItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// Outfit types
interface OutfitItem {
  clothingId: string;
  position: { x: number; y: number };
}

interface Outfit {
  id: string;
  name: string;
  description?: string;
  items: OutfitItem[];
  createdAt: string;
  updatedAt: string;
}

// Storage functions
function loadData<T>(filePath: string, defaultValue: T[]): T[] {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
  }
  return defaultValue;
}

function saveData<T>(filePath: string, data: T[]): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Clothing operations
function getAllClothing(): ClothingItem[] {
  return loadData<ClothingItem>(CLOTHING_FILE, []);
}

function getClothingById(id: string): ClothingItem | undefined {
  const clothing = getAllClothing();
  return clothing.find(c => c.id === id);
}

function createClothing(item: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>): ClothingItem {
  const clothing = getAllClothing();
  const now = new Date().toISOString();
  const newItem: ClothingItem = {
    ...item,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now
  };
  clothing.push(newItem);
  saveData(CLOTHING_FILE, clothing);
  return newItem;
}

function updateClothing(id: string, updates: Partial<ClothingItem>): ClothingItem | null {
  const clothing = getAllClothing();
  const index = clothing.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  clothing[index] = {
    ...clothing[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveData(CLOTHING_FILE, clothing);
  return clothing[index];
}

function deleteClothing(id: string): boolean {
  const clothing = getAllClothing();
  const index = clothing.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  clothing.splice(index, 1);
  saveData(CLOTHING_FILE, clothing);
  return true;
}

// Outfit operations
function getAllOutfits(): Outfit[] {
  return loadData<Outfit>(OUTFITS_FILE, []);
}

function getOutfitById(id: string): Outfit | undefined {
  const outfits = getAllOutfits();
  return outfits.find(o => o.id === id);
}

function createOutfit(data: Omit<Outfit, 'id' | 'createdAt' | 'updatedAt'>): Outfit {
  const outfits = getAllOutfits();
  const now = new Date().toISOString();
  const newOutfit: Outfit = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now
  };
  outfits.push(newOutfit);
  saveData(OUTFITS_FILE, outfits);
  return newOutfit;
}

function updateOutfit(id: string, updates: Partial<Outfit>): Outfit | null {
  const outfits = getAllOutfits();
  const index = outfits.findIndex(o => o.id === id);
  if (index === -1) return null;
  
  outfits[index] = {
    ...outfits[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };
  saveData(OUTFITS_FILE, outfits);
  return outfits[index];
}

function deleteOutfit(id: string): boolean {
  const outfits = getAllOutfits();
  const index = outfits.findIndex(o => o.id === id);
  if (index === -1) return false;
  
  outfits.splice(index, 1);
  saveData(OUTFITS_FILE, outfits);
  return true;
}

// Initialize with sample data
function initDb(): void {
  ensureDataDir();
  const clothing = getAllClothing();
  
  if (clothing.length === 0) {
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
    
    for (const item of sampleClothing) {
      createClothing(item);
    }
    console.log('Sample data initialized with', sampleClothing.length, 'items');
  }
}

export default {
  initDb,
  getAllClothing,
  getClothingById,
  createClothing,
  updateClothing,
  deleteClothing,
  getAllOutfits,
  getOutfitById,
  createOutfit,
  updateOutfit,
  deleteOutfit
};
