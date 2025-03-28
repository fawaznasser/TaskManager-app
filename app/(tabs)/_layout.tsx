import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#666',
        tabBarStyle: {
          display: 'none',
        },
        headerShown: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: 'Mood',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="mood" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pomodoro"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="achievements"
        options={{
          title: 'Achievements',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="emoji-events" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
