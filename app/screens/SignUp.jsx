import { View, Text, StyleSheet, TextInput, Button, KeyboardAvoidingView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import React, { useState } from 'react';
import { FIREBASE_AUTH, FIREBASE_DB, FIREBASE_STORAGE } from '../../FirebaseConfig';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import defaultProfilePic from '../../assets/defaultProfilePic.png';
import * as ImagePicker from 'expo-image-picker';

const SignUp = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dob, setDob] = useState('');
    const [profilePic, setProfilePic] = useState(null);
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;
    const db = FIREBASE_DB;

    const pickImage = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setProfilePic(result.uri);
        }
    };

    const formatDOB = (text) => {
        let formattedText = text.replace(/\D/g, '').substring(0, 8);
        formattedText = formattedText.replace(/(\d{2})(\d)/, '$1/$2');
        formattedText = formattedText.replace(/(\d{2})(\d)/, '$1/$2');
        return formattedText;
    };

    const handleDOBChange = (text) => {
        setDob(formatDOB(text));
    };

    const SignUpUser = async () => {
        setLoading(true);
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            let profilePicUrl = null;
    
            // If a profile picture has been selected, upload it to Firebase Storage
            if (profilePic) {
                const file = await fetch(profilePic);
                const blob = await file.blob();
    
                const storageRef = ref(FIREBASE_STORAGE, `profilePictures/${response.user.uid}`);
                const snapshot = await uploadBytes(storageRef, blob);
                profilePicUrl = await getDownloadURL(snapshot.ref);
            }
    
            const userDocRef = doc(db, 'Users', response.user.uid);
            await setDoc(userDocRef, {
                email: email,
                name: name,
                dob: dob || null,
                profilePic: profilePicUrl,
                gymLocation: null,
            });
        } catch (error) {
            console.log(error);
            alert('Creation failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behavior='padding'>
                <TouchableOpacity onPress={pickImage}>
                  <Image
                    source={profilePic ? { uri: profilePic } : defaultProfilePic}
                    style={styles.profilePic}
                  />
                </TouchableOpacity>
                <Text style={styles.imageEdit} >Click to edit Image</Text>
                <TextInput value={name} style={styles.input} placeholder='Name' autoCapitalize='none' onChangeText={text => setName(text)} />
                <TextInput value={email} style={styles.input} placeholder='Email' autoCapitalize='none' onChangeText={text => setEmail(text)} />
                <TextInput value={dob} style={styles.input} placeholder='Date of birth: DD/MM/YYYY' autoCapitalize='none' onChangeText={handleDOBChange} />
                <TextInput secureTextEntry={true} value={password} style={styles.input} placeholder='Password' autoCapitalize='none' onChangeText={text => setPassword(text)} />
                {loading ? <ActivityIndicator size="large" color="#0000ff" />
                  : <>
                      <Button title="SignUp" onPress={() => SignUpUser()} />
                  </>
                }
            </KeyboardAvoidingView>
        </View>
    );
};

export default SignUp;

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        flex: 1,
        justifyContent: 'center',
    },
    imageEdit: {
      justifyContent: 'center',
      alignSelf: 'center',
    },
    input: {
        marginVertical: 8,
        height: 50,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff',
    },
    profilePic: {
      width: 200,
      height: 200,
      borderRadius: 50,
      alignSelf: 'center',
      marginBottom: 20,
      borderColor: 'gray',
      borderWidth: 1,
    },
});
