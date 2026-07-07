import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { categoryApi, themeApi, Category } from '@/utils/api';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsScreen() {
  const { colors, theme, setTheme, availableThemes } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showAddCat, setShowAddCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [showEditCat, setShowEditCat] = useState(false);

  const [showSubModal, setShowSubModal] = useState(false);
  const [subCatTarget, setSubCatTarget] = useState<Category | null>(null);
  const [newSubName, setNewSubName] = useState('');
  const [editingSub, setEditingSub] = useState<{ id: string; name: string } | null>(null);
  const [editSubName, setEditSubName] = useState('');

  const loadCategories = useCallback(async () => {
    try {
      const cats = await categoryApi.getAll();
      setCategories(cats);
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  // Add category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await categoryApi.create(newCatName.trim());
      setNewCatName('');
      setShowAddCat(false);
      await loadCategories();
      Toast.show({ type: 'success', text1: '分类已添加' });
    } catch (e) {
      Toast.show({ type: 'error', text1: '添加失败' });
    }
  };

  // Edit category
  const handleEditCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    try {
      await categoryApi.update(editingCat.id, editCatName.trim());
      setShowEditCat(false);
      setEditingCat(null);
      await loadCategories();
      Toast.show({ type: 'success', text1: '分类已更新' });
    } catch (e) {
      Toast.show({ type: 'error', text1: '更新失败' });
    }
  };

  // Delete category
  const handleDeleteCategory = (cat: Category) => {
    Alert.alert(
      `删除「${cat.name}」`,
      `将同时删除 ${cat.subcategories.length} 个子分类。已有的衣物分类不会自动变更，确定吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await categoryApi.delete(cat.id);
              await loadCategories();
              Toast.show({ type: 'success', text1: '已删除' });
            } catch (e) {
              Toast.show({ type: 'error', text1: '删除失败' });
            }
          },
        },
      ]
    );
  };

  // Add subcategory
  const handleAddSub = async () => {
    if (!subCatTarget || !newSubName.trim()) return;
    try {
      await categoryApi.addSubcategory(subCatTarget.id, newSubName.trim());
      setNewSubName('');
      await loadCategories();
      Toast.show({ type: 'success', text1: '子分类已添加' });
    } catch (e) {
      Toast.show({ type: 'error', text1: '添加失败' });
    }
  };

  // Delete subcategory
  const handleDeleteSub = async (catId: string, subId: string) => {
    try {
      await categoryApi.deleteSubcategory(subId);
      await loadCategories();
    } catch (e) {
      Toast.show({ type: 'error', text1: '删除失败' });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scroll}
      >
        <Text style={[styles.pageTitle, { color: colors.text }]}>设置</Text>

        {/* ===== Theme Section ===== */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>主题颜色</Text>
          <View style={styles.themeGrid}>
            {availableThemes.map((t) => {
              const isActive = theme === t.id;
              const tc = [
                { id: 'default', label: '默认', bg: '#8B7355' },
                { id: 'forest', label: '森林', bg: '#2D6A4F' },
                { id: 'ocean', label: '海洋', bg: '#0E5E8A' },
                { id: 'sunset', label: '日落', bg: '#C75B3A' },
                { id: 'lavender', label: '薰衣草', bg: '#7C5DA8' },
              ].find(x => x.id === t.id)!;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.themeItem, isActive && { borderColor: colors.primary, borderWidth: 2 }]}
                  onPress={() => setTheme(t.id)}
                >
                  <View style={[styles.themeDot, { backgroundColor: tc.bg }]} />
                  <Text style={[styles.themeLabel, { color: colors.text }]}>{tc.label}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={18} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ===== Category Management ===== */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>分类管理</Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddCat(true)}
            >
              <Ionicons name="add" size={20} color="#FFF" />
              <Text style={styles.addBtnText}>新增</Text>
            </TouchableOpacity>
          </View>

          {categories.map((cat) => (
            <View key={cat.id} style={[styles.catCard, { borderColor: colors.border }]}>
              <View style={styles.catHeader}>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => { setSubCatTarget(cat); setShowSubModal(true); }}
                >
                  <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
                  <Text style={[styles.catSubCount, { color: colors.textSecondary }]}>
                    {cat.subcategories.length} 个子分类
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => { setEditingCat(cat); setEditCatName(cat.name); setShowEditCat(true); }}
                >
                  <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => handleDeleteCategory(cat)}
                >
                  <Ionicons name="trash-outline" size={18} color="#E74C3C" />
                </TouchableOpacity>
              </View>
              <View style={styles.subList}>
                {cat.subcategories.map((sub, idx) => (
                  <View key={idx} style={[styles.subTag, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.subTagText, { color: colors.primary }]}>{sub}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Category Modal */}
      <Modal visible={showAddCat} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>新增分类</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="分类名称"
              placeholderTextColor={colors.textSecondary}
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => { setShowAddCat(false); setNewCatName(''); }}>
                <Text style={{ color: colors.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleAddCategory}>
                <Text style={{ color: '#FFF' }}>添加</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Category Modal */}
      <Modal visible={showEditCat} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>编辑分类</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="分类名称"
              placeholderTextColor={colors.textSecondary}
              value={editCatName}
              onChangeText={setEditCatName}
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.border }]} onPress={() => setShowEditCat(false)}>
                <Text style={{ color: colors.text }}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleEditCategory}>
                <Text style={{ color: '#FFF' }}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Subcategory Manager Modal */}
      <Modal visible={showSubModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {subCatTarget?.name} - 子分类
              </Text>
              <TouchableOpacity onPress={() => { setShowSubModal(false); setNewSubName(''); }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.addSubRow}>
              <TextInput
                style={[styles.input, { flex: 1, backgroundColor: colors.background, color: colors.text, borderColor: colors.border, marginRight: 8 }]}
                placeholder="新增子分类"
                placeholderTextColor={colors.textSecondary}
                value={newSubName}
                onChangeText={setNewSubName}
              />
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: colors.primary }]} onPress={handleAddSub}>
                <Ionicons name="add" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {subCatTarget?.subcategories.map((sub, idx) => (
                <View key={idx} style={[styles.subRow, { borderColor: colors.border }]}>
                  <Text style={[styles.subRowText, { color: colors.text }]}>{sub}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeleteSub(subCatTarget.id, `${subCatTarget.id}_${idx}`)}
                  >
                    <Ionicons name="close-circle" size={22} color="#E74C3C" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  pageTitle: { fontSize: 28, fontWeight: '700', marginBottom: 20 },
  section: {
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  // Theme
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#E5E5E5',
    width: '45%',
  },
  themeDot: { width: 24, height: 24, borderRadius: 12 },
  themeLabel: { fontSize: 14, flex: 1 },
  // Categories
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 },
  addBtnText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
  catCard: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 10 },
  catHeader: { flexDirection: 'row', alignItems: 'center' },
  catName: { fontSize: 16, fontWeight: '600' },
  catSubCount: { fontSize: 12, marginTop: 2 },
  iconBtn: { padding: 6, marginLeft: 4 },
  subList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, gap: 6 },
  subTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  subTagText: { fontSize: 12 },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalContent: { borderRadius: 14, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, marginBottom: 16 },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  addSubRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallBtn: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  subRowText: { fontSize: 15 },
});
