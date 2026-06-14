import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import Toast from 'react-native-toast-message';
import { clothingApi, Category } from '@/utils/api';

const CATEGORY_OPTIONS = [
  { id: 'tops', name: '上衣' },
  { id: 'bottoms', name: '裤子' },
  { id: 'outerwear', name: '外套' },
  { id: 'dresses', name: '裙子' },
  { id: 'bags', name: '包包' },
  { id: 'accessories', name: '配饰' },
];

export default function AddClothingScreen() {
  const router = useSafeRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [clothingName, setClothingName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedSubcategory, setSelectedSubcategory] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await clothingApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo?.uri) {
          setCapturedImage(photo.uri);
          await processImage(photo.uri);
        }
      } catch (error) {
        console.error('Failed to take picture:', error);
        Toast.show({ type: 'error', text1: '拍照失败' });
      }
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      await processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setIsProcessing(true);
    try {
      const result = await clothingApi.upload(uri);
      setProcessedImage(result.imageUrl);
    } catch (error) {
      console.error('Failed to process image:', error);
      Toast.show({ type: 'error', text1: '图片处理失败' });
      // Fallback: use original image
      setProcessedImage(uri);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setShowSaveModal(false);
    setClothingName('');
    setSelectedCategory('');
    setSelectedSubcategory('');
  };

  const handleSave = () => {
    if (!processedImage) {
      Toast.show({ type: 'error', text1: '请先拍摄或选择图片' });
      return;
    }
    if (!selectedCategory) {
      Toast.show({ type: 'error', text1: '请选择分类' });
      return;
    }
    setShowSaveModal(true);
  };

  const confirmSave = async () => {
    if (!processedImage || !selectedCategory) return;

    setIsSaving(true);
    try {
      const name = clothingName.trim() || `${CATEGORY_OPTIONS.find(c => c.id === selectedCategory)?.name || '衣服'}_${Date.now()}`;
      await clothingApi.create({
        name,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        imageUrl: processedImage,
        thumbnailUrl: processedImage,
      });
      Toast.show({ type: 'success', text1: '添加成功' });
      resetCapture();
      router.back();
    } catch (error) {
      console.error('Failed to save:', error);
      Toast.show({ type: 'error', text1: '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  const getSubcategories = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories || [];
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B7355" />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#8B7355" />
          <Text style={styles.permissionTitle}>需要相机权限</Text>
          <Text style={styles.permissionText}>
            请允许访问相机以拍摄衣服照片
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>授予权限</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (capturedImage && processedImage) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={resetCapture}>
            <Ionicons name="arrow-back" size={24} color="#3D3D3D" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>添加衣服</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Preview */}
        <ScrollView style={styles.previewContainer}>
          <View style={styles.imagePreviewContainer}>
            {isProcessing ? (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color="#8B7355" />
                <Text style={styles.processingText}>正在处理图片...</Text>
              </View>
            ) : (
              <ExpoImage
                source={{ uri: processedImage }}
                style={styles.previewImage}
                contentFit="contain"
              />
            )}
          </View>

          {/* Quick Select Category */}
          <View style={styles.quickSelectContainer}>
            <Text style={styles.sectionTitle}>选择分类</Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat.id && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('');
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === cat.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Subcategory */}
          {selectedCategory && getSubcategories(selectedCategory).length > 0 && (
            <View style={styles.subcategoryContainer}>
              <Text style={styles.sectionTitle}>子分类（可选）</Text>
              <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.subcategoryRow}>
                  {getSubcategories(selectedCategory).map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[
                        styles.subcategoryChip,
                        selectedSubcategory === sub && styles.subcategoryChipActive,
                      ]}
                      onPress={() => setSelectedSubcategory(sub)}
                    >
                      <Text
                        style={[
                          styles.subcategoryChipText,
                          selectedSubcategory === sub && styles.subcategoryChipTextActive,
                        ]}
                      >
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              </View>
            </View>
          )}

          {/* Name Input */}
          <View style={styles.nameInputContainer}>
            <Text style={styles.sectionTitle}>衣服名称（可选）</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="例如：夏季白T恤"
              placeholderTextColor="#8A8A8A"
              value={clothingName}
              onChangeText={setClothingName}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, (!selectedCategory || isProcessing) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!selectedCategory || isProcessing}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>保存到衣橱</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Camera Header */}
      <View style={styles.cameraHeader}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.cameraHeaderTitle}>拍摄衣服</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
        >
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraGuide}>
              <View style={[styles.guideCorner, styles.guideTopLeft]} />
              <View style={[styles.guideCorner, styles.guideTopRight]} />
              <View style={[styles.guideCorner, styles.guideBottomLeft]} />
              <View style={[styles.guideCorner, styles.guideBottomRight]} />
            </View>
            <Text style={styles.cameraHint}>将衣服置于框内</Text>
          </View>
        </CameraView>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
          <Ionicons name="images-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={{ width: 56 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3D3D3D',
    marginTop: 20,
  },
  permissionText: {
    fontSize: 14,
    color: '#8A8A8A',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#8B7355',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#000000',
  },
  cameraHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuide: {
    width: 280,
    height: 350,
    position: 'relative',
  },
  guideCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#8B7355',
  },
  guideTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  guideTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  guideBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  guideBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  cameraHint: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 16,
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#8B7355',
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B7355',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  imagePreviewContainer: {
    height: 300,
    backgroundColor: '#F5F0EB',
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    flex: 1,
  },
  processingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#8B7355',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D3D3D',
    marginBottom: 12,
  },
  quickSelectContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F0EB',
  },
  categoryChipActive: {
    backgroundColor: '#8B7355',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  subcategoryContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  subcategoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subcategoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  subcategoryChipActive: {
    backgroundColor: '#4A7C59',
    borderColor: '#4A7C59',
  },
  subcategoryChipText: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  subcategoryChipTextActive: {
    color: '#FFFFFF',
  },
  nameInputContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  nameInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#3D3D3D',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B7355',
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
