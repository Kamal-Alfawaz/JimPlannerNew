import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Button, Image } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { doc, setDoc, getDoc, getDocs, collection, writeBatch, arrayUnion, query, where } from 'firebase/firestore';
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
      // Fetch all users from Firestore
      const usersSnapshot = await getDocs(collection(FIREBASE_DB, 'Users'));
      const usersData = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        profilePic: doc.data().profilePic || null,
      }));
  
      // Filter out the current user and ensure the user has a valid gym location
      const validUsers = usersData.filter(
        (user) =>
          user.gymLocation &&
          typeof user.gymLocation.lat === 'number' &&
          typeof user.gymLocation.lng === 'number' &&
          user.id !== FIREBASE_AUTH.currentUser.uid
      );
  
      // Assuming gymLocation is already set and valid
      if (gymLocation && typeof gymLocation.lat === 'number' && typeof gymLocation.lng === 'number') {
        // Map to include distance in each user's data
        const usersWithDistance = validUsers.map((user) => ({
          ...user,
          distance: getDistance(
            { latitude: gymLocation.lat, longitude: gymLocation.lng },
            { latitude: user.gymLocation.lat, longitude: user.gymLocation.lng }
          ) / 1000, // Convert meters to kilometers
        }));
  
        // Order users by distance from the current user's gym location
        const sortedUsers = usersWithDistance.sort((a, b) => a.distance - b.distance);
  
        // Update state with the processed list of users
        setNearbyUsers(sortedUsers);
      }
    };
  
    // Call fetchUsersLocations if gymLocation and friends state are properly set
    if (
      gymLocation &&
      typeof gymLocation.lat === 'number' &&
      typeof gymLocation.lng === 'number' &&
      Array.isArray(friends)
    ) {
      fetchUsersLocations();
    }
  }, [gymLocation, friends]); // Dependencies: Re-fetch when gymLocation or friends state changes  
  

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
              name: friendSnap.data().name,
              profilePic: friendSnap.data().profilePic || null,
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

  useEffect(() => {
    // This function retrieves a list of chat rooms that the current user is a participant in
    const fetchChatRooms = async () => {
      // Get the current user's ID from the Firebase authentication object
      const userId = FIREBASE_AUTH.currentUser.uid;

      // Define a query to retrieve all chat rooms where the current user is a participant
      const chatRoomsQuery = query(
        collection(FIREBASE_DB, 'ChatRooms'),
        where('participants', 'array-contains', userId)
      );
      // Execute the query and retrieve the chat rooms that match the query
      const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
      
      const friendIds = chatRoomsSnapshot.docs.flatMap(doc => doc.data().participants.filter(id => id !== userId));

      // Map over the array of user IDs and retrieve the details of each user from the Firebase database
      const friendsDetails = await Promise.all(friendIds.map(async (friendId) => {
        const friendRef = doc(FIREBASE_DB, 'Users', friendId);
        const friendSnap = await getDoc(friendRef);
        return friendSnap.exists() ? {
          id: friendId,
          name: friendSnap.data().name,
          profilePic: friendSnap.data().profilePic || null,
        } : null;
      }));

      // Set the state of the component to include the details of the current user's friends
      setFriends(friendsDetails.filter(Boolean));
    };
  
    fetchChatRooms();
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

    const toUserRequestRef = doc(FIREBASE_DB, `Users/${toUserId}/connectionRequests`, fromUserId);

    try {
      await setDoc(toUserRequestRef, {
        from: fromUserId,
        name: FIREBASE_AUTH.currentUser.displayName, // Get the current user's name
        status: 'pending'
      });
      console.log('Connection request sent successfully.');

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
  
      // Create a unique ID for the chat room based on the user IDs
      const chatRoomId = [userId, requesterId].sort().join('_');
  
      // Create a reference for the new chat room
      const chatRoomRef = doc(FIREBASE_DB, 'ChatRooms', chatRoomId);
      // Add the chat room document with both users as participants
      batch.set(chatRoomRef, {
        participants: [userId, requesterId],
        createdAt: new Date()
      });
  
      // Update the connection request status to 'accepted' by deleting it
      const requestRef = doc(FIREBASE_DB, `Users/${userId}/connectionRequests`, requesterId);
      batch.delete(requestRef);
  
      // Add the requester to the current user's friends list
      const userRef = doc(FIREBASE_DB, 'Users', userId);
      batch.update(userRef, {
        friends: arrayUnion(requesterId)
      });
  
      // Commit the batched write
      await batch.commit();
  
      // Update the local state
      setFriends(prevFriends => [...prevFriends, requesterId]);
      setConnectionRequestsReceived(prevRequests =>
        prevRequests.filter(request => request.id !== requesterId)
      );
  
      console.log('Connection request accepted and chat room created successfully.');
    } catch (error) {
      console.error('Error accepting connection request and creating chat room: ', error);
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
    console.log('Selected data:', data);
    console.log('Selected details:', details);
  
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
        <Text>{user.distance} km away</Text>
        <TouchableOpacity
          style={styles.connectButton}
          onPress={() => {
            const status = getConnectionStatus(user.id);
            if (status === 'Request Connect') {
              sendConnectionRequest(user.id);
            } else if (status === 'Respond to Request') {
            }
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
    borderRadius: 30,
    marginRight: 10,
  },
});