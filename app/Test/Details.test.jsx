import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import Details from '../screens/Details';
import { LineChart } from 'react-native-chart-kit';
import { storage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Mock the modules
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    uri: 'https://example.com/path/to/image'
  })),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: jest.fn(() => null) // Mock LineChart to prevent it from rendering but capture calls
}));

jest.mock('../../FirebaseConfig', () => ({
  FIREBASE_DB: {},
  FIREBASE_AUTH: {
    currentUser: {
      uid: 'test-uid'
    }
  },
  FIREBASE_STORAGE: {},
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({
    canceled: false,
    uri: 'https://example.com/path/to/image'
  })),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

jest.mock('react-native-chart-kit', () => ({
  LineChart: jest.fn(() => null) // Mock LineChart to prevent it from rendering
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
      data: () => ({ /* mock data */ }),
    })),
    set: jest.fn(() => Promise.resolve()),
  })),
  setDoc: jest.fn().mockResolvedValue(),
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
            { exerciseName: 'Dumbbell Squat', sets: [{ reps: '10', weight: '102' }] },
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


describe('Details Component', () => {
  it('renders user info correctly after loading', async () => {
    const mockGetDoc = require('firebase/firestore').getDoc;
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        name: 'John Doe',
        email: 'john@example.com',
        dob: '1990-01-01',
        profilePic: 'url-to-image'
      }),
    });

    const { findByText } = render(<Details />);

    expect(await findByText('Name: John Doe')).toBeTruthy();
    expect(await findByText('Email: john@example.com')).toBeTruthy();
    expect(await findByText('Date of Birth: 1990-01-01')).toBeTruthy();
  });

  it('handles image picking and uploading correctly', async () => {
    const { getByTestId, queryByTestId } = render(<Details />);

    await waitFor(() => {
      expect(queryByTestId('ActivityIndicator')).toBeNull();
    });

    const imagePickerButton = getByTestId('imagePickerButton');
    
    fireEvent.press(imagePickerButton); // Simulate pressing the image picker button
    
    await waitFor(() => {
      expect(jest.requireMock('expo-image-picker').launchImageLibraryAsync).toHaveBeenCalled();
      expect(uploadBytes).toHaveBeenCalled();
      expect(getDownloadURL).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('passes correct data to LineChart when rendering graphs', async () => {
    render(<Details />);
  
    await waitFor(() => {
      expect(LineChart).toHaveBeenCalled();
    });
  
    const lastCall = LineChart.mock.calls[LineChart.mock.calls.length - 1];
    const datasets = lastCall[0].data.datasets;
  
    // Ensure there is data to check
    expect(datasets.length).toBeGreaterThan(0);
    expect(datasets[0].data.length).toBeGreaterThan(0); // Ensure there is at least one data point
  
    // Check specific data points
    expect(datasets[0].data).toEqual(expect.arrayContaining([100])); // Check for specific data values
  });
  
});
