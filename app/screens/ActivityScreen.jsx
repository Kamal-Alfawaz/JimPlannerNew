import React, { useState, useEffect } from 'react';
import { View, Button, Modal, StyleSheet, TouchableOpacity, Text, ScrollView } from 'react-native';
import CalendarStrip from 'react-native-calendar-strip';
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig';
import { collection, getDocs, query, orderBy, doc, setDoc, getDoc} from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ActivityScreen = ({ navigation }) => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [exercises, setExercises] = useState([]);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [userExercises, setUserExercises] = useState([]);
  const db = FIREBASE_DB;
  const userId = FIREBASE_AUTH.currentUser.uid; // Example to get the current user's ID

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        // Try to fetch the cached exercises data
        const cachedExercises = await AsyncStorage.getItem('exercises');
        if (cachedExercises !== null) {
          console.log("Loading exercises from cache");
          // Data found in cache, parse the JSON string to an object
          const exercisesData = JSON.parse(cachedExercises);
          setExercises(groupExercises(exercisesData));
        } else {
          console.log("Fetching exercises from Firestore");
          // No data in cache, fetch from Firestore
          const querySnapshot = await getDocs(query(collection(db, "Exercises"), orderBy("Exercise_Name")));
          const exercisesData = [];
          querySnapshot.forEach((doc) => {
            exercisesData.push(doc.data());
          });
          // Cache the fetched data
          await AsyncStorage.setItem('exercises', JSON.stringify(exercisesData));
          // Sort and group exercises
          setExercises(groupExercises(exercisesData));
        }
      } catch (error) {
        console.error("Failed to fetch or cache exercises:", error);
      }
    };
    fetchExercises();
  }, []);

  useEffect(() => {
    if (modalVisible) {
      fetchUserExercises();
    }
  }, [modalVisible]);

  const groupExercises = (exercises) => {
    const grouped = {};
    exercises.forEach((exercise) => {
      const firstLetter = exercise.Exercise_Name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [exercise];
      } else {
        grouped[firstLetter].push(exercise);
      }
    });
    return grouped;
  };

  const renderExercises = () => {
    return Object.keys(exercises).sort().map((letter) => (
      <View key={letter}>
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{letter}</Text>
        {exercises[letter].map((exercise, index) => (
          <TouchableOpacity
            key={index}
            style={{
              backgroundColor: selectedExercises.includes(exercise.Exercise_Name) ? '#ddd' : '#fff',
              padding: 10,
              marginVertical: 2,
            }}
            onPress={() => handleSelectExercise(exercise.Exercise_Name)}>
            <Text>{exercise.Exercise_Name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    ));
  };

  const handleSelectExercise = (exerciseName) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseName)) {
        return prev.filter(name => name !== exerciseName); // Unselect
      } else {
        return [...prev, exerciseName]; // Select
      }
    });
  };

  // Function to store selected exercises
  const storeSelectedExercises = async () => {
    if (selectedExercises.length > 0) {
      // Format the selectedDate to a string that can be used as a document ID
      const dateId = selectedDate.toISOString().split('T')[0]; // Converts the date to 'YYYY-MM-DD' format
  
      const userExercisesRef = doc(db, "Users", userId, "UserExercises", dateId);
      await setDoc(userExercisesRef, {
        date: selectedDate,
        exercises: selectedExercises,
      }, { merge: true }); // Using merge: true to update the document if it exists or create a new one if it doesn't
  
      // Reset selected exercises after storing
      setSelectedExercises([]);
      // Close the modal and optionally refresh the exercises display
      setExerciseModalVisible(false);
      fetchUserExercises(); // Refresh the list to show the latest exercises
    }
  };

  const onDateChange = (event, newSelectedDate) => {
    setDatePickerVisible(false);
    if (event.type !== 'dismissed' && newSelectedDate) {
      setSelectedDate(newSelectedDate); // Ensure this is before the fetch call
      fetchUserExercises(newSelectedDate); // Fetch exercises for the newly selected date
      setModalVisible(true);
    }
  };

  const handleDoneButton = async () => {
    await storeSelectedExercises(); // Store the selected exercises
    await fetchUserExercises(selectedDate);
    setExerciseModalVisible(false); // Close the modal after storing
  };

  const fetchUserExercises = async (date) => {
    if (date) {
      const dateId = date.toISOString().split('T')[0]; // Safely format the date
      const userExercisesRef = doc(db, "Users", userId, "UserExercises", dateId);
  
      try {
        const docSnap = await getDoc(userExercisesRef);
        if (docSnap.exists()) {
          setUserExercises(docSnap.data().exercises); // Set the exercises for the selected date
        } else {
          setUserExercises([]); // Handle no exercises found for this date
        }
      } catch (error) {
        console.error("Error fetching user exercises: ", error);
        setUserExercises([]); // Reset or handle error
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <CalendarStrip
        scrollable
        style={{ height: 140, paddingTop: 20, paddingBottom: 10 }}
        calendarColor={'#FFF'}
        calendarHeaderStyle={{ color: '#000' }}
        dateNumberStyle={{ color: '#000' }}
        dateNameStyle={{ color: '#000' }}
        iconContainer={{ flex: 0.1 }}
      />
      <Button onPress={() => navigation.navigate('Details')} title="Open Details" />
      <Button onPress={() => FIREBASE_AUTH.signOut()} title="Logout" />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setDatePickerVisible(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {datePickerVisible && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          maximumDate={new Date(2300, 10, 20)}
          minimumDate={new Date(1950, 0, 1)}
        />
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}>
        <View style={styles.centeredView}>
          <ScrollView style={styles.modalView} contentContainerStyle={styles.modalContentContainer}>
            <Text style={styles.modalText}>Exercises for {selectedDate.toDateString()}</Text>
            {userExercises.length > 0 ? (
              userExercises.map((exercise, index) => (
                <Text key={index} style={styles.exerciseText}>{exercise}</Text>
              ))
            ) : (
              <Text>No exercises added for this date.</Text>
            )}
            <Button title="Add Exercise" onPress={() => setExerciseModalVisible(true)} />
            <Button title="Close" onPress={() => setModalVisible(!modalVisible)} />
          </ScrollView>
        </View>
      </Modal>

      {/* Second Modal for Exercise Selection */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseModalVisible}
        onRequestClose={() => {
          setExerciseModalVisible(!exerciseModalVisible);
        }}>
        <View style={styles.centeredView}>
          <View style={styles.ExercisesModalView}>
            <Text style={styles.modalText}>Select an Exercise</Text>
              <ScrollView>
                {renderExercises()}
              </ScrollView>
            <Button title="Done" onPress={handleDoneButton} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ActivityScreen;

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 20,
    backgroundColor: '#03A9F4',
    borderRadius: 28,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
    color: 'white',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  ExercisesModalView:{
    margin: 20,
    backgroundColor: 'white',
    padding: 35,
    elevation: 5,
    width: '100%',
    height: '100%',
  },
  modalContentContainer: {
    alignItems: 'center',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  exerciseContainer: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexInput: {
    width: '48%',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
});