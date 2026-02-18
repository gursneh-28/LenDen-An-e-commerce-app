// app/index.js
import { Redirect } from 'expo-router';

export default function Index() {
    // For now, always redirect to login
    // Later we'll add logic to check if user is already logged in
    return <Redirect href="/login" />;
}