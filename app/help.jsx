import { View, Text, StyleSheet } from 'react-native';

export default function Help() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Help Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 22 },
});
