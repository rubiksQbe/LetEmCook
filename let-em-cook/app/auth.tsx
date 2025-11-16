import { useState } from 'react';
import { Alert, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';

import { Text, View } from '@/components/Themed';
import { signInWithUsername, signUpWithUsername } from '@/lib/supabase';

export default function AuthScreen() {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSignUp() {
		if (!username || !password) {
			Alert.alert('Missing fields', 'Enter a username and password.');
			return;
		}
		setLoading(true);
		const { error } = await signUpWithUsername(username.trim(), password);
		setLoading(false);
		if (error) {
			Alert.alert('Sign up failed', error.message);
		} else {
			router.replace('/(tabs)/challenges');
		}
	}

	async function handleSignIn() {
		if (!username || !password) {
			Alert.alert('Missing fields', 'Enter a username and password.');
			return;
		}
		setLoading(true);
		const { error } = await signInWithUsername(username.trim(), password);
		setLoading(false);
		if (error) {
			Alert.alert('Sign in failed', error.message);
		} else {
			router.replace('/(tabs)/challenges');
		}
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>Welcome</Text>
			<View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
			<View style={styles.form}>
				<Text style={styles.label}>Username</Text>
				<TextInput
					value={username}
					onChangeText={setUsername}
					autoCapitalize="none"
					autoCorrect={false}
					placeholder="yourname"
					style={styles.input}
				/>
				<Text style={styles.label}>Password</Text>
				<TextInput
					value={password}
					onChangeText={setPassword}
					secureTextEntry
					placeholder="••••••••"
					style={styles.input}
				/>
				<View style={styles.buttons}>
					<Text onPress={handleSignUp} style={[styles.button, loading && styles.buttonDisabled]}>
						{loading ? 'Please wait…' : 'Sign Up'}
					</Text>
					<Text onPress={handleSignIn} style={[styles.buttonOutline, loading && styles.buttonDisabled]}>
						{loading ? 'Please wait…' : 'Sign In'}
					</Text>
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
	},
	separator: {
		marginVertical: 24,
		height: 1,
		width: '80%',
	},
	form: {
		width: '100%',
		maxWidth: 420,
	},
	label: {
		marginBottom: 6,
		fontWeight: '600',
	},
	input: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 10,
		marginBottom: 14,
	},
	buttons: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 6,
	},
	button: {
		backgroundColor: '#2e78b7',
		color: 'white',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		overflow: 'hidden',
	},
	buttonOutline: {
		borderColor: '#2e78b7',
		borderWidth: 1,
		color: '#2e78b7',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 8,
		overflow: 'hidden',
	},
	buttonDisabled: {
		opacity: 0.6,
	},
});


