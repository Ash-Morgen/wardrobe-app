// 瀑布流布局工具函数

export interface MasonryItem {
  id: string;
  imageUrl: string;
  aspectRatio: number;
  title?: string;
  [key: string]: any;
}

/**
 * 视觉修正后的高度计算器
 * Min 0.5: 允许最高为宽度的 2 倍 (长卡片)
 * Max 2.0: 允许最扁为宽度的 0.5 倍 (短卡片)
 */
export function getOptimizedDimensions(
  originalAspectRatio: number,
  columnWidth: number
) {
  const CLAMPED_RATIO = Math.min(Math.max(originalAspectRatio, 0.5), 2.0);
  return {
    height: columnWidth / CLAMPED_RATIO,
    isClamped: originalAspectRatio < 0.5 || originalAspectRatio > 2.0,
  };
}

/**
 * 贪心分配算法 (Greedy Layout)
 * 永远放入当前最矮的那一列
 */
export function distributeItems<T extends MasonryItem>(
  items: T[],
  columnWidth: number,
  columns = 2
) {
  const FOOTER_HEIGHT = 60; // 底部区域高度

  const columnArrays: T[][] = Array.from({ length: columns }, () => []);
  const columnHeights: number[] = Array(columns).fill(0);

  items.forEach((item) => {
    const { height: imgHeight } = getOptimizedDimensions(item.aspectRatio || 1, columnWidth);
    const totalItemHeight = imgHeight + FOOTER_HEIGHT;

    const shortestIndex = columnHeights.indexOf(Math.min(...columnHeights));

    columnArrays[shortestIndex].push(item);
    columnHeights[shortestIndex] += totalItemHeight;
  });

  return columnArrays;
}

/**
 * 生成模拟瀑布流数据
 */
export function generateMockMasonryData(count = 20): MasonryItem[] {
  return Array.from({ length: count }).map((_, i) => {
    let ratio: number;
    const seed = Math.random();

    if (seed < 0.2) {
      ratio = 1.6 + Math.random() * 0.2; // 扁图
    } else if (seed < 0.7) {
      ratio = 0.75 + Math.random() * 0.4; // 常规图
    } else {
      ratio = 0.5 + Math.random() * 0.1; // 长图
    }

    const w = 400;
    const h = Math.floor(w / ratio);

    return {
      id: String(i),
      imageUrl: `https://picsum.photos/${w}/${h}?random=${i}`,
      aspectRatio: ratio,
      title: `Item ${i}`,
    };
  });
}
