import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Layout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#4a90e2',
                tabBarInactiveTintColor: '#666',
                tabBarStyle: {
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                headerStyle: {
                    backgroundColor: '#4a90e2',
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    href: null, 
                }}
            />

            <Tabs.Screen
                name="services/api"
                options={{
                    href: null,  
                }}
            />

            <Tabs.Screen
                name="login"
                options={{
                    href: null, 
                    headerShown: false,
                }}
            />
            <Tabs.Screen
                name="signup"
                options={{
                    href: null, 
                    headerShown: false,
                }}
            />

            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="upload"
                options={{
                    title: 'Upload',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cloud-upload" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="request"
                options={{
                    title: 'Request',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="cart" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="help"
                options={{
                    title: 'Help',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="help-circle" size={size} color={color} />
                    ),
                }}
            />

            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}