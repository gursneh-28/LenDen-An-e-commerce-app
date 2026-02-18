import { View, Text, StyleSheet } from 'react-native';

export default function Request() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Request Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 22 },
});
