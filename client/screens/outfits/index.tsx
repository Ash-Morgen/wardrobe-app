import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import Toast from 'react-native-toast-message';
import { outfitApi, clothingApi, Outfit, Clothing, buildAssetUrl } from '@/utils/api';

export default function OutfitScreen() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [clothingList, setClothingList] = useState<Clothing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [editingOutfit, setEditingOutfit] = useState<Outfit | null>(null);
  const [outfitName, setOutfitName] = useState('');
  const [outfitDescription, setOutfitDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ clothingId: string; position: { x: number; y: number } }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectFilterCategory, setSelectFilterCategory] = useState<string>('all');
  const { themeColor } = useContext(ThemeContext);
  const CATEGORIES = [
    { id: 'all', name: '全部' },
    { id: 'tops', name: '上衣' },
    { id: 'bottoms', name: '裤子' },
    { id: 'outerwear', name: '外套' },
    { id: 'dresses', name: '裙子' },
    { id: 'bags', name: '包包' },
    { id: 'accessories', name: '配饰' },
  ];

  const fetchOutfits = useCallback(async () => {
    try {
      const data = await outfitApi.getAll();
      setOutfits(data);
    } catch (error) {
      console.error('Failed to fetch outfits:', error);
    }
  }, []);

  const fetchClothing = useCallback(async () => {
    try {
      const data = await clothingApi.getAll();
      setClothingList(data);
    } catch (error) {
      console.error('Failed to fetch clothing:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await Promise.all([fetchOutfits(), fetchClothing()]);
        setIsLoading(false);
      };
      loadData();
    }, [fetchOutfits, fetchClothing])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOutfits(), fetchClothing()]);
    setRefreshing(false);
  }, [fetchOutfits, fetchClothing]);

  // Filter clothing by category for selection
  const filteredClothing = selectFilterCategory === 'all'
    ? clothingList
    : clothingList.filter(c => c.category === selectFilterCategory);

  const handleCreateOutfit = () => {
    setOutfitName('');
    setOutfitDescription('');
    setSelectedItems([]);
    setShowCreateModal(true);
  };

  const handleSelectClothing = () => {
    setShowSelectModal(true);
  };

  const toggleClothingSelection = (clothingId: string) => {
    const exists = selectedItems.find(item => item.clothingId === clothingId);
    if (exists) {
      setSelectedItems(selectedItems.filter(item => item.clothingId !== clothingId));
    } else {
      setSelectedItems([
        ...selectedItems,
        { clothingId, position: { x: 0, y: 0 } }
      ]);
    }
  };

const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      Toast.show({ type: 'error', text1: '请输入搭配名称' });
      return;
    }
    if (selectedItems.length === 0) {
      Toast.show({ type: 'error', text1: '请至少选择一件衣服' });
      return;
    }

    setIsSaving(true);
    try {
      console.log('Saving outfit:', { editingOutfit: !!editingOutfit, outfitName, selectedItems });
      if (editingOutfit) {
        // Update existing outfit
        const result = await outfitApi.update(editingOutfit.id, {
          name: outfitName.trim(),
          items: selectedItems,
        });
        console.log('Update result:', result);
        Toast.show({ type: 'success', text1: '搭配更新成功' });
      } else {
        // Create new outfit
        await outfitApi.create({
          name: outfitName.trim(),
          description: outfitDescription.trim(),
          items: selectedItems,
        });
        Toast.show({ type: 'success', text1: '搭配创建成功' });
      }
      setShowCreateModal(false);
      fetchOutfits();
    } catch (error: any) {
      console.error('Failed to save outfit:', error);
      Toast.show({ type: 'error', text1: '保存失败', text2: error?.message || '请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // 处理编辑套装保存
  const handleSaveEdit = async () => {
    if (!editingOutfit) return;
    
    if (!editingOutfit.name?.trim()) {
      Toast.show({ type: 'error', text1: '请输入套装名称' });
      return;
    }
    if (selectedItems.length === 0) {
      Toast.show({ type: 'error', text1: '请至少选择一件衣服' });
      return;
    }

    setIsSaving(true);
    try {
      console.log('Updating outfit:', editingOutfit.id, { name: editingOutfit.name.trim(), items: selectedItems });
      const result = await outfitApi.update(editingOutfit.id, {
        name: editingOutfit.name.trim(),
        items: selectedItems,
      });
      console.log('Update result:', result);
      Toast.show({ type: 'success', text1: '套装更新成功' });
      setEditingOutfit(null);
      setSelectedItems([]);
      fetchOutfits();
    } catch (error: any) {
      console.error('Failed to update outfit:', error);
      Toast.show({ type: 'error', text1: '保存失败', text2: error?.message || '请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteOutfit = (outfitId: string) => {
    Alert.alert('确认删除', '确定要删除这个搭配吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await outfitApi.delete(outfitId);
            Toast.show({ type: 'success', text1: '删除成功' });
            fetchOutfits();
          } catch (error) {
            Toast.show({ type: 'error', text1: '删除失败' });
          }
        },
      },
    ]);
  };

  const handleEditOutfit = (outfit: Outfit) => {
    console.log('Editing outfit:', outfit);
    setEditingOutfit(outfit);
    setSelectedItems(outfit.items || []);
  };

  const getClothingById = (id: string) => {
    return clothingList.find(c => c.id === id);
  };

  const getCategoryName = (categoryId: string) => {
    const names: Record<string, string> = {
      tops: '上衣',
      bottoms: '裤子',
      outerwear: '外套',
      dresses: '裙子',
      bags: '包包',
      accessories: '配饰',
    };
    return names[categoryId] || categoryId;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>我的搭配</Text>
          <Text style={styles.headerCount}>{outfits.length} 套搭配</Text>
        </View>
        <TouchableOpacity style={styles.createButton} onPress={handleCreateOutfit}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createButtonText}>创建搭配</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {outfits.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>还没有搭配</Text>
          <Text style={styles.emptySubtext}>创建你的第一套搭配吧</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleCreateOutfit}>
            <Text style={styles.emptyButtonText}>创建搭配</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {outfits.map((outfit) => (
            <View key={outfit.id} style={styles.outfitCard}>
              <View style={styles.outfitHeader}>
                <Text style={styles.outfitName}>{outfit.name}</Text>
                <View style={styles.outfitActions}>
                  <TouchableOpacity onPress={() => handleEditOutfit(outfit)} style={styles.actionButton}>
                    <Ionicons name="pencil" size={20} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteOutfit(outfit.id)} style={styles.actionButton}>
                    <Ionicons name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </View>
              {outfit.description && (
                <Text style={styles.outfitDescription}>{outfit.description}</Text>
              )}
              <View style={styles.outfitPreview}>
                {outfit.items.map((item, index) => {
                  const clothing = item.clothing || getClothingById(item.clothingId);
                  if (!clothing) return null;
                  return (
                    <View key={item.clothingId + index} style={styles.outfitItem}>
                      <ExpoImage
                        source={{ uri: clothing.imageUrl }}
                        style={styles.outfitItemImage}
                        contentFit="cover"
                      />
                      <Text style={styles.outfitItemCategory}>
                        {getCategoryName(clothing.category)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Create Outfit Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>创建搭配</Text>
            <TouchableOpacity onPress={handleSaveOutfit} disabled={isSaving}>
              <Text style={[styles.modalSave, isSaving && styles.modalSaveDisabled]}>
                保存
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>搭配名称</Text>
              <TextInput
                style={styles.textInput}
                placeholder="例如：春日休闲风"
                placeholderTextColor="#8A8A8A"
                value={outfitName}
                onChangeText={setOutfitName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>描述（可选）</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="添加一些描述..."
                placeholderTextColor="#8A8A8A"
                value={outfitDescription}
                onChangeText={setOutfitDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.sectionHeader}>
                <Text style={styles.inputLabel}>已选衣服 ({selectedItems.length})</Text>
                <TouchableOpacity onPress={handleSelectClothing}>
                  <Text style={styles.addButton}>+ 添加衣服</Text>
                </TouchableOpacity>
              </View>

              {selectedItems.length === 0 ? (
                <View style={styles.emptySelection}>
                  <Text style={styles.emptySelectionText}>点击上方按钮添加衣服</Text>
                </View>
              ) : (
                <View style={styles.selectedPreviewContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.selectedPreviewContent}
                  >
                    {selectedItems.map((item, index) => {
                      const clothing = getClothingById(item.clothingId);
                      if (!clothing) return null;
                      const categoryName = getCategoryName(clothing.category);
                      return (
                        <View key={item.clothingId + index} style={styles.selectedPreviewItem}>
                          {clothing?.thumbnailUrl || clothing?.imageUrl ? (
                            <ExpoImage
                              source={{ uri: buildAssetUrl(clothing.thumbnailUrl || clothing.imageUrl) }}
                              style={styles.selectedPreviewImage}
                              contentFit="cover"
                            />
                          ) : (
                            <View style={styles.selectedPreviewPlaceholder} />
                          )}
                          <Text style={styles.selectedPreviewName} numberOfLines={1}>
                            {clothing?.name}
                          </Text>
                          <Text style={styles.selectedPreviewCategory}>
                            {categoryName}
                          </Text>
                          <TouchableOpacity
                            style={styles.selectedPreviewRemove}
                            onPress={() => toggleClothingSelection(item.clothingId)}
                          >
                            <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Select Clothing Modal */}
      <Modal
        visible={showSelectModal}
        animationType="slide"
        onRequestClose={() => setShowSelectModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSelectModal(false)}>
              <Text style={styles.modalCancel}>返回</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>选择衣服</Text>
            <TouchableOpacity onPress={() => setShowSelectModal(false)}>
              <Text style={styles.modalSave}>完成</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterTabsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsContent}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterTab, selectFilterCategory === cat.id && styles.filterTabActive]}
                  onPress={() => setSelectFilterCategory(cat.id)}
                >
                  <Text style={[styles.filterTabText, selectFilterCategory === cat.id && styles.filterTabTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={styles.modalBody}>
            {filteredClothing.length === 0 ? (
              <View style={styles.emptySelection}>
                <Text style={styles.emptySelectionText}>该分类下还没有衣服</Text>
              </View>
            ) : (
              <View style={styles.clothingGrid}>
                {filteredClothing.map((clothing) => {
                  const isSelected = selectedItems.some(item => item.clothingId === clothing.id);
                  return (
                    <TouchableOpacity
                      key={clothing.id}
                      style={[styles.clothingItem, isSelected && styles.clothingItemSelected]}
                      onPress={() => toggleClothingSelection(clothing.id)}
                    >
                      <ExpoImage
                        source={{ uri: clothing.imageUrl }}
                        style={styles.clothingItemImage}
                        contentFit="cover"
                      />
                      {isSelected && (
                        <View style={styles.selectedOverlay}>
                          <Ionicons name="checkmark-circle" size={28} color="#4A7C59" />
                        </View>
                      )}
                      <View style={styles.clothingItemFooter}>
                        <Text style={styles.clothingItemName} numberOfLines={1}>
                          {clothing.name}
                        </Text>
                        <Text style={styles.clothingItemCategory}>
                          {getCategoryName(clothing.category)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Outfit Modal */}
      <Modal
        visible={!!editingOutfit}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingOutfit(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <View style={styles.editModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>编辑套装</Text>
                <TouchableOpacity onPress={() => setEditingOutfit(null)}>
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>套装名称</Text>
                <TextInput
                  style={styles.nameInput}
                  value={editingOutfit?.name || ''}
                  onChangeText={(text) => editingOutfit && setEditingOutfit({ ...editingOutfit, name: text })}
                  placeholder="输入套装名称"
                />

                <View style={styles.selectedHeader}>
                  <Text style={styles.inputLabel}>已选衣服 ({selectedItems.length})</Text>
                  <TouchableOpacity onPress={() => setShowSelectModal(true)}>
                    <Text style={styles.addButton}>+ 添加衣服</Text>
                  </TouchableOpacity>
                </View>

                {selectedItems.length === 0 ? (
                  <Text style={styles.emptySelectionText}>未选择衣服，请添加衣服</Text>
                ) : (
                  <View style={styles.selectedPreviewContainer}>
                    {/* 水平滚动预览 */}
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.selectedPreviewContent}
                    >
                      {selectedItems.map((item, index) => {
                        const clothing = clothingList.find((c: any) => c.id === item.clothingId);
                        if (!clothing) return null;
                        const categoryName = getCategoryName(clothing.category);
                        return (
                          <View key={item.clothingId || index} style={styles.selectedPreviewItem}>
                            {clothing?.thumbnailUrl || clothing?.imageUrl ? (
                              <ExpoImage
                                source={{ uri: buildAssetUrl(clothing.thumbnailUrl || clothing.imageUrl) }}
                                style={styles.selectedPreviewImage}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={styles.selectedPreviewPlaceholder} />
                            )}
                            <Text style={styles.selectedPreviewName} numberOfLines={1}>
                              {clothing?.name}
                            </Text>
                            <Text style={styles.selectedPreviewCategory}>
                              {categoryName}
                            </Text>
                            <TouchableOpacity
                              style={styles.selectedPreviewRemove}
                              onPress={() => {
                                const newItems = selectedItems.filter((_, i) => i !== index);
                                setSelectedItems(newItems);
                                if (editingOutfit) {
                                  setEditingOutfit({ ...editingOutfit, items: newItems });
                                }
                              }}
                            >
                              <Ionicons name="close-circle" size={22} color="#FF6B6B" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </ScrollView>

              <View style={styles.editFooter}>
                <TouchableOpacity
                  style={styles.editCancelButton}
                  onPress={() => setEditingOutfit(null)}
                >
                  <Text style={styles.editCancelButtonText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editSaveButton}
                  onPress={handleSaveEdit}
                >
                  <Text style={styles.editSaveButtonText}>保存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3D3D3D',
  },
  headerCount: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 4,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeColor,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  outfitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: themeColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  outfitName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
    flex: 1,
  },
  outfitActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F0F0F3',
  },
  outfitDescription: {
    fontSize: 14,
    color: '#8A8A8A',
    marginBottom: 12,
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flex: 1,
    maxHeight: '95%',
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
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  selectedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  selectedItem: {
    width: 80,
    alignItems: 'center',
  },
  selectedImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F5F0EB',
  },
  selectedPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F5F0EB',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // New improved preview styles
  selectedPreviewContainer: {
    marginVertical: 12,
  },
  selectedPreviewContent: {
    paddingRight: 16,
    paddingVertical: 4,
  },
  selectedPreviewItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
    width: 95,
    flexShrink: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'visible',
  },
  selectedPreviewImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#F5F0EB',
  },
  selectedPreviewPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 10,
    backgroundColor: '#E8E2DC',
  },
  selectedPreviewName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D3D3D',
    marginTop: 6,
    textAlign: 'center',
    maxWidth: 80,
  },
  selectedPreviewCategory: {
    fontSize: 9,
    color: '#8A8A8A',
    marginTop: 2,
  },
  selectedPreviewRemove: {
    marginTop: 4,
    padding: 2,
  },
  outfitPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  outfitItem: {
    width: 80,
    marginRight: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  outfitItemImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F5F0EB',
  },
  outfitItemCategory: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 6,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8A8A8A',
    marginTop: 8,
  },
  emptyButton: {
    marginTop: 24,
    backgroundColor: themeColor,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  modalCancel: {
    fontSize: 16,
    color: '#8A8A8A',
  },
  modalSave: {
    fontSize: 16,
    color: themeColor,
    fontWeight: '600',
  },
  modalSaveDisabled: {
    color: '#CCC',
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3D3D3D',
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#3D3D3D',
    borderWidth: 1,
    borderColor: '#F0EDE8',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    fontSize: 14,
    color: themeColor,
    fontWeight: '600',
  },
  emptySelection: {
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptySelectionText: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  selectedItems: {
    flexDirection: 'row',
  },
  selectedItemImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F5F0EB',
  },
  removeItem: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  clothingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  clothingItem: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clothingItemSelected: {
    borderColor: '#4A7C59',
  },
  clothingItemImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F5F0EB',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  clothingItemFooter: {
    padding: 12,
  },
  clothingItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  clothingItemCategory: {
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 4,
  },
  // Filter tabs for clothing selection
  filterTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  filterTabsContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F0EB',
    marginHorizontal: 4,
  },
  filterTabActive: {
    backgroundColor: '#4A7C59',
  },
  filterTabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  editModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E2DC',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#8A8A8A',
  },
  editCancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  editCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  editSaveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#4A7C59',
    borderRadius: 12,
    alignItems: 'center',
  },
  editSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0EDE8',
    backgroundColor: '#FFFFFF',
  },
});
