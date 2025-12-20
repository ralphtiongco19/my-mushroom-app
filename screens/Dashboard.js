import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Title, Paragraph } from 'react-native-paper';

export default function Dashboard() {
  const [temperature, setTemperature] = useState(25); // default dummy value
  const [humidity, setHumidity] = useState(60); // default dummy value

  // Simulate fetching data every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      // Replace this with your sensor or API data
      const newTemp = (Math.random() * 10 + 20).toFixed(1); 
      const newHum = (Math.random() * 20 + 50).toFixed(1);

      setTemperature(newTemp);
      setHumidity(newHum);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Title style={styles.header}>Environment Dashboard</Title>
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph>Temperature</Paragraph>
          <Text style={styles.value}>{temperature}°C</Text>
        </Card.Content>
      </Card>
      <Card style={styles.card}>
        <Card.Content>
          <Paragraph>Humidity</Paragraph>
          <Text style={styles.value}>{humidity}%</Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    marginVertical: 10,
    padding: 10,
  },
  value: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 5,
  },
});
