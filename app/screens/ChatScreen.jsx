import React, { useState, useEffect } from 'react';
import {  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, StatusBar,} from 'react-native';
import { FIREBASE_DB, FIREBASE_AUTH } from '../../FirebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

const ChatScreen = ({ route }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { friendId } = route.params;
  const userId = FIREBASE_AUTH.currentUser.uid;
  const flatListRef = React.useRef(null);

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);  

  useEffect(() => {
    const chatRoomId = getChatRoomId(userId, friendId);
    const messagesRef = collection(FIREBASE_DB, 'ChatRooms', chatRoomId, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
      const messagesData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Convert timestamp to JavaScript Date object
        data.createdAt = data.createdAt ? data.createdAt.toDate() : new Date();
        messagesData.push({ id: doc.id, ...data });
      });
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [userId, friendId]);

  const getChatRoomId = (userId, friendId) => {
    return [userId, friendId].sort().join('_');
  };

  const sendMessage = async () => {
    if (newMessage.trim() === '') return;

    const chatRoomId = getChatRoomId(userId, friendId);
    const messagesRef = collection(FIREBASE_DB, 'ChatRooms', chatRoomId, 'messages');

    try {
      await addDoc(messagesRef, {
        text: newMessage,
        senderId: userId,
        createdAt: new Date(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Helper function to format the date
  const formatDate = (date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  // Custom renderItem function
  const renderMessageItem = ({ item }) => {
    const isMyMessage = item.senderId === userId;
    const formattedTime = formatDate(item.createdAt);
    
    return (
      <View style={[styles.messageContainer, isMyMessage ? styles.myMessage : styles.friendMessage]}>
        <View style={[styles.messageBubble, isMyMessage ? styles.myMessage : styles.friendMessage]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : {}]}>
            {item.text}
          </Text>
          <Text style={styles.messageTime}>
            {formattedTime}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
      />
      <View style={styles.textInputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: StatusBar.currentHeight || 0, // This adds a space at the top for the status bar
    },
    header: {
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
    },
    headerText: {
        fontWeight: 'bold',
    },
    messageContainer: {
        flexDirection: 'row',
        marginVertical: 4,
        justifyContent: 'flex-end',
    },
    friendMessageContainer: {
        flexDirection: 'row',
        marginVertical: 4,
        justifyContent: 'flex-start',
    },
    messageBubble: {
        borderRadius: 20,
        padding: 12,
        maxWidth: '80%',
    },
    myMessage: {
        backgroundColor: '#007AFF',
        marginRight: 8,
        alignSelf: 'flex-end',
    },
    friendMessage: {
        backgroundColor: '#fff',
        marginLeft: 8,
        alignSelf: 'flex-start',
    },
    textInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderColor: 'gray',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: 'gray',
        padding: 8,
    },
    sendButton: {
        padding: 8,
    },
    messageText: {
        color: 'black',
    },
    myMessageText: {
        color: 'white',
    },
    messageTime: {
        fontSize: 13,
        color: 'black',
        alignSelf: 'flex-end',
        marginTop: 4,
      },
});  