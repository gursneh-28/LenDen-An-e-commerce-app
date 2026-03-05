import React, { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { requestAPI } from "./services/api";

export default function RequestScreen() {

  const [work, setWork] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async () => {
    try {

      const data = {
        work,
        price
      };

      const res = await requestAPI.createRequest(data);

      Alert.alert("Success", res.message);

      setWork("");
      setPrice("");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Create Request</Text>

      <TextInput
        placeholder="Enter work"
        style={styles.input}
        value={work}
        onChangeText={setWork}
      />

      <TextInput
        placeholder="Enter price"
        style={styles.input}
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />

      <Button title="Submit Request" onPress={handleSubmit} />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center"
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20
  },

  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 15,
    borderRadius: 6
  }

});