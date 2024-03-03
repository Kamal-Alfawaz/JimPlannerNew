import React, { useState } from 'react';
import { View, Button, Modal, StyleSheet, TouchableOpacity, Text, ScrollView, Platform } from 'react-native';
import CalendarStrip from 'react-native-calendar-strip';
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import DateTimePicker from '@react-native-community/datetimepicker';

const ActivityScreen = ({ navigation }) => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);

  const onDateChange = (event, selectedDate) => {
    setDatePickerVisible(false);
    if (event.type !== 'dismissed') {
        const currentDate = selectedDate || new Date();
        setSelectedDate(currentDate);
        setModalVisible(true);
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
            <Text style={styles.modalText}>Add Exercise for {selectedDate.toDateString()}</Text>
            <Button title="Add Exercise" onPress={() => navigation.navigate('ExerciseSelection')} />
            <Button title="Close" onPress={() => setModalVisible(!modalVisible)} />
          </ScrollView>
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