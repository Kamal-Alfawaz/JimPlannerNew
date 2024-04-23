import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './app/screens/Login';
import ActivityScreen from './app/screens/ActivityScreen';
import Details from './app/screens/Details';
import SignUp from './app/screens/SignUp';
import Meetup from './app/screens/Meetup';
import ChatScreen from './app/screens/ChatScreen';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { FIREBASE_AUTH } from './FirebaseConfig';

const Stack = createNativeStackNavigator();

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(FIREBASE_AUTH, (currentUser) => {
      console.log('user', currentUser);
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {user ? (
          // Authenticated flow
          <>
            <Stack.Screen name="My Todos" component={ActivityScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Details" component={Details} />
            <Stack.Screen name="Meetup" component={Meetup} />
            <Stack.Screen name="ChatScreen" component={ChatScreen}/>
          </>
        ) : (
          // Unauthenticated flow
          <>
            <Stack.Screen name="Login" component={Login} options={{ headerShown: false }} />
            <Stack.Screen name="SignUp" component={SignUp} options={{ headerShown: true }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
