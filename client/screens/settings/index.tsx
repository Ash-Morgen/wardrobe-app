import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/ThemeContext';

const STORAGE_KEYS = {
  THEME_COLOR: '@wardrobe_theme_color',
  CATEGORIES: '@wardrobe_categories',
};

const DEFAULT_CATEGORIES = [
  {
    id: 'tops',
    name: '上衣',
    subcategories: ['T恤', '衬衫', '卫衣', '毛衣', '吊带'],
  },
  {
    id: 'bottoms',
    name: '裤子',
    subcategories: ['牛仔裤', '休闲裤', '运动裤', '短裙', '长裙'],
  },
  {
    id: 'outerwear',
    name: '外套',
    subcategories: ['夹克', '大衣', '风衣', '羽绒服', '西装'],
  },
  {
    id: 'dresses',
    name: '裙子',
    subcategories: ['连衣裙', '半身裙', '短裙'],
  },
  {
    id: 'bags',
    name: '包包',
    subcategories: ['单肩包', '双肩包', '手提包', '钱包'],
  },
  {
    id: 'accessories',
    name: '配饰',
    subcategories: ['帽子', '围巾', '腰带', '手表', '首饰'],
  },
];

const THEME_COLORS = [
  { id: 'brown', name: '咖啡棕', color: '#8B7355' },
  { id: 'blue', name: '天空蓝', color: '#5B9BD5' },
  { id: 'green', name: '森林绿', color: '#6B8E23' },
  { id: 'pink', name: '玫瑰粉', color: '#DB7093' },
  { id: 'purple', name: '薰衣草', color: '#9370DB' },
  { id: 'orange', name: '日落橙', color: '#E59866' },
  { id: 'gray', name: '石墨灰', color: '#696969' },
  { id: 'black', name: '经典黑', color: '#2C2C2C' },
];

export default function SettingsScreen() {
  const { themeColor: contextColor, setThemeColor: updateContextColor } = useTheme();
  const [themeColor, setThemeColor] = useState(contextColor || '#8B7355');
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubcategories, setEditSubcategories] = useState('');

  useEffect(() => {
    // 在组件内直接加载设置
    const loadSettings = async () => {
      try {
        const savedColor = await AsyncStorage.getItem(STORAGE_KEYS.THEME_COLOR);
        if (savedColor) {
          setThemeColor(savedColor);
        }

        // 从后端获取分类
        try {
          const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/categories`);
          if (response.ok) {
            const data = await response.json();
            setCategories(data);
            await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(data));
          }
        } catch (e) {
          // 后端获取失败，使用本地存储
          const savedCategories = await AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES);
          if (savedCategories) {
            setCategories(JSON.parse(savedCategories));
          }
        }
      } catch (error) {
        console.error('加载设置失败:', error);
      }
    };
    loadSettings();
  }, []);

  const saveThemeColor = async (color: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_COLOR, color);
      setThemeColor(color);
      updateContextColor(color); // 同时更新全局主题
      Toast.show({ type: 'success', text1: '主题色已更新' });
    } catch (error) {
      Toast.show({ type: 'error', text1: '保存失败' });
    }
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setEditName(category.name);
    setEditSubcategories(category.subcategories.join('、'));
    setEditModalVisible(true);
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;

    const newSubcategories = editSubcategories
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const updatedCategories = categories.map((c) =>
      c.id === editingCategory.id
        ? { ...c, name: editName, subcategories: newSubcategories }
        : c
    );

    try {
      // 保存到后端
      await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, subcategories: newSubcategories }),
      });
      // 保存到本地
      await AsyncStorage.setItem(
        STORAGE_KEYS.CATEGORIES,
        JSON.stringify(updatedCategories)
      );
      setCategories(updatedCategories);
      setEditModalVisible(false);
      Toast.show({ type: 'success', text1: '分类已更新' });
    } catch (error) {
      Toast.show({ type: 'error', text1: '保存失败' });
    }
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setEditName('');
    setEditSubcategories('');
    setEditModalVisible(true);
  };

  const handleSaveNewCategory = async () => {
    if (!editName.trim()) {
      Toast.show({ type: 'error', text1: '请输入分类名称' });
      return;
    }

    const newSubcategories = editSubcategories
      .split(/[,，、]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newCategory = {
      id: `custom_${Date.now()}`,
      name: editName.trim(),
      subcategories: newSubcategories,
    };

    const updatedCategories = [...categories, newCategory];

    try {
      // 保存到后端
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCategory),
      });
      const savedCategory = await response.json();
      
      // 更新本地列表（使用后端返回的完整数据）
      const finalCategories = response.ok 
        ? [...categories, savedCategory]
        : updatedCategories;
      
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(finalCategories));
      setCategories(finalCategories);
      setEditModalVisible(false);
      Toast.show({ type: 'success', text1: '分类已添加' });
    } catch (error) {
      // 网络错误时保存到本地
      await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedCategories));
      setCategories(updatedCategories);
      setEditModalVisible(false);
      Toast.show({ type: 'success', text1: '分类已添加（离线）' });
    }
  };

  const handleDeleteCategory = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId);
    Alert.alert(
      '确认删除', 
      `确定要删除"${category?.name}"分类吗？\n\n该操作将同时删除该分类下的所有衣服数据，且不可恢复。`, 
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            const updatedCategories = categories.filter((c) => c.id !== categoryId);
            try {
              // 调用后端删除分类接口（会自动删除该分类下的所有衣服）
              await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/categories/${categoryId}`, {
                method: 'DELETE',
              });
              // 保存到本地
              await AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updatedCategories));
              setCategories(updatedCategories);
              Toast.show({ type: 'success', text1: '分类及该分类下的衣服已删除' });
            } catch (error) {
              Toast.show({ type: 'error', text1: '删除失败' });
            }
          },
        },
      ]
    );
  };

  const handleResetCategories = async () => {
    Alert.alert('重置分类', '确定要重置所有分类吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        onPress: async () => {
          try {
            await AsyncStorage.setItem(
              STORAGE_KEYS.CATEGORIES,
              JSON.stringify(DEFAULT_CATEGORIES)
            );
            setCategories(DEFAULT_CATEGORIES);
            Toast.show({ type: 'success', text1: '分类已重置' });
          } catch (error) {
            Toast.show({ type: 'error', text1: '重置失败' });
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Color Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>衣橱主题色</Text>
          <Text style={styles.sectionSubtitle}>选择您喜欢的衣橱主题色调</Text>
          <View style={styles.colorGrid}>
            {THEME_COLORS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.colorItem,
                  { backgroundColor: item.color },
                  themeColor === item.color && styles.colorItemSelected,
                ]}
                onPress={() => saveThemeColor(item.color)}
              >
                {themeColor === item.color && (
                  <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.selectedColorText}>
            当前: {THEME_COLORS.find((c) => c.color === themeColor)?.name || '自定义'}
          </Text>
        </View>

        {/* Category Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>分类管理</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>新增分类</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionSubtitle}>
            管理衣服的一级和二级分类目录
          </Text>

          {categories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[styles.categoryDot, { backgroundColor: themeColor }]}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.subcategoryCount}>
                    {category.subcategories.length} 个子分类
                  </Text>
                </View>
                <View style={styles.categoryActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditCategory(category)}
                  >
                    <Ionicons name="pencil" size={18} color="#8B7355" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteCategory(category.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC3545" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.subcategoryTags}>
                {category.subcategories.map((sub, index) => (
                  <View key={index} style={styles.subcategoryTag}>
                    <Text style={styles.subcategoryTagText}>{sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetCategories}
          >
            <Ionicons name="refresh" size={18} color="#8B7355" />
            <Text style={styles.resetButtonText}>重置为默认分类</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>应用名称</Text>
            <Text style={styles.aboutValue}>智能衣橱</Text>
          </View>
          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>版本</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Category Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCategory ? '编辑分类' : '新增分类'}
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>分类名称</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="例如：上衣、裤子"
                placeholderTextColor="#999"
              />

              <Text style={styles.inputLabel}>子分类</Text>
              <Text style={styles.inputHint}>多个子分类用逗号或顿号分隔</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editSubcategories}
                onChangeText={setEditSubcategories}
                placeholder="例如：T恤、衬衫、卫衣"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={editingCategory ? handleSaveCategory : handleSaveNewCategory}
              >
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF9',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    marginBottom: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  colorItem: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedColorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B7355',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  categoryItem: {
    backgroundColor: '#FAFAF9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  subcategoryCount: {
    fontSize: 12,
    color: '#8A8A8A',
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  subcategoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subcategoryTag: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  subcategoryTagText: {
    fontSize: 13,
    color: '#666',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 12,
  },
  resetButtonText: {
    fontSize: 14,
    color: '#8B7355',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  aboutLabel: {
    fontSize: 15,
    color: '#666',
  },
  aboutValue: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: '#8A8A8A',
    marginBottom: 12,
    marginTop: -4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#8B7355',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
