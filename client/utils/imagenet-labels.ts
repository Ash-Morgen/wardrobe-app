/**
 * ImageNet 标签 → 衣橱分类 映射表
 *
 * EfficientNetV2-S 返回 ImageNet-1K 的标签名称。
 * 此映射将衣服相关的标签翻译成 APP 的 6 大类 + 子类。
 */

interface LabelMapEntry {
  categoryId: string;     // 例如 "tops"
  subcategory?: string;   // 例如 "T恤"，undefined 表示只映射到大类
}

/**
 * ImageNet 衣服标签 → 衣橱分类映射
 * 键为 ImageNet 标签名（小写），值为对应的分类映射
 */
const LABEL_MAP: Record<string, LabelMapEntry> = {
  // ====== 上衣 (tops) ======
  't-shirt': { categoryId: 'tops', subcategory: 'T恤' },
  'jersey': { categoryId: 'tops', subcategory: 'T恤' },
  'tee': { categoryId: 'tops', subcategory: 'T恤' },
  'polo': { categoryId: 'tops', subcategory: 'T恤' },
  'blouse': { categoryId: 'tops', subcategory: '衬衫' },
  'shirt': { categoryId: 'tops', subcategory: '衬衫' },
  'dress shirt': { categoryId: 'tops', subcategory: '衬衫' },
  'hoodie': { categoryId: 'tops', subcategory: '卫衣' },
  'hooded sweatshirt': { categoryId: 'tops', subcategory: '卫衣' },
  'sweatshirt': { categoryId: 'tops', subcategory: '卫衣' },
  'sweater': { categoryId: 'tops', subcategory: '毛衣' },
  'cardigan': { categoryId: 'tops', subcategory: '毛衣' },
  'knit': { categoryId: 'tops', subcategory: '针织衫' },
  'tank top': { categoryId: 'tops', subcategory: 'T恤' },
  'crop top': { categoryId: 'tops', subcategory: 'T恤' },
  'vest': { categoryId: 'tops', subcategory: 'T恤' },
  'tunic': { categoryId: 'tops', subcategory: '衬衫' },
  'kimono': { categoryId: 'tops', subcategory: '衬衫' },

  // ====== 裤子 (bottoms) ======
  'jean': { categoryId: 'bottoms', subcategory: '牛仔裤' },
  'jeans': { categoryId: 'bottoms', subcategory: '牛仔裤' },
  'trouser': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'trousers': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'pant': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'pants': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'slacks': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'chino': { categoryId: 'bottoms', subcategory: '休闲裤' },
  'shorts': { categoryId: 'bottoms', subcategory: '短裤' },
  'bermuda shorts': { categoryId: 'bottoms', subcategory: '短裤' },
  'sweatpant': { categoryId: 'bottoms', subcategory: '运动裤' },
  'sweatpants': { categoryId: 'bottoms', subcategory: '运动裤' },
  'jogger': { categoryId: 'bottoms', subcategory: '运动裤' },
  'legging': { categoryId: 'bottoms', subcategory: '运动裤' },
  'leggings': { categoryId: 'bottoms', subcategory: '运动裤' },
  'skirt': { categoryId: 'bottoms', subcategory: '裙子' },  // 短裙/半裙归在 bottoms
  'miniskirt': { categoryId: 'bottoms', subcategory: '裙子' },

  // ====== 外套 (outerwear) ======
  'jacket': { categoryId: 'outerwear', subcategory: '夹克' },
  'bomber jacket': { categoryId: 'outerwear', subcategory: '夹克' },
  'leather jacket': { categoryId: 'outerwear', subcategory: '夹克' },
  'denim jacket': { categoryId: 'outerwear', subcategory: '夹克' },
  'coat': { categoryId: 'outerwear', subcategory: '大衣' },
  'overcoat': { categoryId: 'outerwear', subcategory: '大衣' },
  'trench coat': { categoryId: 'outerwear', subcategory: '风衣' },
  'trenchcoat': { categoryId: 'outerwear', subcategory: '风衣' },
  'windbreaker': { categoryId: 'outerwear', subcategory: '风衣' },
  'down jacket': { categoryId: 'outerwear', subcategory: '羽绒服' },
  'puffer jacket': { categoryId: 'outerwear', subcategory: '羽绒服' },
  'puffer coat': { categoryId: 'outerwear', subcategory: '羽绒服' },
  'parka': { categoryId: 'outerwear', subcategory: '羽绒服' },
  'suit': { categoryId: 'outerwear', subcategory: '西装' },
  'blazer': { categoryId: 'outerwear', subcategory: '西装' },
  'suit jacket': { categoryId: 'outerwear', subcategory: '西装' },

  // ====== 裙子 (dresses) ======
  'dress': { categoryId: 'dresses', subcategory: '连衣裙' },
  'gown': { categoryId: 'dresses', subcategory: '连衣裙' },
  'evening gown': { categoryId: 'dresses', subcategory: '礼服' },
  'wedding gown': { categoryId: 'dresses', subcategory: '礼服' },
  'sundress': { categoryId: 'dresses', subcategory: '连衣裙' },
  'cocktail dress': { categoryId: 'dresses', subcategory: '礼服' },
  'maxi dress': { categoryId: 'dresses', subcategory: '连衣裙' },
  'midi dress': { categoryId: 'dresses', subcategory: '连衣裙' },
  'jumpsuit': { categoryId: 'dresses', subcategory: '连衣裙' },
  'romper': { categoryId: 'dresses', subcategory: '连衣裙' },

  // ====== 包包 (bags) ======
  'backpack': { categoryId: 'bags', subcategory: '背包' },
  'handbag': { categoryId: 'bags', subcategory: '手提包' },
  'purse': { categoryId: 'bags', subcategory: '手提包' },
  'clutch': { categoryId: 'bags', subcategory: '单肩包' },
  'shoulder bag': { categoryId: 'bags', subcategory: '单肩包' },
  'wallet': { categoryId: 'bags', subcategory: '钱包' },
  'billfold': { categoryId: 'bags', subcategory: '钱包' },
  'suitcase': { categoryId: 'bags', subcategory: '旅行包' },
  'luggage': { categoryId: 'bags', subcategory: '旅行包' },
  'duffel bag': { categoryId: 'bags', subcategory: '旅行包' },
  'tote bag': { categoryId: 'bags', subcategory: '手提包' },
  'messenger bag': { categoryId: 'bags', subcategory: '单肩包' },
  'crossbody bag': { categoryId: 'bags', subcategory: '单肩包' },

  // ====== 配饰 (accessories) ======
  'hat': { categoryId: 'accessories', subcategory: '帽子' },
  'cap': { categoryId: 'accessories', subcategory: '帽子' },
  'baseball cap': { categoryId: 'accessories', subcategory: '帽子' },
  'beret': { categoryId: 'accessories', subcategory: '帽子' },
  'sun hat': { categoryId: 'accessories', subcategory: '帽子' },
  'beanie': { categoryId: 'accessories', subcategory: '帽子' },
  'scarf': { categoryId: 'accessories', subcategory: '围巾' },
  'belt': { categoryId: 'accessories', subcategory: '腰带' },
  'necklace': { categoryId: 'accessories', subcategory: '首饰' },
  'bracelet': { categoryId: 'accessories', subcategory: '首饰' },
  'watch': { categoryId: 'accessories', subcategory: '首饰' },
  'ring': { categoryId: 'accessories', subcategory: '首饰' },
  'earring': { categoryId: 'accessories', subcategory: '首饰' },
  'sunglass': { categoryId: 'accessories', subcategory: '眼镜' },
  'sunglasses': { categoryId: 'accessories', subcategory: '眼镜' },
  'eyeglass': { categoryId: 'accessories', subcategory: '眼镜' },
  'glasses': { categoryId: 'accessories', subcategory: '眼镜' },
  'necktie': { categoryId: 'accessories', subcategory: '围巾' },
  'tie': { categoryId: 'accessories', subcategory: '围巾' },
  'bow tie': { categoryId: 'accessories', subcategory: '围巾' },
  'glove': { categoryId: 'accessories', subcategory: '首饰' },
  'gloves': { categoryId: 'accessories', subcategory: '首饰' },
  'crown': { categoryId: 'accessories', subcategory: '帽子' },
  'mask': { categoryId: 'accessories', subcategory: '围巾' },
};

/**
 * 分类推理结果
 */
export interface ClassificationResult {
  /** ImageNet 原始标签 */
  label: string;
  /** 置信度 0-1 */
  confidence: number;
  /** 映射后的分类 ID */
  categoryId: string;
  /** 映射后的分类中文名 */
  categoryName: string;
  /** 映射后的子分类，可能为空 */
  subcategory: string | null;
  /** 子分类在映射表中有值 */
  hasSubcategory: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  tops: '上衣',
  bottoms: '裤子',
  outerwear: '外套',
  dresses: '裙子',
  bags: '包包',
  accessories: '配饰',
};

/**
 * 将 ImageNet 分类结果映射到衣橱分类
 * @param predictions - useClassification hook 返回的 { label: score } 对象
 * @param minConfidence - 最低置信度阈值（默认 0.3）
 * @returns 排序后的分类结果数组，空数组表示未能识别
 */
export function mapPredictions(
  predictions: Record<string, number>,
  minConfidence: number = 0.3
): ClassificationResult[] {
  const results: ClassificationResult[] = [];

  for (const [label, confidence] of Object.entries(predictions)) {
    if (confidence < 0.1) continue; // 忽略极低置信度

    const lowLabel = label.toLowerCase().trim();
    const mapping = LABEL_MAP[lowLabel];

    if (mapping) {
      results.push({
        label,
        confidence,
        categoryId: mapping.categoryId,
        categoryName: CATEGORY_NAMES[mapping.categoryId] || mapping.categoryId,
        subcategory: mapping.subcategory || null,
        hasSubcategory: !!mapping.subcategory,
      });
    }
  }

  // 按置信度降序
  results.sort((a, b) => b.confidence - a.confidence);

  // 过滤掉低于阈值的
  return results.filter(r => r.confidence >= minConfidence);
}

/**
 * 获取最可能的分类（取置信度最高的）
 */
export function getBestMatch(
  predictions: Record<string, number>,
  minConfidence: number = 0.3
): ClassificationResult | null {
  const mapped = mapPredictions(predictions, minConfidence);
  return mapped.length > 0 ? mapped[0] : null;
}

/**
 * 获取英文标签对应的中文名称（用于显示）
 */
export function getLabelDisplayName(label: string): string {
  const lowLabel = label.toLowerCase().trim();
  const mapping = LABEL_MAP[lowLabel];
  if (mapping) {
    return mapping.subcategory || CATEGORY_NAMES[mapping.categoryId] || mapping.categoryId;
  }
  return label;
}
