import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore methods for document retrieval
import defaultProfilePic from '../../assets/defaultProfilePic.png';

const Details = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const db = FIREBASE_DB;
  const auth = FIREBASE_AUTH;

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
    });

    console.log(result);

    if (!result.canceled) {
        setProfilePic(result.uri);
    }
  };

  useEffect(() => {
    // Function to fetch user data from Firestore
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser; // Corrected this line
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
  }, [auth, db]); // Added dependencies to useEffect
  

  // If loading, display loading indicator
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  // Once loading is complete, display user data
  return (
    <View style={styles.container}>
      <Image
        source={userData && userData.profilePicture ? { uri: userData.profilePicture } : defaultProfilePic}
        style={styles.profilePic}
      />
      <Text>Name: {userData && userData.name ? userData.name : "Hello"}</Text>
      <Text>Email: {userData && userData.email ? userData.email : "Hello"}</Text>
      <Text>Date of Birth: {userData && userData.DateOfBirth ? userData.DateOfBirth : "Hello"}</Text>
      {/* Display other fields as needed */}
    </View>
  );
}

export default Details;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
  },
});
