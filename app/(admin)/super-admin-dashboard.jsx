// app/(admin)/super-admin-dashboard.jsx
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
    TextInput,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { superAdminAPI, clearSession } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function SuperAdminDashboard() {
    const [organizations, setOrganizations] = useState([]);
    const [pendingOrgs, setPendingOrgs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'pending'
    const [showMakeAdminModal, setShowMakeAdminModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [expandedOrg, setExpandedOrg] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [allOrgs, pending] = await Promise.all([
                superAdminAPI.getAllOrganizations(),
                superAdminAPI.getPendingOrganizations()
            ]);
            
            if (allOrgs.success) setOrganizations(allOrgs.organizations);
            if (pending.success) setPendingOrgs(pending.organizations);
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleApprove = async (orgId) => {
        Alert.alert(
            'Approve Organization',
            'Are you sure you want to approve this organization?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Approve',
                    onPress: async () => {
                        try {
                            const response = await superAdminAPI.approveOrganization(orgId);
                            if (response.success) {
                                Alert.alert('Success', 'Organization approved successfully');
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

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            Alert.alert('Error', 'Please provide a rejection reason');
            return;
        }

        try {
            const response = await superAdminAPI.rejectOrganization(selectedOrg._id, rejectReason);
            if (response.success) {
                Alert.alert('Success', 'Organization rejected successfully');
                setShowRejectModal(false);
                setRejectReason('');
                setSelectedOrg(null);
                fetchData();
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleMakeSuperAdmin = async () => {
        if (!newAdminEmail.trim()) {
            Alert.alert('Error', 'Please enter an email');
            return;
        }

        try {
            const response = await superAdminAPI.makeSuperAdmin(newAdminEmail);
            if (response.success) {
                Alert.alert('Success', 'Super admin added successfully');
                setShowMakeAdminModal(false);
                setNewAdminEmail('');
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    const handleLogout = async () => {
        await clearSession();
        router.replace('/login');
    };

    const renderOrganizationCard = (org, isPending = false) => (
        <View key={org._id} style={styles.orgCard}>
            <TouchableOpacity
                style={styles.orgHeader}
                onPress={() => setExpandedOrg(expandedOrg === org._id ? null : org._id)}
            >
                <View style={styles.orgInfo}>
                    <Text style={styles.orgName}>{org.orgName}</Text>
                    <Text style={styles.orgDomain}>@{org.domain}</Text>
                </View>
                <View style={styles.orgBadge}>
                    <Text style={[
                        styles.statusBadge,
                        org.status === 'approved' ? styles.approvedBadge : styles.pendingBadge
                    ]}>
                        {org.status.toUpperCase()}
                    </Text>
                    <Ionicons 
                        name={expandedOrg === org._id ? "chevron-up" : "chevron-down"} 
                        size={20} 
                        color="#666" 
                    />
                </View>
            </TouchableOpacity>

            {expandedOrg === org._id && (
                <View style={styles.orgDetails}>
                    <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={18} color="#666" />
                        <Text style={styles.detailText}>Admin: {org.adminName}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={18} color="#666" />
                        <Text style={styles.detailText}>{org.adminEmail}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={18} color="#666" />
                        <Text style={styles.detailText}>{org.contactNumber}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="people-outline" size={18} color="#666" />
                        <Text style={styles.detailText}>Members: {org.memberCount || 0}</Text>
                    </View>
                    {org.createdAt && (
                        <View style={styles.detailRow}>
                            <Ionicons name="calendar-outline" size={18} color="#666" />
                            <Text style={styles.detailText}>
                                Registered: {new Date(org.createdAt).toLocaleDateString()}
                            </Text>
                        </View>
                    )}

                    {isPending && (
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.approveBtn]}
                                onPress={() => handleApprove(org._id)}
                            >
                                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>Approve</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, styles.rejectBtn]}
                                onPress={() => {
                                    setSelectedOrg(org);
                                    setShowRejectModal(true);
                                }}
                            >
                                <Ionicons name="close-circle" size={20} color="#fff" />
                                <Text style={styles.actionBtnText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1A1A1A" />
            </View>
        );
    }

    const displayOrgs = selectedTab === 'all' ? organizations : pendingOrgs;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.welcomeText}>Super Admin</Text>
                    <Text style={styles.title}>Dashboard</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => setShowMakeAdminModal(true)}
                    >
                        <Ionicons name="person-add" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={24} color="#1A1A1A" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{organizations.length}</Text>
                    <Text style={styles.statLabel}>Total Orgs</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{pendingOrgs.length}</Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                        {organizations.filter(o => o.status === 'approved').length}
                    </Text>
                    <Text style={styles.statLabel}>Approved</Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'all' && styles.activeTab]}
                    onPress={() => setSelectedTab('all')}
                >
                    <Text style={[styles.tabText, selectedTab === 'all' && styles.activeTabText]}>
                        All Organizations
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, selectedTab === 'pending' && styles.activeTab]}
                    onPress={() => setSelectedTab('pending')}
                >
                    <Text style={[styles.tabText, selectedTab === 'pending' && styles.activeTabText]}>
                        Pending ({pendingOrgs.length})
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Organizations List */}
            <ScrollView
                style={styles.list}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => {
                        setRefreshing(true);
                        fetchData();
                    }} />
                }
            >
                {displayOrgs.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="business-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyText}>No organizations found</Text>
                    </View>
                ) : (
                    displayOrgs.map(org => renderOrganizationCard(org, selectedTab === 'pending'))
                )}
            </ScrollView>

            {/* Make Super Admin Modal */}
            <Modal visible={showMakeAdminModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Super Admin</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Enter email address"
                            value={newAdminEmail}
                            onChangeText={setNewAdminEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setShowMakeAdminModal(false);
                                    setNewAdminEmail('');
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.confirmBtn]}
                                onPress={handleMakeSuperAdmin}
                            >
                                <Text style={styles.confirmBtnText}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal visible={showRejectModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reject Organization</Text>
                        <Text style={styles.modalSubtitle}>
                            Organization: {selectedOrg?.orgName}
                        </Text>
                        <TextInput
                            style={[styles.modalInput, styles.textArea]}
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={4}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setShowRejectModal(false);
                                    setRejectReason('');
                                    setSelectedOrg(null);
                                }}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.rejectBtn]}
                                onPress={handleReject}
                            >
                                <Text style={styles.rejectBtnText}>Reject</Text>
                            </TouchableOpacity>
                        </View>
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
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
        marginTop: 4,
    },
    headerActions: {
        flexDirection: 'row',
        gap: 16,
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
        fontSize: 28,
        fontWeight: '700',
        color: '#1A1A1A',
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
        flex: 1,
        paddingHorizontal: 20,
    },
    orgCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
    },
    orgHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    orgInfo: {
        flex: 1,
    },
    orgName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    orgDomain: {
        fontSize: 12,
        color: '#888880',
    },
    orgBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        fontSize: 10,
        fontWeight: '600',
    },
    approvedBadge: {
        backgroundColor: '#E8F5E9',
        color: '#4CAF50',
    },
    pendingBadge: {
        backgroundColor: '#FFF3E0',
        color: '#FF9800',
    },
    orgDetails: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EBEBE6',
        gap: 12,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#666',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 8,
    },
    approveBtn: {
        backgroundColor: '#4CAF50',
    },
    rejectBtn: {
        backgroundColor: '#F44336',
    },
    actionBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
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
        padding: 24,
        width: '80%',
        maxWidth: 400,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 8,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#F5F5F0',
    },
    confirmBtn: {
        backgroundColor: '#1A1A1A',
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: '600',
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    rejectBtnText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});