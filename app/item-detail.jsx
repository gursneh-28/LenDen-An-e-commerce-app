import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Image, ScrollView, Dimensions, 
  TouchableOpacity, Linking, Platform, SafeAreaView, Modal, FlatList 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ItemDetail() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const item = params.item ? JSON.parse(params.item) : null;

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  if (!item) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Item not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const images = item.images?.length > 0 ? item.images : (item.image ? [item.image] : []);

  const handleContact = () => {
    Linking.openURL(`mailto:${item.uploadedBy}`);
  };

  const openViewer = (index) => {
    setStartIndex(index);
    setIsViewerVisible(true);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {images.length > 0 ? (
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
            {images.map((imgUrl, i) => (
              <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => openViewer(i)}>
                <Image source={{ uri: imgUrl }} style={styles.carouselImg} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.carouselImg, styles.noImage]}>
             <Text style={{ fontSize: 60 }}>📦</Text>
          </View>
        )}
        
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{item.type === 'rent' ? 'For Rent' : 'For Sale'}</Text>
            <Text style={styles.priceText}>₹{item.price}</Text>
          </View>
          
          {item.category && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.category.toUpperCase()}</Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descText}>{item.description}</Text>
          
          <Text style={styles.sectionTitle}>Seller Information</Text>
          <View style={styles.sellerCard}>
             <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.uploaderName?.charAt(0).toUpperCase() || 'U'}</Text>
             </View>
             <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{item.uploaderName || 'Unknown User'}</Text>
                <Text style={styles.sellerEmail}>{item.uploadedBy}</Text>
             </View>
          </View>
          
          {item.type === 'rent' && item.availability && item.availability.length > 0 && (
            <View style={styles.availabilityBox}>
              <Text style={styles.sectionTitle}>Availability Dates</Text>
              {item.availability.map((r, i) => (
                 <Text key={i} style={styles.dateText}>
                   • {new Date(r.start).toLocaleDateString()} to {new Date(r.end).toLocaleDateString()}
                 </Text>
              ))}
            </View>
          )}

        </View>
      </ScrollView>
      
      <View style={styles.footer}>
         <TouchableOpacity style={styles.contactBtn} onPress={handleContact}>
            <Ionicons name="mail" size={20} color="#fff" />
            <Text style={styles.contactBtnText}>Contact Seller</Text>
         </TouchableOpacity>
      </View>

      {/* Full Screen Image Viewer Modal */}
      <Modal visible={isViewerVisible} transparent={false} animationType="fade" onRequestClose={() => setIsViewerVisible(false)}>
        <SafeAreaView style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerCloseBtn} onPress={() => setIsViewerVisible(false)}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={startIndex}
            getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            keyExtractor={(img, idx) => idx.toString()}
            renderItem={({ item: img }) => (
              <View style={styles.viewerSlide}>
                <Image source={{ uri: img }} style={styles.viewerImage} />
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { marginTop: 20, padding: 10, backgroundColor: '#1a1a1a', borderRadius: 8 },
  backBtnText: { color: '#fff', fontWeight: '600' },
  screen: { flex: 1, backgroundColor: '#fff' },
  headerRow: { 
    flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: 16, 
    paddingVertical: 12, borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6', backgroundColor: '#fff' 
  },
  iconBtn: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  carousel: { height: SCREEN_WIDTH },
  carouselImg: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, resizeMode: 'cover' },
  noImage: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleText: { fontSize: 24, fontWeight: '800', color: '#111', textTransform: 'capitalize' },
  priceText: { fontSize: 24, fontWeight: '800', color: '#e11d48' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 12, marginBottom: 8 },
  descText: { fontSize: 15, color: '#4b5563', lineHeight: 22, marginBottom: 20 },
  sellerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 2 },
  sellerEmail: { fontSize: 14, color: '#6b7280' },
  availabilityBox: { marginTop: 20, backgroundColor: '#fffbe8', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fef08a' },
  dateText: { fontSize: 14, color: '#854d0e', marginBottom: 4 },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    backgroundColor: '#fff', padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16, 
    borderTopWidth: 1, borderTopColor: '#f3f4f6' 
  },
  contactBtn: { 
    backgroundColor: '#1a1a1a', borderRadius: 14, paddingVertical: 16, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 
  },
  contactBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Viewer Styles
  viewerContainer: { flex: 1, backgroundColor: '#000' },
  viewerCloseBtn: { 
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 20, left: 16, 
    zIndex: 10, padding: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 24 
  },
  viewerSlide: { width: SCREEN_WIDTH, height: '100%', justifyContent: 'center', alignItems: 'center' },
  viewerImage: { width: SCREEN_WIDTH, height: '100%', resizeMode: 'contain' }
});
