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
  
  const firestore = () => ({
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
  });
  
  export default firestore;  