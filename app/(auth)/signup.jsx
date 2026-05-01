import React, { useState, useRef, useEffect } from 'react';
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
    Image, 
} from 'react-native';
import { router } from 'expo-router';
import { authAPI } from '../../services/api';

function showAlert(title, message, onOk) {
    if (Platform.OS === 'web') {
        window.alert(`${title}\n${message}`);
        if (onOk) onOk();
    } else {
        const buttons = onOk ? [{ text: 'OK', onPress: onOk }] : undefined;
        Alert.alert(title, message, buttons);
    }
}

// ─── Step 1: Details Form ────────────────────────────────────────────────────
function SignupForm({ onSendOtp }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const handleContinue = async () => {
        if (!username || !email || !password || !confirmPassword) {
            showAlert('Missing Fields', 'Please fill in all fields');
            return;
        }
        if (password !== confirmPassword) {
            showAlert('Password Mismatch', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            showAlert('Weak Password', 'Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.sendOtp({ email });
            if (response.success) {
                onSendOtp({ username, email, password });
            }
        } catch (error) {
            showAlert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create account</Text>
            <Text style={styles.formSubtitle}>Use your college email to get started</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                    style={[styles.input, focusedField === 'username' && styles.inputFocused]}
                    placeholder="choose a handle"
                    placeholderTextColor="#B8B8AE"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>College Email</Text>
                <TextInput
                    style={[styles.input, focusedField === 'email' && styles.inputFocused]}
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
                    style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                    placeholder="min. 6 characters"
                    placeholderTextColor="#B8B8AE"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    editable={!loading}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                    style={[styles.input, focusedField === 'confirm' && styles.inputFocused]}
                    placeholder="repeat password"
                    placeholderTextColor="#B8B8AE"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                    onFocus={() => setFocusedField('confirm')}
                    onBlur={() => setFocusedField(null)}
                />
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleContinue}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color="#FAFAF7" size="small" />
                ) : (
                    <Text style={styles.primaryButtonText}>Send Verification Code →</Text>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Step 2: OTP Verification ────────────────────────────────────────────────
function OtpVerification({ formData, onSuccess, onBack }) {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        const timer = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleOtpChange = (value, index) => {
        // Allow only digits
        if (!/^\d*$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // only last char
        setOtp(newOtp);

        // Auto-advance
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = otp.join('');
        if (code.length !== 6) {
            showAlert('Incomplete', 'Please enter the full 6-digit code');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.verifyOtpAndSignup({
                ...formData,
                otp: code,
            });
            if (response.success) {
                onSuccess();
            }
        } catch (error) {
            showAlert('Verification Failed', error.message);
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        try {
            await authAPI.sendOtp({ email: formData.email });
            setResendTimer(60);
            setCanResend(false);
            setOtp(['', '', '', '', '', '']);
            // restart timer
            const timer = setInterval(() => {
                setResendTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanResend(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } catch (error) {
            showAlert('Error', error.message);
        }
    };

    const maskedEmail = formData.email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) =>
        a + '*'.repeat(b.length) + c
    );

    return (
        <View style={styles.formCard}>
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.formTitle}>Check your inbox</Text>
            <Text style={styles.formSubtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.emailHighlight}>{maskedEmail}</Text>
            </Text>

            {/* OTP Boxes */}
            <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={ref => (inputRefs.current[index] = ref)}
                        style={[
                            styles.otpBox,
                            digit ? styles.otpBoxFilled : null,
                        ]}
                        value={digit}
                        onChangeText={val => handleOtpChange(val, index)}
                        onKeyPress={e => handleKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!loading}
                        textAlign="center"
                    />
                ))}
            </View>

            <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabledButton]}
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color="#FAFAF7" size="small" />
                ) : (
                    <Text style={styles.primaryButtonText}>Verify & Create Account</Text>
                )}
            </TouchableOpacity>

            {/* Resend */}
            <View style={styles.resendRow}>
                <Text style={styles.resendText}>Didn't receive it? </Text>
                <TouchableOpacity onPress={handleResend} disabled={!canResend} activeOpacity={0.7}>
                    <Text style={[styles.resendLink, !canResend && styles.resendDisabled]}>
                        {canResend ? 'Resend code' : `Resend in ${resendTimer}s`}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Main Signup Screen ──────────────────────────────────────────────────────
export default function SignupScreen() {
    const [step, setStep] = useState('form'); // 'form' | 'otp'
    const [formData, setFormData] = useState(null);

    const handleOtpSent = (data) => {
        setFormData(data);
        setStep('otp');
    };

    const handleSuccess = () => {
        showAlert(
            '🎉 You\'re in!',
            'Account verified. Please log in.',
            () => router.replace('/(auth)/login')
        );
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
                {/* Brand */}
                <View style={styles.brandContainer}>
                    <Image
                        source={require('../../assets/splash-icon.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.brandText}>
                        LE<Text style={styles.brandTextDevanagari}>न</Text>-<Text style={styles.brandTextDevanagari}>दे</Text>न
                    </Text>
                    <Text style={styles.brandTagline}>Organization Lending & Marketplace Simplified</Text>
                </View>

                {/* Steps indicator */}
                <View style={styles.stepsRow}>
                    <View style={[styles.stepDot, step === 'form' && styles.stepDotActive]} />
                    <View style={styles.stepLine} />
                    <View style={[styles.stepDot, step === 'otp' && styles.stepDotActive]} />
                </View>

                {step === 'form' ? (
                    <SignupForm onSendOtp={handleOtpSent} />
                ) : (
                    <OtpVerification
                        formData={formData}
                        onSuccess={handleSuccess}
                        onBack={() => setStep('form')}
                    />
                )}

                {step === 'form' && (
                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/login')} activeOpacity={0.7}>
                            <Text style={styles.footerLink}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <Text style={styles.disclaimer}>
                    Only verified organization email addresses are accepted
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAF7' },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 60,
    },

    // Brand
    brandContainer: { alignItems: 'center', marginBottom: 32 },
    logoImage: {
        width: 115,
        height: 115,
        marginBottom: 4,
    },
    brandImage: {
        width: 160,
        height: 45,
        marginBottom: 2,
    },
    brandText: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1A1A1A',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        includeFontPadding: false,
    },
    brandTextDevanagari: {
        fontSize: 36,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: Platform.OS === 'ios' ? 'Kohinoor Devanagari' : 'sans-serif',
        includeFontPadding: false,
    },
    brandTagline: { fontSize: 13, color: '#888880', marginTop: 4, letterSpacing: 0.3 },
    // Steps
    stepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    stepDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D8D8D3',
    },
    stepDotActive: { backgroundColor: '#1A1A1A' },
    stepLine: { width: 40, height: 1.5, backgroundColor: '#D8D8D3', marginHorizontal: 8 },

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
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#888880',
        marginBottom: 24,
        lineHeight: 20,
    },
    emailHighlight: { color: '#1A1A1A', fontWeight: '600' },

    // Inputs
    inputGroup: { marginBottom: 16 },
    label: {
        fontSize: 11,
        fontWeight: '700',
        color: '#555550',
        marginBottom: 7,
        letterSpacing: 0.7,
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
    inputFocused: { borderColor: '#1A1A1A', backgroundColor: '#FFFFFF' },

    // OTP
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 24,
    },
    otpBox: {
        width: 46,
        height: 56,
        borderWidth: 1.5,
        borderColor: '#E8E8E3',
        borderRadius: 12,
        fontSize: 22,
        fontWeight: '700',
        color: '#1A1A1A',
        backgroundColor: '#FAFAF7',
        textAlign: 'center',
    },
    otpBoxFilled: {
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
    primaryButtonText: { color: '#FAFAF7', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
    disabledButton: { opacity: 0.5 },

    // Back
    backButton: { marginBottom: 16 },
    backButtonText: { fontSize: 14, color: '#888880', fontWeight: '600' },

    // Resend
    resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    resendText: { color: '#888880', fontSize: 14 },
    resendLink: { color: '#1A1A1A', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
    resendDisabled: { color: '#B8B8AE', textDecorationLine: 'none' },

    // Footer
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 28 },
    footerText: { color: '#888880', fontSize: 15 },
    footerLink: { color: '#1A1A1A', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
    disclaimer: { textAlign: 'center', color: '#AAAAА5', fontSize: 12, marginTop: 20, letterSpacing: 0.2 },
});