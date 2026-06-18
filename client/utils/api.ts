import { Platform } from 'react-native';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

/**
 * 创建跨平台兼容的文件对象，用于 FormData.append()
 */
export async function createFormDataFile(
  fileUri: string,
  fileName: string,
  mimeType: string
): Promise<File | { uri: string; type: string; name: string }> {
  if (Platform.OS === 'web') {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }
  return { uri: fileUri, type: mimeType, name: fileName };
}

/**
 * 构建文件或图片完整的URL
 * 在预览环境下，需要将 localhost URL 替换为实际的 API 地址
 */
export const buildAssetUrl = (url?: string | null): string | undefined => {
  if (!url) return undefined;
  
  // 如果是 data URI（base64），直接返回
  if (url.startsWith('data:')) return url;
  
  // 如果是本地文件 URI（file://），直接返回
  if (url.startsWith('file://')) return url;
  
  // 如果是 localhost URL，替换为 API_BASE
  if (/^https?:\/\/localhost(:\d+)?\//i.test(url)) {
    return url.replace(/^https?:\/\/localhost(:\d+)?/i, API_BASE);
  }
  
  // 如果是完整 URL，直接返回
  if (/^https?:\/\//i.test(url)) return url;
  
  // 相对路径，拼接 API_BASE
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

/**
 * 将UTC时间字符串转换为本地时间字符串
 */
export const convertToLocalTimeStr = (utcDateStr: string): string => {
  if (!utcDateStr) return utcDateStr;
  const microUtcRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}/;
  if (!microUtcRegex.test(utcDateStr)) return utcDateStr;
  const normalized = utcDateStr.replace(/\.(\d{6})$/, (_, frac) => `.${frac.slice(0, 3)}`);
  const d = dayjs.utc(normalized);
  if (!d.isValid()) return utcDateStr;
  return d.local().format('YYYY-MM-DD HH:mm:ss');
};

// API Base URL export
export const API_URL = API_BASE;

// Types
export interface Clothing {
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

export interface Outfit {
  id: string;
  name: string;
  description?: string;
  items: OutfitItem[];
  coverImageUrl?: string;
  createdAt: string;
}

export interface OutfitItem {
  clothingId: string;
  position: { x: number; y: number };
  clothing?: Clothing;
}

export interface Category {
  id: string;
  name: string;
  subcategories: string[];
}

// Clothing API
export const clothingApi = {
  getCategories: async (): Promise<Category[]> => {
    const res = await fetch(`${API_URL}/api/v1/categories`);
    const data = await res.json();
    return data.data;
  },

  upload: async (fileUri: string): Promise<{ id: string; imageUrl: string; thumbnailUrl: string }> => {
    const formData = new FormData();
    const file = await createFormDataFile(fileUri, 'photo.png', 'image/png');
    formData.append('file', file as any);

    const res = await fetch(`${API_URL}/api/v1/clothing/upload`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  create: async (clothing: Partial<Clothing>): Promise<Clothing> => {
    const res = await fetch(`${API_URL}/api/v1/clothing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clothing),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  getAll: async (category?: string): Promise<Clothing[]> => {
    const url = category && category !== 'all'
      ? `${API_URL}/api/v1/clothing?category=${category}`
      : `${API_URL}/api/v1/clothing`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  getById: async (id: string): Promise<Clothing> => {
    const res = await fetch(`${API_URL}/api/v1/clothing/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  update: async (id: string, updates: Partial<Clothing>): Promise<Clothing> => {
    const res = await fetch(`${API_URL}/api/v1/clothing/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/v1/clothing/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },
};

// Outfit API
export const outfitApi = {
  create: async (outfit: { name: string; description?: string; items: OutfitItem[] }): Promise<Outfit> => {
    const res = await fetch(`${API_URL}/api/v1/outfits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outfit),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  getAll: async (): Promise<Outfit[]> => {
    const res = await fetch(`${API_URL}/api/v1/outfits`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  getById: async (id: string): Promise<Outfit> => {
    const res = await fetch(`${API_URL}/api/v1/outfits/${id}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  update: async (id: string, outfit: { name?: string; items?: OutfitItem[] }): Promise<Outfit> => {
    const res = await fetch(`${API_URL}/api/v1/outfits/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(outfit),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/v1/outfits/${id}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
  },
};
