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
import { outfitApi, clothingApi, Outfit, Clothing } from '@/utils/api';

export default function OutfitScreen() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [clothingList, setClothingList] = useState<Clothing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [outfitDescription, setOutfitDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ clothingId: string; position: { x: number; y: number } }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

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

  // Edit outfit state
  const [editingOutfit, setEditingOutfit] = useState<any>(null);

  const handleEditOutfit = (outfit: any) => {
    setEditingOutfit(outfit);
    setOutfitName(outfit.name);
    setOutfitDescription(outfit.description || '');
    setSelectedItems(outfit.items || []);
    setShowCreateModal(true);
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
      if (editingOutfit) {
        // Update existing outfit
        await outfitApi.update(editingOutfit.id, {
          name: outfitName.trim(),
          description: outfitDescription.trim(),
          items: selectedItems,
        });
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
    } catch (error) {
      console.error('Failed to save outfit:', error);
      Toast.show({ type: 'error', text1: '创建失败' });
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
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedItems}>
                  {selectedItems.map((item, index) => {
                    const clothing = getClothingById(item.clothingId);
                    if (!clothing) return null;
                    return (
                      <View key={item.clothingId + index} style={styles.selectedItem}>
                        <ExpoImage
                          source={{ uri: clothing.imageUrl }}
                          style={styles.selectedItemImage}
                          contentFit="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeItem}
                          onPress={() => toggleClothingSelection(item.clothingId)}
                        >
                          <Ionicons name="close-circle" size={20} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
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

          <ScrollView style={styles.modalBody}>
            {clothingList.length === 0 ? (
              <View style={styles.emptySelection}>
                <Text style={styles.emptySelectionText}>衣橱中还没有衣服</Text>
              </View>
            ) : (
              <View style={styles.clothingGrid}>
                {clothingList.map((clothing) => {
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
    backgroundColor: '#8B7355',
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
    shadowColor: '#8B7355',
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
  outfitPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  outfitItem: {
    width: 80,
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
    backgroundColor: '#8B7355',
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
    color: '#8B7355',
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
    color: '#8B7355',
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
  selectedItem: {
    marginRight: 12,
    position: 'relative',
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
});
