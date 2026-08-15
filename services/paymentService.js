import React, { useState, useRef } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { paymentAPI } from './api';

// ─── RazorpayWebView ──────────────────────────────────────────────────────────
// Drop this component into any screen that needs payment.
// It renders as a full-screen Modal when visible=true.
//
// Props:
//   visible    - boolean
//   options    - Razorpay options object (key, amount, order_id, etc.)
//   onSuccess  - called with { razorpay_payment_id, razorpay_order_id, razorpay_signature }
//   onCancel   - called with no args when user closes or payment fails

export function RazorpayWebView({ visible, options, onSuccess, onCancel }) {
    const [loading, setLoading] = useState(true);

    if (!options) return null;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #f8f7f4;
      display: flex; align-items: center; justify-content: center;
      height: 100vh; font-family: -apple-system, sans-serif;
    }
    .loader { text-align: center; color: #6b7280; }
    .icon { font-size: 36px; margin-bottom: 12px; }
    p { font-size: 15px; }
  </style>
</head>
<body>
  <div class="loader">
    <div class="icon">💳</div>
    <p>Opening payment...</p>
  </div>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <script>
    function postMsg(obj) {
      window.ReactNativeWebView.postMessage(JSON.stringify(obj));
    }

    var opts = ${JSON.stringify(options)};

    opts.handler = function(response) {
      postMsg({ type: 'SUCCESS', data: response });
    };

    opts.modal = {
      ondismiss: function() {
        postMsg({ type: 'CANCELLED' });
      }
    };

    window.onload = function() {
      setTimeout(function() {
        try {
          var rzp = new Razorpay(opts);
          rzp.on('payment.failed', function(resp) {
            postMsg({ type: 'FAILED', error: resp.error.description });
          });
          rzp.open();
        } catch(e) {
          postMsg({ type: 'FAILED', error: e.message });
        }
      }, 400);
    };
  </script>
</body>
</html>`;

    const onMessage = (event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'SUCCESS')   onSuccess(msg.data);
            if (msg.type === 'CANCELLED') onCancel();
            if (msg.type === 'FAILED')    onCancel(msg.error);
        } catch (_) {
            onCancel('Unexpected error');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onCancel}
        >
            <SafeAreaView style={st.container}>
                <View style={st.header}>
                    <Text style={st.title}>Secure Payment</Text>
                    <TouchableOpacity onPress={onCancel} style={st.closeBtn}>
                        <Text style={st.closeX}>✕</Text>
                    </TouchableOpacity>
                </View>

                {loading && (
                    <View style={st.overlay}>
                        <ActivityIndicator size="large" color="#028090" />
                        <Text style={st.loadingText}>Loading...</Text>
                    </View>
                )}

                <WebView
                    source={{ html }}
                    onMessage={onMessage}
                    onLoadEnd={() => setLoading(false)}
                    javaScriptEnabled
                    domStorageEnabled
                    style={{ flex: 1 }}
                />
            </SafeAreaView>
        </Modal>
    );
}

const st = StyleSheet.create({
    container:   { flex: 1, backgroundColor: '#fff' },
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#e5e5e5' },
    title:       { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
    closeBtn:    { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
    closeX:      { fontSize: 14, color: '#6b7280', fontWeight: '600' },
    overlay:     { ...StyleSheet.absoluteFillObject, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 10, gap: 12 },
    loadingText: { fontSize: 14, color: '#6b7280', marginTop: 8 },
});

// ─── useRazorpay hook ─────────────────────────────────────────────────────────
// Use this hook in any screen that needs payment.
//
// Usage:
//   const { razorpayModal, initiatePayment } = useRazorpay();
//   ...
//   const result = await initiatePayment({ amount, type, relatedId, description, userEmail, userName });
//   // result = { success: true, paymentId: string }
//   ...
//   return <View>... {razorpayModal}</View>   ← render this anywhere in your JSX

export function useRazorpay() {
    const [modalVisible, setModalVisible] = useState(false);
    const [rzpOptions,   setRzpOptions]   = useState(null);
    const resolveRef = useRef(null);
    const rejectRef  = useRef(null);

    const initiatePayment = async ({ amount, type, relatedId, description, userEmail, userName }) => {
        // Step 1: create order on backend
        const orderRes = await paymentAPI.createRazorpayOrder({
            amount, type, relatedId, description,
        });

        if (!orderRes.success) {
            throw new Error(orderRes.message || 'Failed to create payment order');
        }

        const { orderId, amount: amountInPaise, currency, keyId } = orderRes;

        const options = {
            key:         keyId,
            amount:      amountInPaise,
            currency,
            order_id:    orderId,
            name:        'LenDen',
            description,
            prefill:     { email: userEmail || '', name: userName || '', contact: '' },
            theme:       { color: '#028090' },
        };

        // Step 2: open modal, wait for user to pay or cancel
        const paymentData = await new Promise((resolve, reject) => {
            resolveRef.current = resolve;
            rejectRef.current  = reject;
            setRzpOptions(options);
            setModalVisible(true);
        });

        // Step 3: verify with backend
        const verifyRes = await paymentAPI.verifyPayment({
            razorpay_order_id:   paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature:  paymentData.razorpay_signature,
        });

        if (!verifyRes.success) {
            throw new Error('Payment verification failed. Please contact support.');
        }

        return { success: true, paymentId: paymentData.razorpay_payment_id };
    };

    const onSuccess = (data) => {
        setModalVisible(false);
        if (resolveRef.current) resolveRef.current(data);
    };

    const onCancel = (errMsg) => {
        setModalVisible(false);
        if (rejectRef.current) rejectRef.current(new Error(errMsg || 'Payment was cancelled.'));
    };

    const razorpayModal = (
        <RazorpayWebView
            visible={modalVisible}
            options={rzpOptions}
            onSuccess={onSuccess}
            onCancel={onCancel}
        />
    );

    return { razorpayModal, initiatePayment };
}

// Default export keeps backward compat but screens should use useRazorpay() hook
export default { RazorpayWebView, useRazorpay };