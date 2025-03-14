import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { useRouter } from 'expo-router';

const onboardingThree = () => {
    const router = useRouter(); // Initialize the router

    const handleYes = () => {
        router.push('.././login'); // Navigate to the login screen
    };

    const handleNo = () => {
        router.push('./signup'); // Navigate to the signup screen
    };
    return (
        <ImageBackground
            source={require('../../../assets/images/Onboarding3.png')} // Replace with the path to your image
            style={styles.backgroundImage}
        >
            <View style={styles.container}>
                {/* Image */}
                <Image
                    source={require('../../../assets/images/undraw_Profile_re_4a55 1.png')} // Replace with the path to your image
                    style={styles.image}
                    resizeMode="contain" // Adjust the image to fit within the container
                />

                {/* Text */}
                <Text style={styles.text}>Already Signed Up?</Text>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.button} onPress={handleYes}>
                        <Text style={styles.buttonText}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.noButton} onPress={handleNo}>
                        <Text style={styles.noButtonText}>No</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    )
}

export default onboardingThree

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
        marginBottom: 20, // Space between image and text
    },
    text: {
        fontSize: 24, // Adjust as needed
        color: 'black', // Text color
        textAlign: 'center', // Center-align text
        marginBottom: 40, // Space between text and buttons
        fontWeight: 'bold', // Make the text bold
    },
    buttonContainer: {
        flexDirection: 'row', // Arrange buttons in a row
        justifyContent: 'space-between', // Space out buttons evenly
        width: '80%', // Set the width of the button container
    },
    button: {
        marginHorizontal: 15, // Add horizontal margin
        marginBottom: 40, // Space from the bottom
        paddingVertical: 15, // Button height
        backgroundColor: '#0089FF', // Button background color
        borderRadius: 50, // Rounded corners
        alignItems: 'center', // Center text horizontally
        width: 116,
        height: 60,
        alignContent: 'center',
        justifyContent: 'center',// Rounded corners
    },
    buttonText: {
        fontSize: 18, // Adjust as needed
        color: 'white', // Button text color
        fontWeight: 'bold',
        textAlign: 'center', // Center-align button text
    },
    noButton: {
        width: 116,
        height: 60,
        backgroundColor: 'white', // White background
        paddingVertical: 15, // Button height
        paddingHorizontal: 40, // Button width
        borderRadius: 50, // Rounded corners
        borderWidth: 2, // Add a border
        borderColor: '#0089FF', // Blue border color
        flex: 1, // Allow buttons to share available space
        marginHorizontal: 10, // Add space between buttons
        alignContent: 'center',
        justifyContent: 'center'
    },
    noButtonText: {
        fontSize: 18, // Adjust as needed
        color: '#0089FF', // Blue text color
        fontWeight: 'bold',
        textAlign: 'center', // Center-align button text
    },
})