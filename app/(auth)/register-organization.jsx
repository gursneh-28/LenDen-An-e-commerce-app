// app/(auth)/register-organization.jsx (Updated with OTP)
import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
    ScrollView, StatusBar
} from 'react-native';
import { router } from 'expo-router';
import { adminAuthAPI } from '../../services/api';

export default function RegisterOrganization() {
    const [step, setStep] = useState('form'); // 'form', 'otp'
    const [formData, setFormData] = useState({
        orgName: '',
        adminName: '',
        adminEmail: '',
        contactNumber: '',
        domain: '',
        password: '',
        confirmPassword: '',
        otp: '',
    });
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSendOtp = async () => {
        const { adminEmail } = formData;
        if (!adminEmail) {
            Alert.alert('Error', 'Please enter admin email first');
            return;
        }
    
        setLoading(true);
        try {
            const response = await adminAuthAPI.sendAdminOtp({ email: adminEmail });
            if (response.success) {
                setStep('otp');
                // Auto-fill the OTP
                if (response.otp) {
                    handleChange('otp', response.otp.toString());
                }
                Alert.alert('Success', `Your OTP is: ${response.otp}`);
            }
        } catch (error) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        const { orgName, adminName, adminEmail, contactNumber, domain, password, confirmPassword, otp } = formData;
        
        if (!orgName || !adminName || !adminEmail || !contactNumber || !domain || !password || !otp) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await adminAuthAPI.registerOrganization({
                orgName,
                adminName,
                adminEmail,
                contactNumber,
                domain: domain.toLowerCase(),
                password,
                otp,
            });

            if (response.success) {
                Alert.alert(
                    'Registration Submitted',
                    'Your organization registration request has been submitted. You will receive an email once approved.',
                    [{ text: 'OK', onPress: () => router.replace('/login') }]
                );
            }
        } catch (error) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'otp') {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <StatusBar barStyle="dark-content" backgroundColor="#FAFAF7" />
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => setStep('form')} style={styles.backBtn}>
                            <Text style={styles.backBtnText}>← Back</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.formTitle}>Verify Your Email</Text>
                        <Text style={styles.otpHint}>
                            We've sent a verification code to {'\n'}
                            <Text style={styles.emailText}>{formData.adminEmail}</Text>
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Enter OTP</Text>
                            <TextInput
                                style={[styles.input, focusedField === 'otp' && styles.inputFocused]}
                                placeholder="000000"
                                placeholderTextColor="#B8B8AE"
                                value={formData.otp}
                                onChangeText={(v) => handleChange('otp', v)}
                                keyboardType="number-pad"
                                maxLength={6}
                                onFocus={() => setFocusedField('otp')}
                                onBlur={() => setFocusedField(null)}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.primaryButton, loading && styles.disabledButton]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FAFAF7" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Verify & Register →</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.resendBtn}
                            onPress={handleSendOtp}
                            disabled={loading}
                        >
                            <Text style={styles.resendText}>Resend OTP</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAF7" />
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Text style={styles.backBtnText}>← Back</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Register Organization</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Organization Name</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'orgName' && styles.inputFocused]}
                            placeholder="e.g., IIT Gandhinagar"
                            value={formData.orgName}
                            onChangeText={(v) => handleChange('orgName', v)}
                            onFocus={() => setFocusedField('orgName')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Organization Domain</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'domain' && styles.inputFocused]}
                            placeholder="e.g., iitgn.ac.in"
                            value={formData.domain}
                            onChangeText={(v) => handleChange('domain', v.toLowerCase())}
                            autoCapitalize="none"
                            onFocus={() => setFocusedField('domain')}
                            onBlur={() => setFocusedField(null)}
                        />
                        <Text style={styles.hint}>Students with this email domain will be allowed to register</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Name</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'adminName' && styles.inputFocused]}
                            placeholder="Full name"
                            value={formData.adminName}
                            onChangeText={(v) => handleChange('adminName', v)}
                            onFocus={() => setFocusedField('adminName')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Email</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'adminEmail' && styles.inputFocused]}
                            placeholder="admin@organization.com"
                            value={formData.adminEmail}
                            onChangeText={(v) => handleChange('adminEmail', v)}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            onFocus={() => setFocusedField('adminEmail')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'contactNumber' && styles.inputFocused]}
                            placeholder="+91 XXXXXXXXXX"
                            value={formData.contactNumber}
                            onChangeText={(v) => handleChange('contactNumber', v)}
                            keyboardType="phone-pad"
                            onFocus={() => setFocusedField('contactNumber')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                            placeholder="••••••••"
                            value={formData.password}
                            onChangeText={(v) => handleChange('password', v)}
                            secureTextEntry
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={[styles.input, focusedField === 'confirmPassword' && styles.inputFocused]}
                            placeholder="••••••••"
                            value={formData.confirmPassword}
                            onChangeText={(v) => handleChange('confirmPassword', v)}
                            secureTextEntry
                            onFocus={() => setFocusedField('confirmPassword')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.disabledButton]}
                        onPress={handleSendOtp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAFAF7" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Send OTP →</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF7' },
    scrollContainer: { flexGrow: 1, paddingHorizontal: 28, paddingVertical: 40 },
    header: { marginBottom: 24 },
    backBtn: { marginBottom: 16 },
    backBtnText: { fontSize: 16, color: '#888880', fontWeight: '500' },
    formCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: '#EBEBE6', shadowColor: '#1A1A1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
    formTitle: { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 20 },
    divider: { height: 1, backgroundColor: '#EBEBE6', marginVertical: 20 },
    inputGroup: { marginBottom: 18 },
    label: { fontSize: 12, fontWeight: '600', color: '#555550', marginBottom: 7, textTransform: 'uppercase' },
    input: { borderWidth: 1.5, borderColor: '#E8E8E3', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1A1A1A', backgroundColor: '#FAFAF7' },
    inputFocused: { borderColor: '#1A1A1A', backgroundColor: '#FFFFFF' },
    hint: { fontSize: 11, color: '#888880', marginTop: 6 },
    primaryButton: { backgroundColor: '#1A1A1A', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    primaryButtonText: { color: '#FAFAF7', fontSize: 16, fontWeight: '700' },
    disabledButton: { opacity: 0.5 },
    otpHint: { textAlign: 'center', marginBottom: 24, color: '#666', fontSize: 14 },
    emailText: { fontWeight: '700', color: '#1A1A1A' },
    resendBtn: { marginTop: 16, alignItems: 'center' },
    resendText: { color: '#888880', fontSize: 14, textDecorationLine: 'underline' },
});