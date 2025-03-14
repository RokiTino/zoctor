import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router';

const onboardingTwo = () => {
    const router = useRouter(); // Initialize the router

    const handleNext = () => {
        router.push('./onboardingThree'); // Navigate to the next onboarding screen
    };
    return (
        <ImageBackground
            source={require('../../../assets/images/Onboarding2.png')} // Replace with the path to your image
            style={styles.backgroundImage}
        >
            <View style={styles.container}>
                {/* Image */}
                <Image
                    source={require('../../../assets/images/undraw_doctors_hwty 1.png')} // Replace with the path to your image
                    style={styles.image}
                    resizeMode="contain" // Adjust the image to fit within the container
                />

                {/* Text */}
                <Text style={styles.text}>
                    Find the best doctors in your area and book appointments easily!
                </Text>

                {/* Button */}
                <TouchableOpacity style={styles.button} onPress={handleNext}>
                    <Text style={styles.buttonText}>Next</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    )
}

export default onboardingTwo

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover', // or 'stretch' depending on your preference
    },
    container: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        paddingHorizontal: 20, // Add horizontal padding
    },
    image: {
        width: 300, // Adjust the width of the image
        height: 300, // Adjust the height of the image
        marginBottom: 90, // Space between image and text
    },
    text: {
        fontSize: 18, // Adjust as needed
        color: 'gray', // Text color
        textAlign: 'center', // Center-align text
        marginBottom: 30, // Space between text and button
    },
    button: {
        marginHorizontal: 20, // Add horizontal margin
        marginBottom: 40, // Space from the bottom
        paddingVertical: 15, // Button height
        backgroundColor: '#0089FF', // Button background color
        borderRadius: 50, // Rounded corners
        alignItems: 'center', // Center text horizontally
        width: 165,
        height: 60,
        alignContent: 'center',
        justifyContent: 'center',// Rounded corners
    },
    buttonText: {
        fontSize: 18, // Adjust as needed
        color: 'white', // Button text color
        fontWeight: 'bold',
    },
})