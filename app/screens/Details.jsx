import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, getDoc } from 'firebase/firestore'; // Import Firestore methods for document retrieval
import { getCurrentUser } from 'firebase/auth'; // Import method to get the current user

const Details = () => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const db = FIREBASE_DB;
  const auth = FIREBASE_AUTH;

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
      {userData ? (
        <>
          <Text>Name: {userData.name}</Text>
          <Text>Email: {userData.email}</Text>
          {/* Display other user data as needed */}
        </>
      ) : (
        <Text>No user data available</Text>
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
});
