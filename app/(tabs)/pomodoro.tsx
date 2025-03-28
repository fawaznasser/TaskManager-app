import React from 'react';
import { View, StyleSheet } from 'react-native';
import PomodoroTimer from '../../components/PomodoroTimer';

export default function PomodoroScreen() {
  const handleComplete = () => {
    console.log('Pomodoro session completed');
  };

  return (
    <View style={styles.container}>
      <PomodoroTimer onComplete={handleComplete} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
}); 