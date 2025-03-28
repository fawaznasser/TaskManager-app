import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from './context/ThemeContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
          },
          headerTintColor: colorScheme === 'dark' ? '#fff' : '#000',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerShadowVisible: false,
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="(app)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
} 