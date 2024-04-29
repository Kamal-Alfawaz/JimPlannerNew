import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image, Dimensions, ScrollView } from 'react-native'
import React, { useState, useEffect } from 'react'
import { FIREBASE_DB, FIREBASE_AUTH, FIREBASE_STORAGE } from '../../FirebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import defaultProfilePic from '../../assets/defaultProfilePic.png';
import { LineChart } from 'react-native-chart-kit';

const Details = () => {
  // Initialize state variables
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [deadliftAverages, setDeadliftAverages] = useState({});
  const [squatAverages, setSquatAverages] = useState({});
  const [benchPressAverages, setBenchPressAverages] = useState({});

  // Destructure Firebase DB and Auth
  const db = FIREBASE_DB;
  const auth = FIREBASE_AUTH;

  // Function to pick an image from the user's library
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
    });

    if (!result.canceled) {
        // Convert image to blob
        const response = await fetch(result.uri);
        const blob = await response.blob();

        // Create a reference to Firebase Storage
        const storageRef = ref(FIREBASE_STORAGE, `profilePictures/${FIREBASE_AUTH.currentUser.uid}`);
        
        // Upload image
        await uploadBytes(storageRef, blob).then(async (snapshot) => {
            const downloadURL = await getDownloadURL(snapshot.ref);

            // Update user's profile picture URL in Firestore
            await setDoc(doc(FIREBASE_DB, 'Users', FIREBASE_AUTH.currentUser.uid), { profilePic: downloadURL }, { merge: true });

            // Update local state to reflect change
            if (userData) {
                setUserData({...userData, profilePic: downloadURL});
            }
        });
    }
  };

  // Function to calculate the average weight for a given exercise
  const calculateAverageExerciseWeight = async (exerciseName, setAverageState) => {
    const exercisesRef = collection(db, 'Users', auth.currentUser.uid, 'UserExercises');
    const exercisesSnap = await getDocs(exercisesRef);

    let weightsByDate = {};
    
    // Iterate through each document in the snapshot
    exercisesSnap.forEach((doc) => {
        const exercises = doc.data().exercises.filter(e => e.exerciseName === exerciseName);

        // If there are any exercises with the specified name, calculate the average weight
        if (exercises.length) {
            let totalWeight = 0;
            let totalSets = 0;

            // Iterate through each exercise and its sets
            exercises.forEach(exercise => {
                exercise.sets.forEach(set => {
                    const weight = parseInt(set.weight, 10);
                    // If the weight is a number, add it to the total weight and increment the total sets
                    if (!isNaN(weight)) {
                        totalWeight += weight;
                        totalSets++;
                    }
                });
            });

            // If there are any sets, calculate the average weight and store it in the weightsByDate object
            if (totalSets > 0) {
                const averageWeight = totalWeight / totalSets;
                weightsByDate[doc.id] = averageWeight.toFixed(1); // Keep only one decimal place
            }
        }
    });
    // Set the state of the average weights for the specified exercise
    setAverageState(weightsByDate);
  };

  // Fetch user data from Firestore when the component mounts
  useEffect(() => {
    // Function to fetch user data from Firestore
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userDocRef = doc(db, 'Users', currentUser.uid);
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            console.log('No such document!');
          }
        } else {
          console.log('No user signed in');
        }
      } catch (error) {
        console.error('Error getting user document:', error);
      } finally {
        setLoading(false);
      }
    };
  
    // Call the fetchUserData function when the component mounts
    fetchUserData();
    calculateAverageExerciseWeight('Barbell Deadlift', setDeadliftAverages);
    calculateAverageExerciseWeight('Barbell Squat', setSquatAverages);
    calculateAverageExerciseWeight('Barbell Bench Press - Medium Grip', setBenchPressAverages);
  }, [auth, db]);

  // Function to render a chart for a given exercise
  const renderChart = (data, title) => {
    if (!data || Object.keys(data).length === 0) {
      return null;
    }
  
    const labels = Object.keys(data);
    const datasets = [{
      data: Object.values(data).map(Number),
      color: (opacity = 1) => `rgba(0, 51, 102, ${opacity})`,
      strokeWidth: 2,
    }];
  
    if (!datasets[0].data.every(d => typeof d === 'number' && !isNaN(d))) {
      console.error('Invalid dataset', datasets[0].data);
      return null;
    }
  
    return (
      <View style={{
        alignItems: 'center',
        backgroundColor: '#D0E4F7',
        borderRadius: 9,
        marginBottom: 20,
      }}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
          data={{ labels, datasets }}
          width={Dimensions.get('window').width - 16}
          height={220}
          chartConfig={{
            backgroundColor: '#D0E4F7',
            backgroundGradientFrom: '#D0E4F7',
            backgroundGradientTo: '#D0E4F7',
            decimalPlaces: 1,
            color: (opacity = 1) => `rgba(0, 51, 102, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 9
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#002244'
            },
            propsForBackgroundLines: {
              stroke: '#002244'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 9
          }}
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
    {loading ? (
      <ActivityIndicator size="large" color="#0000ff" />
    ) : (
      <>
        <TouchableOpacity onPress={pickImage} testID="imagePickerButton">
          <Image
            source={userData && userData.profilePic ? { uri: userData.profilePic } : defaultProfilePic}
            style={styles.profilePic}
          />
        </TouchableOpacity>
        <Text>Name: {userData && userData.name ? userData.name : "N/A"}</Text>
        <Text>Email: {userData && userData.email ? userData.email : "N/A"}</Text>
        <Text>Date of Birth: {userData && userData.dob ? userData.dob : "N/A"}</Text>
        <Text style={styles.title}>BIG 3 Strength progress</Text>
        {Object.keys(deadliftAverages).length > 0 ? (
          renderChart(deadliftAverages, 'Barbell Deadlift')
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>View your Barbell Deadlift progress here when you log it.</Text>
          </View>
        )}
        {Object.keys(squatAverages).length > 0 ? (
          renderChart(squatAverages, 'Barbell Squat')
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>View your Barbell Squat progress here when you log it.</Text>
          </View>
        )}
        {Object.keys(benchPressAverages).length > 0 ? (
          renderChart(benchPressAverages, 'Barbell Bench Press - Medium Grip')
        ) : (
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>View your Barbell Bench Press progress here when you log it.</Text>
          </View>
        )}
      </>
    )}
  </ScrollView>
  );
}

export default Details;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    alignItems: 'center',
    padding: 40,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  title:{
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 25,
    fontWeight: 'bold',
    paddingVertical:20,
  },
  chartPlaceholder: {
    width: Dimensions.get('window').width - 16,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 9,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#cccccc',
  },
  placeholderText: {
    textAlign: 'center',
    color: 'grey',
    fontSize: 16,
  },
});
