import { View, Text, Button} from 'react-native'
import React from 'react'
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import CalendarStrip from 'react-native-calendar-strip';

const List = ({ navigation }) => {
  return (
    <View>
      <CalendarStrip 
        scrollable
        style={{height:140, paddingTop: 20, paddingBottom: 10}}
        calendarColor={'white'}
        calendarHeaderStyle={{color: 'black'}}
        dateNumberStyle={{color: 'black'}}
        dateNameStyle={{color: 'black'}}
        iconContainer={{flex: 0.1}}
      />
      <Button onPress={() => navigation.navigate('Details')} title="Open Details" />
      <Button onPress={() => FIREBASE_AUTH.signOut()} title="Logout" />
    </View>
  )
}

export default List