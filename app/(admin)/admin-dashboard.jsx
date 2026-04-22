// app/(admin)/admin-dashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    RefreshControl,
    Modal,
    FlatList,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { adminAPI, clearSession } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userDetails, setUserDetails] = useState(null);
    const [showUserModal, setShowUserModal] = useState(false);
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [usersRes, statsRes] = await Promise.all([
                adminAPI.getUsers(),
                adminAPI.getStats()
            ]);
            
            if (usersRes.success) setUsers(usersRes.users);
            if (statsRes.success) setStats(statsRes.stats);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchUserDetails = async (user) => {
        setSelectedUser(user);
        setShowUserModal(true);
        
        try {
            const [itemsRes, requestsRes] = await Promise.all([
                adminAPI.getUserItems(user.id),
                adminAPI.getUserRequests(user.id)
            ]);
            
            setUserDetails({
                items: itemsRes.success ? itemsRes.items : [],
                requests: requestsRes.success ? requestsRes.requests : []
            });
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleBlockUser = async (user) => {
        const action = user.isBlocked ? 'unblock' : 'block';
        Alert.alert(
            `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
            `Are you sure you want to ${action} ${user.username}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: action,
                    onPress: async () => {
                        try {
                            const response = await adminAPI.blockUser(user.id, !user.isBlocked);
                            if (response.success) {
                                Alert.alert('Success', response.message);
                                fetchData();
                                if (selectedUser?.id === user.id) {
                                    setShowUserModal(false);
                                }
                            }
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteItem = async (item) => {
        Alert.alert(
            'Delete Item',
            `Are you sure you want to delete "${item.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await adminAPI.deleteItem(item._id);
                            if (response.success) {
                                Alert.alert('Success', 'Item deleted successfully');
                                fetchUserDetails(selectedUser);
                                fetchData();
                            }
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteRequest = async (request) => {
        Alert.alert(
            'Delete Request',
            `Are you sure you want to delete "${request.title}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await adminAPI.deleteRequest(request._id);
                            if (response.success) {
                                Alert.alert('Success', 'Request deleted successfully');
                                fetchUserDetails(selectedUser);
                                fetchData();
                            }
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    }
                }
            ]
        );
    };

    const handleLogout = async () => {
        await clearSession();
        router.replace('/login');
    };

    const renderUserCard = ({ item }) => (
        <TouchableOpacity 
            style={styles.userCard} 
            onPress={() => fetchUserDetails(item)}
        >
            <View style={styles.userInfo}>
                <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                        {item.username?.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userDetails}>
                    <Text style={styles.userName}>{item.username}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                </View>
            </View>
            <View style={styles.userStatus}>
                {item.isBlocked ? (
                    <View style={styles.blockedBadge}>
                        <Text style={styles.blockedText}>Blocked</Text>
                    </View>
                ) : (
                    <View style={styles.activeBadge}>
                        <Text style={styles.activeText}>Active</Text>
                    </View>
                )}
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1A1A1A" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Admin Portal</Text>
                    <Text style={styles.title}>Organization Dashboard</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#1A1A1A" />
                </TouchableOpacity>
            </View>

            {/* Stats Cards */}
            {stats && (
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <Ionicons name="people-outline" size={24} color="#4CAF50" />
                        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Total Users</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="cube-outline" size={24} color="#2196F3" />
                        <Text style={styles.statNumber}>{stats.totalItems}</Text>
                        <Text style={styles.statLabel}>Total Items</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="help-circle-outline" size={24} color="#FF9800" />
                        <Text style={styles.statNumber}>{stats.totalRequests}</Text>
                        <Text style={styles.statLabel}>Total Requests</Text>
                    </View>
                </View>
            )}

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'users' && styles.activeTab]}
                    onPress={() => setActiveTab('users')}
                >
                    <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>
                        Users ({users.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'reports' && styles.activeTab]}
                    onPress={() => setActiveTab('reports')}
                >
                    <Text style={[styles.tabText, activeTab === 'reports' && styles.activeTabText]}>
                        Reports
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {activeTab === 'users' ? (
                <FlatList
                    data={users}
                    keyExtractor={(item) => item.id}
                    renderItem={renderUserCard}
                    contentContainerStyle={styles.list}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => {
                            setRefreshing(true);
                            fetchData();
                        }} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color="#CCC" />
                            <Text style={styles.emptyText}>No users found</Text>
                        </View>
                    }
                />
            ) : (
                <ScrollView style={styles.list}>
                    <View style={styles.reportCard}>
                        <Text style={styles.reportTitle}>Platform Summary</Text>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Total Users:</Text>
                            <Text style={styles.reportValue}>{stats?.totalUsers}</Text>
                        </View>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Active Users:</Text>
                            <Text style={styles.reportValue}>{stats?.activeUsers}</Text>
                        </View>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Blocked Users:</Text>
                            <Text style={styles.reportValue}>{stats?.totalUsers - stats?.activeUsers}</Text>
                        </View>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Total Items Listed:</Text>
                            <Text style={styles.reportValue}>{stats?.totalItems}</Text>
                        </View>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Total Help Requests:</Text>
                            <Text style={styles.reportValue}>{stats?.totalRequests}</Text>
                        </View>
                        <View style={styles.reportRow}>
                            <Text style={styles.reportLabel}>Pending Requests:</Text>
                            <Text style={styles.reportValue}>{stats?.pendingRequests}</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* User Details Modal */}
            <Modal visible={showUserModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>User Details</Text>
                            <TouchableOpacity onPress={() => setShowUserModal(false)}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        {selectedUser && (
                            <>
                                <View style={styles.userProfile}>
                                    <View style={styles.modalAvatar}>
                                        <Text style={styles.modalAvatarText}>
                                            {selectedUser.username?.charAt(0).toUpperCase()}
                                        </Text>
                                    </View>
                                    <Text style={styles.modalUserName}>{selectedUser.username}</Text>
                                    <Text style={styles.modalUserEmail}>{selectedUser.email}</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.blockBtn,
                                            selectedUser.isBlocked && styles.unblockBtn
                                        ]}
                                        onPress={() => handleBlockUser(selectedUser)}
                                    >
                                        <Text style={styles.blockBtnText}>
                                            {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {userDetails && (
                                    <ScrollView style={styles.userContent}>
                                        <Text style={styles.sectionTitle}>Items Posted</Text>
                                        {userDetails.items.length === 0 ? (
                                            <Text style={styles.noContent}>No items posted</Text>
                                        ) : (
                                            userDetails.items.map(item => (
                                                <View key={item._id} style={styles.contentCard}>
                                                    <View style={styles.contentInfo}>
                                                        <Text style={styles.contentName}>{item.name}</Text>
                                                        <Text style={styles.contentPrice}>₹{item.price}</Text>
                                                        <Text style={styles.contentType}>{item.type}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteItem(item)}
                                                        style={styles.deleteBtn}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#F44336" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}

                                        <Text style={styles.sectionTitle}>Help Requests</Text>
                                        {userDetails.requests.length === 0 ? (
                                            <Text style={styles.noContent}>No requests posted</Text>
                                        ) : (
                                            userDetails.requests.map(request => (
                                                <View key={request._id} style={styles.contentCard}>
                                                    <View style={styles.contentInfo}>
                                                        <Text style={styles.contentName}>{request.title}</Text>
                                                        <Text style={styles.contentDesc} numberOfLines={2}>
                                                            {request.description}
                                                        </Text>
                                                        <Text style={styles.contentStatus}>{request.status}</Text>
                                                    </View>
                                                    <TouchableOpacity
                                                        onPress={() => handleDeleteRequest(request)}
                                                        style={styles.deleteBtn}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#F44336" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))
                                        )}
                                    </ScrollView>
                                )}
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F0',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBE6',
    },
    welcomeText: {
        fontSize: 14,
        color: '#888880',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 4,
    },
    iconBtn: {
        padding: 8,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#888880',
        marginTop: 4,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#1A1A1A',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888880',
    },
    activeTabText: {
        color: '#1A1A1A',
    },
    list: {
        paddingHorizontal: 20,
    },
    userCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    userInitial: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 13,
        color: '#888880',
    },
    userStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    blockedBadge: {
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    blockedText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F44336',
    },
    activeBadge: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4CAF50',
    },
    reportCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
    },
    reportTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 16,
    },
    reportRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBE6',
    },
    reportLabel: {
        fontSize: 14,
        color: '#666',
    },
    reportValue: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        color: '#888880',
        marginTop: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        width: '90%',
        maxHeight: '80%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBE6',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
    },
    userProfile: {
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#EBEBE6',
    },
    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    modalAvatarText: {
        fontSize: 32,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    modalUserName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    modalUserEmail: {
        fontSize: 14,
        color: '#888880',
        marginBottom: 16,
    },
    blockBtn: {
        backgroundColor: '#F44336',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    unblockBtn: {
        backgroundColor: '#4CAF50',
    },
    blockBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    userContent: {
        padding: 20,
        maxHeight: 400,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
        marginTop: 8,
    },
    contentCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F5F5F0',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    contentInfo: {
        flex: 1,
    },
    contentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    contentPrice: {
        fontSize: 13,
        color: '#4CAF50',
        fontWeight: '600',
    },
    contentType: {
        fontSize: 11,
        color: '#888880',
        marginTop: 2,
    },
    contentDesc: {
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
    },
    contentStatus: {
        fontSize: 11,
        color: '#FF9800',
        fontWeight: '600',
    },
    deleteBtn: {
        padding: 8,
    },
    noContent: {
        fontSize: 13,
        color: '#888880',
        textAlign: 'center',
        paddingVertical: 20,
    },
});