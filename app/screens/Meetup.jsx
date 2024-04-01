import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Button, Image } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, arrayUnion } from 'firebase/firestore';
import { orderByDistance, getDistance } from 'geolib';
import { GOOGLE_API_KEY } from '../../EnvironmentalVar/enviro';
import defaultProfilePic from '../../assets/defaultProfilePic.png';

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
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          profilePic: doc.data().profilePic || null,
        }))
        .filter(
          user =>
            user.gymLocation &&
            user.gymLocation.lat !== undefined &&
            user.gymLocation.lng !== undefined &&
            user.id !== FIREBASE_AUTH.currentUser.uid
        )
        .filter(user => !friends.some(friend => friend.id === user.id));
    
      if (gymLocation && gymLocation.lat !== undefined && gymLocation.lng !== undefined) {
        const sortedUsers = orderByDistance(
          {
            latitude: gymLocation.lat,
            longitude: gymLocation.lng,
          },
          usersLocations.filter(user => user.lat !== undefined && user.lng !== undefined)
        );
    
        const usersWithDistance = sortedUsers.map(user => ({
          name: user.name,
          distance: getDistance(
            { latitude: gymLocation.lat, longitude: gymLocation.lng },
            { latitude: user.lat, longitude: user.lng }
          ) / 1000,
          id: user.id,
          profilePic: user.profilePic,
        }));
    
        setNearbyUsers(usersWithDistance);
      }
    };

    if (gymLocation && friends) { // Make sure to run this effect when friends state is updated too
      fetchUsersLocations();
    }
  }, [gymLocation, friends]); // Add friends to the dependency array

  useEffect(() => {
    const fetchConnections = async () => {
      const userId = FIREBASE_AUTH.currentUser.uid;

      const userRef = doc(FIREBASE_DB, 'Users', userId);
      const userSnapshot = await getDoc(userRef);

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        if (userData.gymLocation) {
          setGymLocation(userData.gymLocation);
        }

        // Fetching details for each friend
        if (Array.isArray(userData.friends) && userData.friends.length > 0) {
          const friendsDetails = await Promise.all(userData.friends.map(async (friendId) => {
            const friendRef = doc(FIREBASE_DB, 'Users', friendId);
            const friendSnap = await getDoc(friendRef);
            return friendSnap.exists() ? {
              id: friendId,
              name: friendSnap.data().name, // Assuming the friend's name is stored in 'name'
              profilePic: friendSnap.data().profilePic || null, // Include the profile picture URL
            } : null;
          }));

          // Filter out any null values if a friend's document didn't exist
          setFriends(friendsDetails.filter(Boolean));
        } else {
          setFriends([]); // Ensure friends is an empty array if there are no friends
        }

        // Fetch connection requests received by the user
        const requestsRef = collection(FIREBASE_DB, `Users/${userId}/connectionRequests`);
        const requestsSnapshot = await getDocs(requestsRef);
        const requestsWithNamesAndPics = await Promise.all(requestsSnapshot.docs.map(async (requestDoc) => {
          const requesterId = requestDoc.id;
          const requesterRef = doc(FIREBASE_DB, 'Users', requesterId);
          const requesterSnap = await getDoc(requesterRef);
          return {
            id: requesterId,
            name: requesterSnap.exists() ? requesterSnap.data().name : "Unknown",
            profilePic: requesterSnap.exists() ? requesterSnap.data().profilePic : null, // Fetch the profilePic URL
            status: requestDoc.data().status,
          };
        }));

        setConnectionRequestsReceived(requestsWithNamesAndPics);

        // Fetch connection requests sent by the user
        const sentRequestsRef = collection(FIREBASE_DB, `Users/${userId}/sentConnectionRequests`);
        const sentRequestsSnapshot = await getDocs(sentRequestsRef);
        setConnectionRequestsSent(sentRequestsSnapshot.docs.map(doc => doc.id));
      }
      setIsLocationLoaded(true);
    };

    fetchConnections();
  }, []);

  const renderFriends = () => {
    return friends.map((friend, index) => (
      <View key={index} style={styles.userBox}>
        <Image
          source={friend.profilePic ? { uri: friend.profilePic } : defaultProfilePic}
          style={styles.profilePic}
        />
        <Text style={styles.userName}>{friend.name}</Text>
        <TouchableOpacity
          style={styles.messageButton}
          onPress={() => navigation.navigate('ChatScreen', { friendId: friend.id })} // Assuming 'ChatScreen' is the route name
        >
          <Text style={styles.messageButtonText}>Message</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  const renderIncomingRequests = () => {
    return connectionRequestsReceived.map((request, index) => (
      <View key={index} style={styles.userBox}>
        <Image
          source={request.profilePic ? { uri: request.profilePic } : defaultProfilePic}
          style={styles.profilePic}
        />
        <Text style={styles.userName}>{request.name}</Text>
        <TouchableOpacity onPress={() => acceptConnectionRequest(request.id)}>
          <Text style={styles.connectButtonText}>Accept</Text>
        </TouchableOpacity>
        {/* Possibly add a decline button or other actions */}
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
    const toUserRequestRef = doc(FIREBASE_DB, `Users/${toUserId}/connectionRequests`, fromUserId);

    try {
      await setDoc(toUserRequestRef, {
        from: fromUserId,
        name: FIREBASE_AUTH.currentUser.displayName, // or another way to get the current user's name
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

  const acceptConnectionRequest = async (requesterId) => {
    const userId = FIREBASE_AUTH.currentUser.uid;

    try {
      // Begin a batched write to perform multiple operations atomically
      const batch = writeBatch(FIREBASE_DB);

      // Update the connection request status to 'accepted'
      const requestRef = doc(FIREBASE_DB, `Users/${userId}/connectionRequests`, requesterId);
      batch.update(requestRef, { status: 'accepted' });

      // remove the request from the connectionRequests subcollection
      batch.delete(requestRef);

      // Add the requester to the current user's friends list
      // Note: This assumes you have a field 'friends' which is an array of user IDs
      const userRef = doc(FIREBASE_DB, 'Users', userId);
      batch.update(userRef, {
        friends: arrayUnion(requesterId)
      });

      // Commit the batched write
      await batch.commit();

      // Remove the accepted request from the connectionRequestsReceived state
      setConnectionRequestsReceived(prevRequests =>
        prevRequests.filter(request => request.id !== requesterId)
      );

      // Add the requester to the friends state
      setFriends(prevFriends => [...prevFriends, requesterId]);

      console.log('Connection request accepted successfully.');
    } catch (error) {
      console.error('Error accepting connection request: ', error);
    }
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
        <Image
          source={user.profilePic ? { uri: user.profilePic } : defaultProfilePic}
          style={styles.profilePic}
        />
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
          <Text style={styles.connectButtonText}>{getConnectionStatus(user.id)}</Text>
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
          <Text style={styles.gymLocationTitle}>
            Your gym location: {gymLocation && gymLocation.name}
          </Text>
          <View style={styles.upperSection}>
            {/* Friends section */}
            <View style={[styles.halfSection, { overflow: 'hidden' }]}>
              <Text style={styles.columnTitle}>Friends</Text>
              <ScrollView style={{ flex: 1 }}>
                {renderFriends()}
              </ScrollView>
            </View>

            {/* Incoming Requests section */}
            <View style={[styles.halfSection, { overflow: 'hidden' }]}>
              <Text style={styles.columnTitle}>Incoming Requests</Text>
              <ScrollView style={{ flex: 1 }}>
                {renderIncomingRequests()}
              </ScrollView>
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
    fontSize: 20,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  profilePic: {
    width: 60,
    height: 60,
    borderRadius: 30, // Make it circular
    marginRight: 10,
  },
});