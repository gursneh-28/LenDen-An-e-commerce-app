import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator
} from "react-native";

import { requestAPI } from "./services/api";

export default function HelpScreen() {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {

      const res = await requestAPI.getRequests();

      setRequests(res.data);
      setLoading(false);

    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Help Requests</Text>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>

            <Text style={styles.work}>{item.work}</Text>

            <Text style={styles.price}>₹ {item.price}</Text>

            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>

          </View>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    padding: 20
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20
  },

  card: {
    backgroundColor: "#f4f4f4",
    padding: 15,
    marginBottom: 10,
    borderRadius: 8
  },

  work: {
    fontSize: 18,
    fontWeight: "bold"
  },

  price: {
    fontSize: 16,
    marginTop: 5
  },

  date: {
    fontSize: 12,
    marginTop: 5,
    color: "gray"
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  }

});