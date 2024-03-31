import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Button } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, setDoc, getDoc, getDocs, collection } from 'firebase/firestore';
import { orderByDistance, getDistance } from 'geolib';
import { GOOGLE_API_KEY } from '../../EnvironmentalVar/enviro';

const MeetupScreen = ({ navigation }) => {
  const [gymLocation, setGymLocation] = useState('');
  const [isLocationLoaded, setIsLocationLoaded] = useState(false);
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [connectionRequests, setConnectionRequests] = useState([]);
  const [connectionRequestsSent, setConnectionRequestsSent] = useState([]);
  const [connectionRequestsReceived, setConnectionRequestsReceived] = useState([]);


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

  useEffect(() => {
    const fetchConnections = async () => {
      const userId = FIREBASE_AUTH.currentUser.uid;
  
      const userRef = doc(FIREBASE_DB, 'Users', userId);
      const userSnapshot = await getDoc(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        // Set gymLocation if it exists
        if (userData.gymLocation) {
          setGymLocation(userData.gymLocation);
        }
        // Set friends if the field exists
        if (Array.isArray(userData.friends)) {
          setFriends(userData.friends);
        }
  
        // Fetch connection requests received by the user
        const requestsRef = collection(FIREBASE_DB, `Users/${userId}/connectionRequests`);
        const requestsSnapshot = await getDocs(requestsRef);
        setConnectionRequestsReceived(requestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  
        // Fetch connection requests sent by the user
        const sentRequestsRef = collection(FIREBASE_DB, `Users/${userId}/sentConnectionRequests`);
        const sentRequestsSnapshot = await getDocs(sentRequestsRef);
        setConnectionRequestsSent(sentRequestsSnapshot.docs.map(doc => doc.id)); // Assuming the doc ID is the user ID to whom the request was sent
      }
      setIsLocationLoaded(true);
    };
  
    fetchConnections();
  }, []);

  const renderFriends = () => {
    // This will depend on how you fetch and store the friends' data.
    return friends.map((friendId, index) => (
      <View key={index} style={styles.userBox}>
        <Text style={styles.userName}>{/* friend's name here */}</Text>
        {/* More friend details */}
      </View>
    ));
  };
  
  const renderIncomingRequests = () => {
    // This will depend on how you fetch and store the requests' data.
    return connectionRequestsReceived.map((request, index) => (
      <View key={index} style={styles.userBox}>
        <Text style={styles.userName}>{/* requester's name here */}</Text>
        <TouchableOpacity onPress={() => acceptConnectionRequest(request.id)}>
          <Button title='hello'></Button>
        </TouchableOpacity>
      </View>
    ));
  };

  const sendConnectionRequest = async (toUserId) => {
    const fromUserId = FIREBASE_AUTH.currentUser.uid;
  
    // Check that both user IDs are defined
    if (!toUserId || !fromUserId) {
      console.error('Invalid user IDs.');
      return;
    }
  
    // Correctly reference the subcollection for connection requests
    const requestRef = doc(FIREBASE_DB, `Users/${toUserId}/connectionRequests/${fromUserId}`);
  
    try {
      await setDoc(requestRef, {
        from: fromUserId,
        status: 'pending'
      });
      console.log('Connection request sent successfully.');
      
      // Update state if necessary
      setConnectionRequestsSent(prevRequests => [...prevRequests, toUserId]);
    } catch (error) {
      console.error('Error sending connection request: ', error);
    }
    const sentRequestRef = doc(FIREBASE_DB, `Users/${fromUserId}/sentConnectionRequests/${toUserId}`);
    await setDoc(sentRequestRef, { status: 'pending' });
  };
  

  const getConnectionStatus = (userId) => {
    // Check if the current user has sent a connection request to userId
    if (connectionRequestsSent.includes(userId)) {
      return 'Request Sent';
    }
  
    // Check if the current user has received a connection request from userId
    if (connectionRequestsReceived.some(request => request.from === userId && request.status === 'pending')) {
      return 'Respond to Request'; // Indicates that there's a pending request to respond to
    }
  
    // Check if userId is already a friend
    if (friends.includes(userId)) {
      return 'Message'; // They are already connected
    }
  
    return 'Request Connect'; // No connection or pending request
  };
  

  const handleSelect = async (data, details = null) => {
    if (details && details.geometry && details.geometry.location) {
      const location = {
        name: data.structured_formatting.main_text,
        address: data.description,
        placeId: data.place_id,
        lat: details.geometry.location.lat,
        lng: details.geometry.location.lng,
      };
  
      try {
        await setDoc(doc(FIREBASE_DB, 'Users', FIREBASE_AUTH.currentUser.uid), { gymLocation: location }, { merge: true });
        setGymLocation(location); // Save the entire location object
      } catch (error) {
        console.error("Error saving gym location: ", error);
      }
    } else {
      console.log('No details fetched');
    }
  };
  
  const renderNearbyUsers = () => {
    return nearbyUsers.map((user, index) => (
      <View key={index} style={styles.userBox}>
        <Text style={styles.userName}>{user.name}</Text>
        <Text>{(user.distance / 1000).toFixed(2)} km away</Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => {
              const status = getConnectionStatus(user.id);
              if (status === 'Request Connect') {
                sendConnectionRequest(user.id);
              } else if (status === 'Respond to Request') {
                // Here you could navigate to a screen to accept the request
              }
              // Add logic for messaging if they're already friends
            }}
          >
            <Text style={styles.connectButtonText}>
              {getConnectionStatus(user.id)}
            </Text>
          </TouchableOpacity>
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      {!gymLocation ? (
        // If gymLocation is not set, show the GooglePlacesAutocomplete component
        <GooglePlacesAutocomplete
          placeholder="Search for Gym"
          onPress={handleSelect}
          query={{ key: GOOGLE_API_KEY, components: 'country:uk' }}
          fetchDetails={true}
          onFail={error => console.error(error)}
          onNotFound={() => console.log('No results found')}
          styles={{
            textInputContainer: { width: '90%', alignSelf: 'center' },
            textInput: styles.input,
          }}
        />
      ) : (
        // If gymLocation is set, show the divided screen
        <>
          {/* Upper section for Friends and Incoming Requests */}
          <Text style={styles.gymLocationTitle}>
            Your gym location: {gymLocation && gymLocation.name}
          </Text>
          <View style={styles.upperSection}>
            {/* Friends section */}
            <View style={styles.halfSection}>
              <Text style={styles.columnTitle}>Friends</Text>
              {renderFriends()}
            </View>
            
            {/* Incoming Requests section */}
            <View style={styles.halfSection}>
              <Text style={styles.columnTitle}>Incoming Requests</Text>
              {renderIncomingRequests()}
            </View>
          </View>
  
          {/* Lower section for All Users */}
          <View style={styles.lowerSection}>
            <Text style={styles.columnTitle}>All Users</Text>
            <ScrollView style={styles.usersList}>
              {renderNearbyUsers()}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
};

export default MeetupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gymLocationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
  },
  userBox: {
    backgroundColor: '#f2f2f2',
    padding: 10,
    margin: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  messageButton: {
    marginTop: 10,
    backgroundColor: '#4285F4',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  messageButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  upperSection: {
    flexDirection: 'row',
    flex: 0.5,
  },
  halfSection: {
    flex: 1,
    padding: 10,
  },
  lowerSection: {
    flex: 0.5,
    padding: 10,
  },
  usersList: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    width: '90%',
    alignSelf: 'center',
  },
});