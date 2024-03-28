import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { orderByDistance, getDistance } from 'geolib';
import { GOOGLE_API_KEY } from '../../EnvironmentalVar/enviro';

const MeetupScreen = ({ navigation }) => {
  const [gymLocation, setGymLocation] = useState('');
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);

  useEffect(() => {
    const checkGymLocation = async () => {
      const userDocRef = doc(FIREBASE_DB, 'Users', FIREBASE_AUTH.currentUser.uid);
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists() && docSnap.data().gymLocation) {
        setGymLocation(docSnap.data().gymLocation);
        setIsLocationLoaded(true);
      } else {
        setIsLocationLoaded(true); // Allow the user to set the gym location
      }
    };

    checkGymLocation();
  }, []);

  useEffect(() => {
    const fetchUsersLocations = async () => {
      const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'Users'));
      const usersLocations = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.gymLocation && user.id !== FIREBASE_AUTH.currentUser.uid) // Exclude the current user
        .map(user => ({
          ...user.gymLocation,
          name: user.name, // Assuming the user's name is stored in the 'name' field
          id: user.id,
        }));

      if (gymLocation) {
        // Sort the users by distance
        const sortedUsers = orderByDistance({
          latitude: gymLocation.lat,
          longitude: gymLocation.lng,
        }, usersLocations);

        // Store only the necessary information
        const usersWithDistance = sortedUsers.map(user => ({
          name: user.name,
          distance: getDistance(
            { latitude: gymLocation.lat, longitude: gymLocation.lng },
            { latitude: user.lat, longitude: user.lng }
          ),
          id: user.id,
        }));

        setNearbyUsers(usersWithDistance);
      }
    };

    if (gymLocation) {
      fetchUsersLocations();
    }
  }, [gymLocation]);

  const handleSelect = async (data, details = null) => {
    if (details) {
      const location = {
        name: data.structured_formatting.main_text,
        address: data.description,
        placeId: data.place_id,
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
      };
  
      try {
        await setDoc(doc(FIREBASE_DB, 'Users', FIREBASE_AUTH.currentUser.uid), { gymLocation: location }, { merge: true });
        setGymLocation(location.name); // Update to display the gym's name
      } catch (error) {
        console.error("Error saving gym location: ", error);
      }
    } else {
      console.log('No details fetched');
    }
  };
  
  const renderNearbyUsers = () => {
    return nearbyUsers.map((user, index) => (
      <Text key={index}>
        {user.name} - {user.distance} meters away
      </Text>
    ));
  };

  if (!isLocationLoaded) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (!gymLocation) {
    return (
      <View style={styles.container}>
        <GooglePlacesAutocomplete
          placeholder="Search for Gym"
          onPress={handleSelect} // Updated this line to call your handleSelect function
          query={{
            key: GOOGLE_API_KEY,
            components: 'country:uk',
          }}
          fetchDetails={true}
          onFail={error => console.error(error)}
          onNotFound={() => console.log('No results found')}
          styles={{
            textInputContainer: {
              width: '90%',
              alignSelf: 'center'
            },
            textInput: styles.input,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>Your gym location: {gymLocation && gymLocation.name}</Text>
      {renderNearbyUsers()}
      {/* ... rest of your content ... */}
    </View>
  );
};

export default MeetupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: 200,
  },
});
