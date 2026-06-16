/**
 * 图像处理工具 - 背景移除
 * 使用Canvas和颜色检测实现简单的背景移除
 */

interface RemoveBackgroundOptions {
  threshold?: number; // 颜色差异阈值，默认50
  edgeRadius?: number; // 边缘羽化半径，默认3
  bgColorSample?: 'corners' | 'center'; // 背景采样方式
}

/**
 * 检测背景颜色
 */
function detectBackgroundColor(imageData: ImageData): { r: number; g: number; b: number } {
  const { data, width, height } = imageData;
  
  // 采样四个角和边缘中点
  const corners: number[][] = [];
  
  // 四个角
  const positions = [
    [0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1],
    [Math.floor(width / 2), 0], [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)], [width - 1, Math.floor(height / 2)],
  ];
  
  positions.forEach(([x, y]) => {
    const idx = (y * width + x) * 4;
    corners.push([data[idx], data[idx + 1], data[idx + 2]]);
  });
  
  // 计算平均颜色
  const avgColor = corners.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
    [0, 0, 0]
  );
  
  return {
    r: Math.round(avgColor[0] / corners.length),
    g: Math.round(avgColor[1] / corners.length),
    b: Math.round(avgColor[2] / corners.length),
  };
}

/**
 * 计算颜色距离
 */
function colorDistance(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

/**
 * 使用Canvas移除图像背景
 * @param imageUri - 图像URI
 * @param options - 配置选项
 * @returns 处理后的图像URI (data URL)
 */
export async function removeBackgroundWithCanvas(
  imageUri: string,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  const { threshold = 60, edgeRadius = 5 } = options;
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // 创建Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // 设置Canvas尺寸
        const maxSize = 800;
        let { width, height } = img;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // 绘制图像
        ctx.drawImage(img, 0, 0, width, height);
        
        // 获取图像数据
        const imageData = ctx.getImageData(0, 0, width, height);
        const { data } = imageData;
        
        // 检测背景颜色
        const bgColor = detectBackgroundColor(imageData);
        console.log('Detected background color:', bgColor);
        
        // 计算边缘距离用于羽化
        const edgeDistances: number[][] = [];
        for (let y = 0; y < height; y++) {
          edgeDistances[y] = [];
          for (let x = 0; x < width; x++) {
            const edgeDist = Math.min(x, y, width - 1 - x, height - 1 - y);
            edgeDistances[y][x] = edgeDist;
          }
        }
        
        // 处理每个像素
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            
            // 计算与背景颜色的距离
            const dist = colorDistance(r, g, b, bgColor.r, bgColor.g, bgColor.b);
            
            // 边缘羽化
            const edgeDist = edgeDistances[y][x];
            const edgeFactor = edgeDist < edgeRadius 
              ? edgeDist / edgeRadius 
              : 1;
            
            // 计算透明度
            let alpha: number;
            if (dist < threshold) {
              // 背景区域 - 使用距离和边缘因子计算透明度
              alpha = Math.round(255 * (1 - dist / threshold) * edgeFactor * 0.8);
            } else {
              alpha = 255;
            }
            
            data[idx + 3] = alpha;
          }
        }
        
        // 将处理后的数据放回Canvas
        ctx.putImageData(imageData, 0, 0);
        
        // 导出为PNG (保持透明度)
        const resultUri = canvas.toDataURL('image/png');
        resolve(resultUri);
        
      } catch (error) {
        console.error('Background removal error:', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // 设置图像源
    img.src = imageUri;
  });
}

/**
 * 处理衣物图像 - 包含背景移除和优化
 * @param imageUri - 原始图像URI
 * @returns 处理后的图像URI
 */
export async function processClothingImage(imageUri: string): Promise<string> {
  try {
    console.log('Processing clothing image with background removal...');
    const result = await removeBackgroundWithCanvas(imageUri, {
      threshold: 60,
      edgeRadius: 5,
    });
    console.log('Background removal completed');
    return result;
  } catch (error) {
    console.error('Image processing failed, returning original:', error);
    return imageUri;
  }
}
