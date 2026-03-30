import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { authAPI, saveToken, saveUser } from '../../services/api';

function showAlert(title, message) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
    } else {
        Alert.alert(title, message);
    }
}

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleLogin = async () => {
        if (!email || !password) {
            showAlert('Missing Fields', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.login({ email, password });
            if (response.success) {
                await saveToken(response.token);
                await saveUser(response.user);
                router.replace('/home');
            }
        } catch (error) {
            showAlert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAF7" />
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Brand mark */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoMark}>
                        <Text style={styles.logoText}>↕</Text>
                    </View>
                    <Text style={styles.brandName}>lenden</Text>
                    <Text style={styles.brandTagline}>campus lending, simplified</Text>
                </View>

                {/* Form */}
                <View style={styles.formCard}>
                    <Text style={styles.formTitle}>Welcome back</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>College Email</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedField === 'email' && styles.inputFocused,
                            ]}
                            placeholder="you@college.edu.in"
                            placeholderTextColor="#B8B8AE"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                            onFocus={() => setFocusedField('email')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={[
                                styles.input,
                                focusedField === 'password' && styles.inputFocused,
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor="#B8B8AE"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            editable={!loading}
                            onFocus={() => setFocusedField('password')}
                            onBlur={() => setFocusedField(null)}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.primaryButton, loading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={loading}
                        activeOpacity={0.85}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FAFAF7" size="small" />
                        ) : (
                            <Text style={styles.primaryButtonText}>Sign in →</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>New to lenden? </Text>
                    <TouchableOpacity onPress={() => router.push('/signup')} activeOpacity={0.7}>
                        <Text style={styles.footerLink}>Create account</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.disclaimer}>
                    Only verified college email addresses are accepted
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAF7',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 60,
    },

    // Brand
    brandContainer: {
        alignItems: 'center',
        marginBottom: 44,
    },
    logoMark: {
        width: 52,
        height: 52,
        borderRadius: 16,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    logoText: {
        fontSize: 24,
        color: '#FAFAF7',
    },
    brandName: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 34,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: -1,
    },
    brandTagline: {
        fontSize: 13,
        color: '#888880',
        marginTop: 4,
        letterSpacing: 0.3,
    },

    // Form card
    formCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 28,
        borderWidth: 1,
        borderColor: '#EBEBЕ6',
        shadowColor: '#1A1A1A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
    },
    formTitle: {
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 24,
        letterSpacing: -0.5,
    },

    // Inputs
    inputGroup: {
        marginBottom: 18,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#555550',
        marginBottom: 7,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#E8E8E3',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: '#1A1A1A',
        backgroundColor: '#FAFAF7',
    },
    inputFocused: {
        borderColor: '#1A1A1A',
        backgroundColor: '#FFFFFF',
    },

    // Buttons
    primaryButton: {
        backgroundColor: '#1A1A1A',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#FAFAF7',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    disabledButton: {
        opacity: 0.5,
    },

    // Footer
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 28,
    },
    footerText: {
        color: '#888880',
        fontSize: 15,
    },
    footerLink: {
        color: '#1A1A1A',
        fontSize: 15,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    disclaimer: {
        textAlign: 'center',
        color: '#AAAAА5',
        fontSize: 12,
        marginTop: 20,
        letterSpacing: 0.2,
    },
});