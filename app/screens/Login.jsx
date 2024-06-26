import { View, Text, StyleSheet, TextInput, ActivityIndicator, Button, KeyboardAvoidingView } from 'react-native'
import React, { useState } from 'react'
import { FIREBASE_AUTH } from '../../FirebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';

const Login = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const auth = FIREBASE_AUTH;

    const signIn = async () => {
        setLoading(true);
        try {
            const response = await signInWithEmailAndPassword(auth, email, password);
            console.log(response);
        } catch (error) {
            console.log(error);
            alert('Sign in failed: ' + error.message)
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView behaviour='padding'>
                <Text style={styles.title}>Welcome to</Text>
                <Text style={styles.nameTitle}>GymBuddy</Text>
                <TextInput value={email} style={styles.input} placeholder='Email' autoCapitalize='none' onChangeText={(Text) => setEmail(Text)}></TextInput>
                <TextInput secureTextEntry={true} value={password} style={styles.input} placeholder='Password' autoCapitalize='none' onChangeText={(Text) => setPassword(Text)}></TextInput>
                {loading ? <ActivityIndicator size="large" color="#0000ff" />
                    : <>
                        <Button title="Login" onPress={() => signIn()} />
                        <Button title="no account? SignUp here" onPress={() => navigation.navigate('SignUp')} />
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
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    nameTitle:{
        fontSize: 50,
        fontWeight: 'bold',
        marginBottom: 70,
        textAlign: 'center',
    }
});
