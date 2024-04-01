import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native'
import React, { useState, useEffect } from 'react'
import { FIREBASE_DB, FIREBASE_AUTH, FIREBASE_STORAGE } from '../../FirebaseConfig';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore methods for document retrieval
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <TouchableOpacity onPress={pickImage}>
            <Image
              source={userData && userData.profilePic ? { uri: userData.profilePic } : defaultProfilePic}
              style={styles.profilePic}
            />
          </TouchableOpacity>
          <Text>Name: {userData && userData.name ? userData.name : "N/A"}</Text>
          <Text>Email: {userData && userData.email ? userData.email : "N/A"}</Text>
          <Text>Date of Birth: {userData && userData.dob ? userData.dob : "N/A"}</Text>
          {/* You can display other user details similarly */}
        </>
      )}
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
