import { View, Text , Button} from 'react-native'
import React from 'react'
import { FIREBASE_AUTH } from '../../FirebaseConfig';

const List = ({ navigation }) => {
  return (
    <View>
      <Button onPress={() => navigation.navigate('Details')} title="Open Details" />
      <Button onPress={() => FIREBASE_AUTH.signOut()} title="Logout" />
    </View>
  )
}

export default List