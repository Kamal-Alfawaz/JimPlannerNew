import React, { useState, useEffect, useCallback } from 'react';
import { View, Button, Modal, StyleSheet, TouchableOpacity, Text, ScrollView, TextInput } from 'react-native';
import CalendarStrip from 'react-native-calendar-strip';
import ExerciseItem from './ExerciseItem';
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
  const [searchQuery, setSearchQuery] = useState('');

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
    // Filter exercises based on the search query before rendering
    const filteredExercises = Object.keys(exercises).reduce((acc, letter) => {
      const filteredBySearch = exercises[letter].filter(exercise =>
        exercise.Exercise_Name.toLowerCase().includes(searchQuery.toLowerCase())
      );
  
      if (filteredBySearch.length > 0) {
        acc[letter] = filteredBySearch;
      }
  
      return acc;
    }, {});
  
    return Object.keys(filteredExercises).sort().map((letter) => (
      <View key={letter}>
        <Text style={{ fontWeight: 'bold', fontSize: 18 }}>{letter}</Text>
        {filteredExercises[letter].map((exercise, index) => (
          <ExerciseItem
            key={index}
            exerciseName={exercise.Exercise_Name}
            isSelected={selectedExercises.includes(exercise.Exercise_Name)}
            onSelect={handleSelectExercise}
          />
        ))}
      </View>
    ));
  };

  const handleSelectExercise = useCallback((exerciseName) => {
    setSelectedExercises(prev => {
      if (prev.includes(exerciseName)) {
        return prev.filter(name => name !== exerciseName); // Unselect
      } else {
        return [...prev, exerciseName]; // Select
      }
    });
  }, []);

  // Function to store selected exercises
  const storeSelectedExercises = async () => {
    if (selectedExercises.length > 0) {
      const dateId = selectedDate.toISOString().split('T')[0]; // Converts the date to 'YYYY-MM-DD' format
      const userExercisesRef = doc(db, "Users", userId, "UserExercises", dateId);
  
      // Example exercise data structure
      const exercisesToStore = selectedExercises.map(exerciseName => ({
        exerciseName,
        sets: [] // Initially empty, sets can be added later
      }));
  
      await setDoc(userExercisesRef, {
        date: selectedDate,
        exercises: exercisesToStore,
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

  const handleDoneButton = () => {
    // Map selectedExercises to userExercises structure
    const updatedUserExercises = selectedExercises.map(exerciseName => {
      // Find if the exercise already exists in userExercises to preserve its sets if any
      const existingExercise = userExercises.find(ex => ex.exerciseName === exerciseName);
      return existingExercise || { exerciseName, sets: [] }; // Keep existing sets or start with empty
    });
  
    setUserExercises(updatedUserExercises);
    setExerciseModalVisible(false); // Close the modal
  };
  

  const fetchUserExercises = async (date) => {
    if (date) {
      const dateId = date.toISOString().split('T')[0];
      const userExercisesRef = doc(db, "Users", userId, "UserExercises", dateId);
  
      try {
        const docSnap = await getDoc(userExercisesRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserExercises(data.exercises || []); // Safely fallback to an empty array if no exercises
        } else {
          setUserExercises([]); // Handle no exercises found for this date
        }
      } catch (error) {
        console.error("Error fetching user exercises: ", error);
        setUserExercises([]); // Reset or handle error
      }
    }
  };
  
  const renderUserExercisesInModal = () => {
    return userExercises.map((exercise, exerciseIndex) => (
      <View key={exerciseIndex} style={styles.exerciseContainer}>
        <Text style={{ fontWeight: 'bold', fontSize: 20, textAlign: 'center' }}>{exercise.exerciseName}</Text>
        {exercise.sets.map((set, setIndex) => (
          <View key={setIndex} style={styles.setRow}>
            <Text style={{ fontWeight: 'bold', fontSize: 18, marginRight: 10 }}>{setIndex + 1}</Text>
            <View style={styles.inputExercisesContainer}>
              <Text>Reps</Text>
              <TextInput
                style={styles.inputExercises}
                placeholder="Reps"
                value={set.reps}
                keyboardType="numeric"
                onChangeText={(text) => handleSetChange(exercise.exerciseName, setIndex, 'reps', text)}
              />
            </View>
            <View style={styles.inputExercisesContainer}>
              <Text>Weight</Text>
              <TextInput
                style={styles.inputExercises}
                placeholder="Weight"
                value={set.weight}
                keyboardType="numeric"
                onChangeText={(text) => handleSetChange(exercise.exerciseName, setIndex, 'weight', text)}
              />
            </View>
          </View>
        ))}
        <Button title="Add Set" onPress={() => handleAddSet(exercise.exerciseName)} />
      </View>
    ));
  };

  const handleAddSet = (exerciseName) => {
    console.log(`Adding set to ${exerciseName}`);
    setUserExercises((prevExercises) =>
      prevExercises.map((exercise) => {
        // Change here from exercise.name to exercise.exerciseName
        if (exercise.exerciseName === exerciseName) {
          console.log(`Found exercise, adding set: `, exercise);
          return { ...exercise, sets: [...exercise.sets, { reps: '', weight: '' }] };
        }
        return exercise;
      })
    );
  };
  
  const handleSetChange = (exerciseName, setIndex, field, value) => {
    setUserExercises((prevExercises) => prevExercises.map((exercise) => {
        // Change here from exercise.name to exercise.exerciseName
        if (exercise.exerciseName === exerciseName) {
            const updatedSets = exercise.sets.map((set, index) => {
                if (index === setIndex) {
                    return { ...set, [field]: value };
                }
                return set;
            });
            return { ...exercise, sets: updatedSets };
        }
        return exercise;
    }));
  };

  const saveExercisesToFirestore = async () => {
    const dateId = selectedDate.toISOString().split('T')[0]; // Format as 'YYYY-MM-DD'
    const userExercisesRef = doc(db, "Users", userId, "UserExercises", dateId);
  
    try {
      await setDoc(userExercisesRef, {
        date: selectedDate,
        exercises: userExercises
      }, { merge: true }); // merge: true to update existing document or create a new one if it doesn't exist
      console.log("Exercises saved successfully");
    } catch (error) {
      console.error("Error saving exercises to Firestore:", error);
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
          <View style={styles.modalView}>
            <ScrollView contentContainerStyle={styles.modalContentContainer}>
              <Text style={styles.modalText}>Exercises for {selectedDate.toDateString()}</Text>
              {/* Place renderUserExercises function call here to display the exercises and their details */}
              {renderUserExercisesInModal()}
            </ScrollView>
            <View style={{ paddingHorizontal: 10, paddingBottom: 10 }}>
              <Button title="Add Exercise" onPress={() => {
                const currentSelectedExerciseNames = userExercises.map(exercise => exercise.exerciseName);
                setSelectedExercises(currentSelectedExerciseNames);
                setExerciseModalVisible(true);
              }} />
              <Button title="Done" onPress={async () => {
                await saveExercisesToFirestore();
                setModalVisible(!modalVisible);
              }} />
            </View>
          </View>
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
            <TextInput
              style={styles.searchBar}
              placeholder="Search for an exercise"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
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
  searchBar: {
    fontSize: 16,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputExercisesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  inputExercises: {
    borderWidth: 1,
    borderColor: 'lightgrey',
    padding: 8,
    width: 60,
    marginLeft: 5,
  },
});