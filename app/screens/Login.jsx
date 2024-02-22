import { View, Text, StyleSheet, TextInput, ActivityIndicator, Button, KeyboardAvoidingView } from 'react-native'
import React, { useState } from 'react'
import { FIREBASE_AUTH, FIREBASE_DB } from '../../FirebaseConfig'; // Import Firestore database config
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore methods for document creation

const Login = () => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;
    const db = FIREBASE_DB;

    const signIn = async () => {
        setLoading(true);
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            console.log(response);
            // Example: Fetch user document from Firestore after successful authentication
            const userDocRef = doc(db, 'Users', response.user.uid); // Assuming 'Users' is the collection name
            // Further operations with the userDocRef can be performed here (e.g., updating last login timestamp)
            alert('Check Your Emails!')
        } catch (error) {
            console.log(error);
            alert('Sign in failed: ' + error.message)
        } finally {
            setLoading(false);
        }
    }

    const signUp = async () => {
        setLoading(true);
        try {
            const response = await createUserWithEmailAndPassword(auth, email, password);
            console.log(response);
            // Example: Create user document in Firestore after successful registration
            const userDocRef = doc(db, 'Users', response.user.uid); // Assuming 'Users' is the collection name
            await setDoc(userDocRef, {
                email: email,
                name: name,
                // Other user data...
            });
            alert('Check Your Emails!')
        } catch (error) {
            console.log(error);
            alert('Creation failed: ' + error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behaviour='padding'>
                <TextInput value={name} style={styles.input} placeholder='Name' autoCapitalize='none' onChangeText={(Text) => setName(Text)}></TextInput>
                <TextInput value={email} style={styles.input} placeholder='Email' autoCapitalize='none' onChangeText={(Text) => setEmail(Text)}></TextInput>
                <TextInput secureTextEntry={true} value={password} style={styles.input} placeholder='Password' autoCapitalize='none' onChangeText={(Text) => setPassword(Text)}></TextInput>
                {loading ? <ActivityIndicator size="large" color="#0000ff" />
                    : <>
                        <Button title="Login" onPress={() => signIn()} />
                        <Button title="SignUp" onPress={() => signUp()} />
                    </>}
            </KeyboardAvoidingView>
        </View>
    )
}

export default Login;

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 20,
        flex: 1,
        justifyContent: 'center'
    },
    input: {
        marginVertical: 4,
        height: 50,
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
        backgroundColor: '#fff'
    }
});
