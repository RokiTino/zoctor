import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import SplashScreen from './splashscreen';

export default function App() {
  return (
    <View style={styles.container}>
     <SplashScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});