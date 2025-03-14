import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { View, Text, StatusBar, Image, StyleSheet } from 'react-native';

export default function SplashScreen() {

    const router = useRouter();

  useEffect(() => {
    // Set a timeout to navigate to the home screen after 2 seconds
    const timer = setTimeout(() => {
      router.push('../pages/onboarding/onboardingOne'); // Navigate to the home screen
    }, 2000);

    // Clear the timeout if the component unmounts
    return () => clearTimeout(timer);
  }, []);

  return (
<View style={styles.container}>
      <StatusBar hidden />
      <LinearGradient
        colors={['#FAFDFF', '#279BFF']}
        style={styles.gradient}
      >
        <Image
          source={require('../assets/images/Zoctor.png')} // Replace with the path to your logo
          style={styles.logo}
        />
      </LinearGradient>
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 150, // Adjust the size of your logo
    height: 150, // Adjust the size of your logo
    resizeMode: 'contain',
  },
});