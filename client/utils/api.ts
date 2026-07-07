import { Platform } from "react-native";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

// Import local database instead of HTTP API
import * as DB from "@/database";

// Re-export types for backward compatibility
export type { Clothing, Outfit, Category, OutfitItemData } from "@/database";
export { CATEGORIES } from "@/database";

export async function createFormDataFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<File | { uri: string; type: string; name: string }> {
  if (Platform.OS === "web") {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }
  return { uri: fileUri, type: mimeType, name: fileName };
}

export const buildAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("file://")) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return url;
};

export const convertToLocalTimeStr = (utcDateStr: string): string => {
  if (!utcDateStr) return utcDateStr;
  const microUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}/;
  if (!microUtcRegex.test(utcDateStr)) return utcDateStr;
  const normalized = utcDateStr.replace(/\.(\d{6})$/, (_, frac) => `.${frac.slice(0, 3)}`);
  const d = dayjs.utc(normalized);
  if (!d.isValid()) return utcDateStr;
  return d.local().format("YYYY-MM-DD HH:mm:ss");
};

// Local-only API surface — calls database directly
export const clothingApi = {
  getCategories: async () => DB.CATEGORIES,

  upload: async (fileUri: string) => {
    const imageUrl = await DB.imageToBase64(fileUri);
    return { id: "", imageUrl, thumbnailUrl: imageUrl };
  },

  create: async (clothing: Partial<DB.Clothing>) => {
    return DB.createClothing({
      name: clothing.name || "",
      category: clothing.category || "",
      subcategory: clothing.subcategory,
      imageUrl: clothing.imageUrl || "",
      thumbnailUrl: clothing.thumbnailUrl,
    });
  },

  getAll: async (category?: string) => DB.getAllClothing(category),
  getById: async (id: string) => DB.getClothingById(id),
  update: async (id: string, updates: Partial<DB.Clothing>) => DB.updateClothing(id, updates),
  delete: async (id: string) => { await DB.deleteClothing(id); },
};

export const outfitApi = {
  create: async (outfit: { name: string; description?: string; items: { clothingId: string; position?: { x: number; y: number } }[] }) => DB.createOutfit(outfit),
  getAll: async () => DB.getAllOutfits(),
  getById: async (id: string) => DB.getOutfitById(id),
  update: async (id: string, data: { name?: string; items?: { clothingId: string; position?: { x: number; y: number } }[] }) => DB.updateOutfit(id, data),
  delete: async (id: string) => { await DB.deleteOutfit(id); },
};
