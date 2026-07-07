import { useCallback, useState } from 'react';
import {
  useClassification,
  EFFICIENTNET_V2_S,
} from 'react-native-executorch';
import {
  mapPredictions,
  getBestMatch,
  type ClassificationResult,
} from '@/utils/imagenet-labels';

export type ClassifierStatus =
  | 'loading'       // 模型正在加载/下载
  | 'ready'         // 模型就绪
  | 'classifying'   // 正在推理
  | 'error';        // 出错了

export interface ClassifierState {
  status: ClassifierStatus;
  downloadProgress: number;
  error: string | null;
  result: ClassificationResult | null;
  allPredictions: ClassificationResult[];
}

export interface ClassifierActions {
  classifyImage: (imageUri: string) => Promise<ClassificationResult | null>;
  resetResult: () => void;
}

/**
 * 衣服 AI 分类 Hook
 *
 * 封装 react-native-executorch 的 useClassification hook，
 * 自动将 ImageNet 分类结果映射到衣橱 6 大分类体系。
 */
export function useClothingClassifier(): ClassifierState & ClassifierActions {
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [allPredictions, setAllPredictions] = useState<ClassificationResult[]>([]);
  const [status, setStatus] = useState<ClassifierStatus>('loading');

  const {
    isReady,
    isGenerating,
    error: executorchError,
    downloadProgress,
    forward,
  } = useClassification({
    model: EFFICIENTNET_V2_S,
  });

  // 模型加载/下载完成
  const derivedStatus: ClassifierStatus =
    executorchError ? 'error' :
    isGenerating ? 'classifying' :
    isReady ? 'ready' :
    'loading';

  const classifyImage = useCallback(async (
    imageUri: string,
  ): Promise<ClassificationResult | null> => {
    if (!isReady || !forward) {
      console.warn('[ClothingClassifier] Model not ready');
      return null;
    }

    setStatus('classifying');

    try {
      const predictions = await forward(imageUri);
      const best = getBestMatch(predictions);
      const all = mapPredictions(predictions);

      setResult(best);
      setAllPredictions(all);
      setStatus('ready');

      return best;
    } catch (e: any) {
      console.error('[ClothingClassifier] Classification failed:', e);
      setStatus('error');
      return null;
    }
  }, [isReady, forward]);

  const resetResult = useCallback(() => {
    setResult(null);
    setAllPredictions([]);
  }, []);

  return {
    status: derivedStatus,
    downloadProgress,
    error: executorchError?.message || null,
    result,
    allPredictions,
    classifyImage,
    resetResult,
  };
}
