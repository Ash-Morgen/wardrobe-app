import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'wardrobe.db');

// 确保 data 目录存在
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS clothing (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    imageUrl TEXT NOT NULL,
    thumbnailUrl TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS outfits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    items TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

export default db;

// 辅助函数
export function clothingToRow(clothing: any) {
  return {
    id: clothing.id,
    name: clothing.name,
    category: clothing.category,
    subcategory: clothing.subcategory || null,
    imageUrl: clothing.imageUrl,
    thumbnailUrl: clothing.thumbnailUrl || null,
    createdAt: clothing.createdAt,
    updatedAt: clothing.updatedAt,
  };
}

export function rowToClothing(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function outfitToRow(outfit: any) {
  return {
    id: outfit.id,
    name: outfit.name,
    description: outfit.description || null,
    items: JSON.stringify(outfit.items || []),
    createdAt: outfit.createdAt,
    updatedAt: outfit.updatedAt,
  };
}

export function rowToOutfit(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    items: JSON.parse(row.items || '[]'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// 分类相关
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    orderIndex INTEGER DEFAULT 0,
    subcategories TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

export interface Category {
  id: string;
  name: string;
  orderIndex: number;
  subcategories: string[];
  createdAt: string;
  updatedAt: string;
}

export function categoryToRow(category: Category) {
  return {
    id: category.id,
    name: category.name,
    orderIndex: category.orderIndex,
    subcategories: JSON.stringify(category.subcategories || []),
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

export function rowToCategory(row: any): Category | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    orderIndex: row.orderIndex,
    subcategories: JSON.parse(row.subcategories || '[]'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// 默认分类数据
const defaultCategories: Category[] = [
  { id: 'cat-1', name: '上衣', orderIndex: 0, subcategories: ['T恤', '衬衫', '卫衣', '毛衣', '背心'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-2', name: '裤子', orderIndex: 1, subcategories: ['牛仔裤', '休闲裤', '运动裤', '短裤', '裙子'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-3', name: '外套', orderIndex: 2, subcategories: ['夹克', '风衣', '大衣', '羽绒服', '西装'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-4', name: '裙子', orderIndex: 3, subcategories: ['连衣裙', '半身裙', '短裙', '长裙'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-5', name: '包包', orderIndex: 4, subcategories: ['单肩包', '双肩包', '手提包', '钱包', '行李箱'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'cat-6', name: '配饰', orderIndex: 5, subcategories: ['帽子', '围巾', '腰带', '手套', '袜子'], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

// 初始化默认分类
export function initDefaultCategories() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (existing.count === 0) {
    const stmt = db.prepare('INSERT INTO categories (id, name, orderIndex, subcategories, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)');
    for (const cat of defaultCategories) {
      stmt.run(cat.id, cat.name, cat.orderIndex, JSON.stringify(cat.subcategories), cat.createdAt, cat.updatedAt);
    }
  }
}

// 初始化
initDefaultCategories();

// 获取所有分类
export function getAllCategories(): Category[] {
  const rows = db.prepare('SELECT * FROM categories ORDER BY orderIndex ASC').all();
  return rows.map(row => rowToCategory(row) as Category).filter(Boolean);
}

// 根据ID获取分类
export function getCategoryById(id: string): Category | null {
  const row = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  return rowToCategory(row);
}

// 更新分类
export function updateCategory(id: string, name: string, subcategories: string[]): Category | null {
  const stmt = db.prepare(
    'UPDATE categories SET name = ?, subcategories = ?, updatedAt = ? WHERE id = ?'
  );
  const result = stmt.run(name, JSON.stringify(subcategories), new Date().toISOString(), id);
  if (result.changes === 0) return null;
  return getCategoryById(id);
}

// 删除分类
export function deleteCategory(id: string): boolean {
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  return result.changes > 0;
}
