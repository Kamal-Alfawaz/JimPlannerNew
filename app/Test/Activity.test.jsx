import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ActivityScreen from '../screens/ActivityScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc } from 'firebase/firestore';

jest.mock('@react-native-community/datetimepicker', () => {
  const MockDateTimePicker = ({ onChange, testID }) => (
    <button testID={testID} onClick={() => onChange({ type: 'set' }, new Date(2024, 3, 8))}>
      Pick Date
    </button>
  );
  return MockDateTimePicker;
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key, value) => Promise.resolve(value)),
  getItem: jest.fn((key) => Promise.resolve(key === 'testKey' ? 'testValue' : null)),
  removeItem: jest.fn(key => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
};

jest.mock('../../FirebaseConfig', () => ({
  FIREBASE_DB: {},
  FIREBASE_AUTH: {
    currentUser: {
      uid: 'test-uid'
    }
  },
  FIREBASE_STORAGE: {},
}));

const mockExerciseData = {
  exercises: [
    {
      exerciseName: 'Barbell Squat',
      sets: [{ reps: '10', weight: '100' }],
    },
    {
      exerciseName: 'Dumbbell Squat',
      sets: [{ reps: '10', weight: '100' }],
    },
  ],
};

const mockUserData = {
  'User Document ID': {
    email: 'user@example.com',
    dob: 'DD/MM/YYYY',
    gymLocation: {
      address: 'Seymour Leisure Centre, Seymour Place, London, UK',
      lat: '51.5185669',
      lng: '-0.1633712',
      placeId: 'ChIJW6SCWMoadkgRu6IgoaJSars',
    },
    name: 'user1',
    profilePic: 'URL to profile picture',
    UserExercises: {
      '2024-04-08': mockExerciseData,
    },
  },
  };

jest.mock('firebase/firestore', () => ({
  doc: jest.fn().mockImplementation((db, collection, id) => ({
    get: jest.fn(() => Promise.resolve({
      data: () => ({  }),
    })),
    set: jest.fn(() => Promise.resolve()),
  })),
  setDoc: jest.fn((docRef, data, options) => {
    // Check if the data contains 'merge' option, if not add it
    const mergedData = options?.merge ? { ...data, ...docRef.data() } : data;
    return Promise.resolve(mergedData);
  }),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      name: 'John Doe',
      email: 'john@example.com',
      dob: '1990-01-01',
      profilePic: 'url-to-image'
    })
  })),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [
      {
        id: '2024-04-08',
        data: () => ({
          exercises: [
            { exerciseName: 'Barbell Squat', sets: [{ reps: '10', weight: '100' }] },
            { exerciseName: 'Dumbbell Squat', sets: [{ reps: '10', weight: '100' }] },
          ],
        }),
      },
    ],
    forEach: function(callback) {
      this.docs.forEach(doc => callback(doc));
    }
  })),
  collection: jest.fn((path) => ({
    doc: jest.fn((id) => ({
      get: jest.fn(() => Promise.resolve({
        data: () => mockUserData[id] || null,
      })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      collection: jest.fn((subcollectionPath) => ({
        doc: jest.fn((subId) => ({
          get: jest.fn(() => Promise.resolve({
            data: () => mockUserData[id][subcollectionPath][subId] || null,
          })),
          set: jest.fn(() => Promise.resolve()),
          update: jest.fn(() => Promise.resolve()),
          delete: jest.fn(() => Promise.resolve()),
        })),
      })),
    })),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(),
  },
}));

jest.mock('firebase/storage', () => ({
  storage: jest.fn(() => ({
    ref: jest.fn().mockImplementation(() => ({
      putFile: jest.fn(),
      getDownloadURL: jest.fn(() => Promise.resolve('http://example.com/file.jpg')),
    })),
  })),
  ref: jest.fn(() => ({
    putFile: jest.fn(), // Mock this if used elsewhere, not necessary based on your current usage
    getDownloadURL: jest.fn(() => Promise.resolve('http://example.com/file.jpg'))
  })),
  uploadBytes: jest.fn(() => Promise.resolve({
    ref: {
      getDownloadURL: () => Promise.resolve('http://example.com/file.jpg')
    }
  })),
  getDownloadURL: jest.fn(() => Promise.resolve('http://example.com/file.jpg')),
}));

describe('ActivityScreen', () => {
  const setup = () => render(<ActivityScreen navigation={mockNavigation} />);
  
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{ Exercise_Name: 'Push Up' }]));
  });

  it('Checks if list of every exercise from dataset is being rendered', async () => {
    const { getByText, findByText } = setup();

    const dateElement = getByText('29');
    fireEvent.press(dateElement); // Simulate pressing the date

    const modalContent = await findByText('Add Exercise');
    fireEvent.press(modalContent);

    await findByText('Push Up')
  });

  it('renders the user\'s chosen exercises in the first modal after selection from the second modal', async () => {
    const { getByText, findByText } = setup();

    // Simulate selecting a date which opens the first modal
    const dateElement = getByText('29'); // '29' is the button for the date
    fireEvent.press(dateElement);

    // Opening the second modal
    const addExerciseButton = await findByText('Add Exercise');
    fireEvent.press(addExerciseButton);

    // Simulate selecting an exercise from the second modal
    const exerciseToSelect = await findByText('Push Up');
    fireEvent.press(exerciseToSelect);

    // Simulate pressing the 'Done' button on the second modal
    const doneButton = getByText('Done');
    fireEvent.press(doneButton);

    // Check if the first modal now includes the chosen exercise
    const chosenExerciseDisplay = await findByText('Push Up');
    expect(chosenExerciseDisplay).toBeTruthy();
  });
  
  it('allows user to add sets for an exercise, saves them to Firestore, and displays them on the main page', async () => {
    const { getByText, findByText, getByPlaceholderText } = setup();

    // Simulate selecting a date which opens the first modal
    const dateElement = getByText('29'); // '29' is the button for the date
    fireEvent.press(dateElement);

    // Opening the second modal
    const addExerciseButton = await findByText('Add Exercise');
    fireEvent.press(addExerciseButton);

    // Simulate selecting an exercise from the second modal
    const exerciseToSelect = await findByText('Push Up');
    fireEvent.press(exerciseToSelect);

    // Simulate pressing the 'Done' button on the second modal
    const doneButton = getByText('Done');
    fireEvent.press(doneButton);

    // Check if the first modal now includes the chosen exercise
    const chosenExerciseDisplay = await findByText('Push Up');
    expect(chosenExerciseDisplay).toBeTruthy();

    // "Add Set" button opens fields for reps and weight
    const addSetButton = await findByText('Add Set');
    fireEvent.press(addSetButton);

    // Input for reps and weight
    const repsInput = getByPlaceholderText('Reps');
    const weightInput = getByPlaceholderText('Weight');

    fireEvent.changeText(repsInput, '10');
    fireEvent.changeText(weightInput, '100');

    //"Save" button to finalize the addition
    const saveButton = getByText('Save');
    fireEvent.press(saveButton);

    // Verifying Firestore call
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(), 
      {
        exercises: [
          { exerciseName: 'Push Up', sets: [{ reps: '10', weight: '100' }] },
        ]
      },
      { merge: true }
    );
    // Verifying that the exercise is displayed
    await findByText('Push Up');
  });
});