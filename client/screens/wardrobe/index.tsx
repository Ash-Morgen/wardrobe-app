import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { clothingApi, Category, Clothing, buildAssetUrl } from '@/utils/api';
import { distributeItems, getOptimizedDimensions, MasonryItem } from '@/utils/masonry';
import Toast from 'react-native-toast-message';

const CATEGORY_TABS = [
  { id: 'all', name: '全部' },
  { id: 'tops', name: '上衣' },
  { id: 'bottoms', name: '裤子' },
  { id: 'outerwear', name: '外套' },
  { id: 'dresses', name: '裙子' },
  { id: 'bags', name: '包包' },
  { id: 'accessories', name: '配饰' },
];

export default function WardrobeScreen() {
  const { width } = useWindowDimensions();
  const router = useSafeRouter();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [clothingList, setClothingList] = useState<Clothing[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Clothing | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const COLUMN_WIDTH = (width - 32 - 12) / 2;

  const fetchClothing = useCallback(async (category?: string) => {
    try {
      const data = await clothingApi.getAll(category);
      setClothingList(data);
    } catch (error) {
      console.error('Failed to fetch clothing:', error);
      Toast.show({ type: 'error', text1: '获取衣橱数据失败' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await clothingApi.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
      fetchClothing(selectedCategory === 'all' ? undefined : selectedCategory);
    }, [fetchClothing, fetchCategories, selectedCategory])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClothing(selectedCategory === 'all' ? undefined : selectedCategory);
    setRefreshing(false);
  }, [fetchClothing, selectedCategory]);

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleItemPress = (item: Clothing) => {
    setSelectedItem(item);
    setEditName(item.name);
    setEditSubcategory(item.subcategory);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    try {
      await clothingApi.update(selectedItem.id, {
        name: editName,
        subcategory: editSubcategory,
      });
      Toast.show({ type: 'success', text1: '更新成功' });
      setEditModalVisible(false);
      fetchClothing(selectedCategory === 'all' ? undefined : selectedCategory);
    } catch (error) {
      Toast.show({ type: 'error', text1: '更新失败' });
    }
  };

  const handleEditPress = () => {
    setEditModalVisible(true);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    Alert.alert('确认删除', '确定要删除这件衣服吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await clothingApi.delete(selectedItem.id);
            Toast.show({ type: 'success', text1: '删除成功' });
            setSelectedItem(null);
            fetchClothing(selectedCategory === 'all' ? undefined : selectedCategory);
          } catch (error) {
            Toast.show({ type: 'error', text1: '删除失败' });
          }
        },
      },
    ]);
  };

  // Convert clothing data to masonry items
  const masonryData: MasonryItem[] = useMemo(() => {
    return clothingList.map((item) => ({
      id: item.id,
      imageUrl: buildAssetUrl(item.imageUrl),
      aspectRatio: 0.8 + Math.random() * 0.4,
      title: item.name,
      data: item,
    }));
  }, [clothingList]);

  const columnData = useMemo(() => {
    return distributeItems(masonryData, COLUMN_WIDTH, 2);
  }, [masonryData, COLUMN_WIDTH]);

  const getCategoryName = (categoryId: string) => {
    const cat = CATEGORY_TABS.find((c) => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getSubcategories = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.subcategories || [];
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>我的衣橱</Text>
        <Text style={styles.headerCount}>{clothingList.length} 件单品</Text>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.categoryTab,
                selectedCategory === tab.id && styles.categoryTabActive,
              ]}
              onPress={() => handleCategoryChange(tab.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategory === tab.id && styles.categoryTabTextActive,
                ]}
              >
                {tab.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {clothingList.length === 0 && !isLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="shirt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>衣橱空空如也</Text>
          <Text style={styles.emptySubtext}>点击底部+按钮添加衣服</Text>
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
          <View style={styles.masonryContainer}>
            {columnData.map((colItems, colIndex) => (
              <View key={colIndex} style={styles.column}>
                {colItems.map((item) => {
                  const { height } = getOptimizedDimensions(item.aspectRatio, COLUMN_WIDTH);
                  const clothing = item.data as Clothing;
                  return (
                    <Pressable
                      key={item.id}
                      style={styles.card}
                      onPress={() => handleItemPress(clothing)}
                    >
                      <View style={[styles.imageContainer, { height }]}>
                        <ExpoImage
                          source={{ uri: item.imageUrl }}
                          style={styles.image}
                          contentFit="cover"
                          transition={200}
                        />
                      </View>
                      <View style={styles.cardFooter}>
                        <Text style={styles.cardTitle} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <View style={styles.cardTag}>
                          <Text style={styles.cardTagText}>
                            {getCategoryName(clothing.category)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={selectedItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>衣服详情</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalBody}>
                <ExpoImage
                  source={{ uri: buildAssetUrl(selectedItem.imageUrl) }}
                  style={styles.modalImage}
                  contentFit="contain"
                />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>名称</Text>
                  <Text style={styles.detailValue}>{selectedItem.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>分类</Text>
                  <Text style={styles.detailValue}>
                    {getCategoryName(selectedItem.category)}
                  </Text>
                </View>
                {selectedItem.subcategory && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>子类</Text>
                    <Text style={styles.detailValue}>{selectedItem.subcategory}</Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEditPress}>
                <Ionicons name="create-outline" size={20} color="#4F46E5" />
                <Text style={styles.actionButtonText}>编辑</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={20} color="#ff4444" />
                <Text style={styles.actionButtonTextDanger}>删除</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>编辑衣服</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>名称</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="请输入衣服名称"
                placeholderTextColor="#8A8A8A"
              />
              <Text style={styles.inputLabel}>子类</Text>
              <TextInput
                style={styles.input}
                value={editSubcategory}
                onChangeText={setEditSubcategory}
                placeholder="请输入子类（如：T恤、衬衫）"
                placeholderTextColor="#8A8A8A"
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#F0F0F0' }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.actionButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#8B7355' }]}
                onPress={handleSaveEdit}
              >
                <Text style={[styles.actionButtonText, { color: '#FFF' }]}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Add Button */}
      <TouchableOpacity style={styles.floatingButton} onPress={() => router.push('/add-clothing')}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  categoryContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F0EB',
    marginHorizontal: 4,
  },
  categoryTabActive: {
    backgroundColor: '#8B7355',
  },
  categoryTabText: {
    fontSize: 14,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  masonryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    backgroundColor: '#F5F0EB',
  },
  image: {
    flex: 1,
  },
  cardFooter: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3D3D3D',
    marginBottom: 6,
  },
  cardTag: {
    backgroundColor: '#F5F0EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  cardTagText: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3D3D3D',
  },
  modalBody: {
    padding: 20,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    backgroundColor: '#F5F0EB',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EDE8',
  },
  detailLabel: {
    fontSize: 14,
    color: '#8A8A8A',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3D3D3D',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 20,
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  actionButtonTextDanger: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff4444',
  },
  inputLabel: {
    fontSize: 14,
    color: '#8A8A8A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F0EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#3D3D3D',
    marginBottom: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8B7355',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
