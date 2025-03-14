import { Image, ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

const onboardingOne = () => {
    const router = useRouter();

    const handleClick = () => {
        router.push('./onboardingTwo');
    }

    return (
        <ImageBackground
            source={require('../../../assets/images/OnboardingOne.png')} // Replace with the path to your image
            style={styles.backgroundImage}
        >
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>
                        <Text style={styles.blueZ}>W</Text>elcome to{'\n'}
                        <Text style={styles.blueZ}>Z</Text>octor !
                    </Text>
                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={styles.description}>
                        Choose the doctor that you{'\n'}
                        want with our very own booking app
                    </Text>
                </View>
                <View style={styles.imageContainer}>
                    <Image
                        source={require('../../../assets/images/undraw_doctor_kw5l 1.png')} // Replace with the path to your image
                        style={styles.image}
                        resizeMode="contain" // Adjust the image to fit within the container
                    />
                </View>

                <TouchableOpacity style={styles.nextButton} onPress={handleClick}>
                    <Text style={styles.nextButtonText}>Get Started</Text>
                </TouchableOpacity>

            </SafeAreaView>
        </ImageBackground>
    )
}

export default onboardingOne

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        resizeMode: 'cover', // or 'stretch' depending on your preference
    },
    safeArea: {
        flex: 1,
    },
    titleContainer: {
        marginTop: 20, // Adjust as needed
        marginLeft: 20, // Adjust as needed
    },
    title: {
        fontSize: 28, // Adjust as needed
        fontWeight: 'bold',
        color: 'black', // Default text color
    },
    blueZ: {
        color: 'blue', // Color for the "Z"
    },
    descriptionContainer: {
        marginTop: 20, // Space between title and description
        marginLeft: 20, // Align with the title
    },
    description: {
        fontSize: 16, // Adjust as needed
        color: 'gray',
        textAlign: 'left', // Align text to the left
    },

    imageContainer: {
        flex: 1, // Takes up remaining space
        justifyContent: 'center', // Center the image vertically
        alignItems: 'center', // Center the image horizontally
        marginHorizontal: 20, // Add horizontal margin
        marginTop: 20, // Space between description and image
    },
    image: {
        width: '100%', // Adjust the width of the image
        height: '100%', // Adjust the height of the image
        resizeMode: 'contain', // Ensure the image fits within the container
    },

    nextButton: {
        marginHorizontal: 20, // Add horizontal margin
        marginBottom: 40, // Space from the bottom
        paddingVertical: 15, // Button height
        backgroundColor: '#0089FF', // Button background color
        borderRadius: 50, // Rounded corners
        alignItems: 'center', // Center text horizontally
        width: 165,
        height: 60,
        alignContent: 'center',
        justifyContent: 'center',
    },
    nextButtonText: {
        fontSize: 18, // Adjust as needed
        color: 'white', // Button text color
        fontWeight: 'bold',
    },
})