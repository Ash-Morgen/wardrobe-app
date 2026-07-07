import * as SQLite from "expo-sqlite";

export interface Clothing {
  id: string; name: string; category: string; subcategory: string;
  imageUrl: string; thumbnailUrl: string; createdAt: string; updatedAt: string;
}
export interface Outfit {
  id: string; name: string; description: string;
  items: { clothingId: string; position: { x: number; y: number } }[];
  createdAt: string; updatedAt: string;
}
export interface Category { id: string; name: string; subcategories: string[]; }

export const CATEGORIES: Category[] = [
  { id: "tops", name: "上衣", subcategories: ["T恤","衬衫","卫衣","毛衣","针织衫"] },
  { id: "bottoms", name: "裤子", subcategories: ["牛仔裤","休闲裤","短裤","运动裤","裙子"] },
  { id: "outerwear", name: "外套", subcategories: ["夹克","大衣","风衣","羽绒服","西装"] },
  { id: "dresses", name: "裙子", subcategories: ["连衣裙","半裙","礼服"] },
  { id: "bags", name: "包包", subcategories: ["背包","手提包","单肩包","钱包","旅行包"] },
  { id: "accessories", name: "配饰", subcategories: ["帽子","围巾","腰带","首饰","眼镜"] },
];

let db: SQLite.SQLiteDatabase | null = null;
let _ready: Promise<void> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("wardrobe.db");
  await db.execAsync("CREATE TABLE IF NOT EXISTS clothing (id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,subcategory TEXT,imageUrl TEXT NOT NULL,thumbnailUrl TEXT,createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);CREATE TABLE IF NOT EXISTS outfits (id TEXT PRIMARY KEY,name TEXT NOT NULL,description TEXT,items TEXT NOT NULL DEFAULT '[]',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL);");
  const r = await db.getFirstAsync("SELECT COUNT(*) as c FROM clothing") as any;
  if (r?.c === 0) {
    const samples = [
      ["白色棉质T恤","tops","T恤","https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"],
      ["蓝色条纹衬衫","tops","衬衫","https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400"],
      ["黑色休闲裤","bottoms","休闲裤","https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400"],
      ["蓝色牛仔裤","bottoms","牛仔裤","https://images.unsplash.com/photo-1542272604-787c3835535d?w=400"],
      ["灰色连帽卫衣","tops","卫衣","https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400"],
      ["黑色皮夹克","outerwear","夹克","https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400"],
      ["驼色风衣","outerwear","风衣","https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=400"],
      ["棕色手提包","bags","手提包","https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400"],
      ["黑色双肩包","bags","背包","https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400"],
      ["黑色棒球帽","accessories","帽子","https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400"],
      ["小黑裙","dresses","连衣裙","https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400"],
    ];
    const n = new Date().toISOString();
    for (const [name, cat, sub, img] of samples) {
      const id = Date.now() + "-" + Math.random().toString(36).slice(2, 11);
      await db.runAsync("INSERT INTO clothing VALUES (?,?,?,?,?,?,?,?)", [id, name, cat, sub, img, img, n, n]);
    }
  }
  return db;
}
function ready() { if (!_ready) _ready = open().then(() => {}); return _ready; }

export async function getAllClothing(cat?: string): Promise<Clothing[]> {
  await ready(); const d = await open();
  if (cat && cat !== "all") return await d.getAllAsync("SELECT * FROM clothing WHERE category=? ORDER BY createdAt DESC", [cat]) as Clothing[];
  return await d.getAllAsync("SELECT * FROM clothing ORDER BY createdAt DESC") as Clothing[];
}
export async function getClothingById(id: string): Promise<Clothing | null> {
  await ready(); return await (await open()).getFirstAsync("SELECT * FROM clothing WHERE id=?", [id]) as Clothing | null;
}
export async function createClothing(data: { name: string; category: string; subcategory?: string; imageUrl: string; thumbnailUrl?: string }): Promise<Clothing> {
  await ready(); const d = await open(); const now = new Date().toISOString();
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  const item: Clothing = { id, name: data.name, category: data.category, subcategory: data.subcategory || "", imageUrl: data.imageUrl, thumbnailUrl: data.thumbnailUrl || data.imageUrl, createdAt: now, updatedAt: now };
  await d.runAsync("INSERT INTO clothing VALUES(?,?,?,?,?,?,?,?)", [item.id, item.name, item.category, item.subcategory, item.imageUrl, item.thumbnailUrl, item.createdAt, item.updatedAt]);
  return item;
}
export async function updateClothing(id: string, u: Partial<Pick<Clothing, "name"|"category"|"subcategory">>): Promise<Clothing | null> {
  await ready(); const d = await open();
  if (!(await d.getFirstAsync("SELECT id FROM clothing WHERE id=?", [id]))) return null;
  const s: string[] = []; const v: any[] = [];
  if (u.name !== undefined) { s.push("name=?"); v.push(u.name); }
  if (u.category !== undefined) { s.push("category=?"); v.push(u.category); }
  if (u.subcategory !== undefined) { s.push("subcategory=?"); v.push(u.subcategory); }
  if (s.length) { s.push("updatedAt=?"); v.push(new Date().toISOString()); v.push(id); await d.runAsync("UPDATE clothing SET " + s.join(",") + " WHERE id=?", v); }
  return await d.getFirstAsync("SELECT * FROM clothing WHERE id=?", [id]) as Clothing | null;
}
export async function deleteClothing(id: string): Promise<boolean> {
  await ready(); return ((await (await open()).runAsync("DELETE FROM clothing WHERE id=?", [id])) as any).changes > 0;
}
export async function getAllOutfits(): Promise<Outfit[]> {
  await ready(); const rows = await (await open()).getAllAsync("SELECT * FROM outfits ORDER BY createdAt DESC") as any[];
  return rows.map(r => ({ id: r.id, name: r.name, description: r.description || "", items: JSON.parse(r.items || "[]"), createdAt: r.createdAt, updatedAt: r.updatedAt }));
}
export async function createOutfit(data: { name: string; description?: string; items: { clothingId: string; position?: { x: number; y: number } }[] }): Promise<Outfit> {
  await ready(); const d = await open(); const now = new Date().toISOString();
  const id = Date.now() + "-" + Math.random().toString(36).slice(2, 11);
  const j = JSON.stringify(data.items.map(i => ({ clothingId: i.clothingId, position: i.position || { x: 0, y: 0 } })));
  await d.runAsync("INSERT INTO outfits VALUES(?,?,?,?,?,?)", [id, data.name, data.description || "", j, now, now]);
  const r = await d.getFirstAsync("SELECT * FROM outfits WHERE id=?", [id]) as any;
  return { id: r.id, name: r.name, description: r.description || "", items: JSON.parse(r.items || "[]"), createdAt: r.createdAt, updatedAt: r.updatedAt };
}
export async function deleteOutfit(id: string): Promise<boolean> {
  await ready(); return ((await (await open()).runAsync("DELETE FROM outfits WHERE id=?", [id])) as any).changes > 0;
}
export async function imageToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:") || uri.startsWith("https://") || uri.startsWith("http://")) return uri;
  try {
    const fs = require("expo-file-system");
    const b = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 });
    const ext = (uri.split(".").pop() || "jpg").toLowerCase();
    return "data:image/" + (ext === "png" ? "png" : ext === "webp" ? "webp" : "jpeg") + ";base64," + b;
  } catch { return uri; }
}