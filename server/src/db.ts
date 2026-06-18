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
