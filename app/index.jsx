import { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { Redirect } from 'expo-router';

export default function Index() {
  const [phase, setPhase] = useState('icon'); // 'icon' | 'text' | 'done'
  const opacity = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Phase 1: show icon for 1.4s
    // Then fade out, swap to text, fade in
    // Phase 2: show text for 1.2s
    // Then done

    const t1 = setTimeout(() => {
      // Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setPhase('text');
        // Fade in
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    }, 1400);

    const t2 = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setPhase('done'));
    }, 3100);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === 'done') return <Redirect href="/(auth)/login" />;

  return (
    <View style={styles.container}>
      <Animated.Image
        source={
          phase === 'icon'
            ? require('../assets/splash-icon.png')
            : require('../assets/splash2-text.png')
        }
        style={[styles.image, { opacity }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',  
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '75%',
    height: '40%',
  },
});