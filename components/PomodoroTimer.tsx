import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';

interface PomodoroTimerProps {
  onComplete?: () => void;
}

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes in seconds
const LONG_BREAK = 15 * 60; // 15 minutes in seconds

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkTime, setIsWorkTime] = useState(true);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [sound, setSound] = useState<Audio.Sound>();

  const isNativePlatform = Platform.OS !== 'web';

  useEffect(() => {
    return sound && isNativePlatform
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const playSound = async () => {
    if (!isNativePlatform) return;
    
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sounds/timer-complete.mp3')
      );
      setSound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  };

  const triggerHaptics = async () => {
    if (!isNativePlatform) return;
    try {
      await Haptics.selectionAsync();
    } catch (error) {
      console.error('Error triggering haptics:', error);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      playSound();
      if (isNativePlatform) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      if (isWorkTime) {
        setPomodoroCount((prev) => prev + 1);
        if (pomodoroCount < 3) {
          Alert.alert(
            'Work Session Complete!',
            'Time for a short break.',
            [{ text: 'OK', onPress: () => setTimeLeft(SHORT_BREAK) }]
          );
        } else {
          Alert.alert(
            'Great Work!',
            'Time for a long break. You\'ve completed 4 Pomodoros!',
            [{ text: 'OK', onPress: () => {
              setTimeLeft(LONG_BREAK);
              setPomodoroCount(0);
            }}]
          );
        }
      } else {
        Alert.alert(
          'Break Time Over',
          'Ready to get back to work?',
          [{ text: 'Let\'s Go!', onPress: () => setTimeLeft(WORK_TIME) }]
        );
      }
      
      setIsWorkTime((prev) => !prev);
      setIsRunning(false);
      
      if (onComplete && isWorkTime) {
        onComplete();
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, isWorkTime, pomodoroCount, onComplete]);

  const toggleTimer = async () => {
    setIsRunning((prev) => !prev);
    await triggerHaptics();
  };

  const resetTimer = async () => {
    setIsRunning(false);
    setTimeLeft(WORK_TIME);
    setIsWorkTime(true);
    setPomodoroCount(0);
    await triggerHaptics();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (isWorkTime) {
      return timeLeft < 60 ? '#f44336' : '#2196F3';
    }
    return '#4CAF50';
  };

  return (
    <View style={styles.container}>
      <View style={[styles.timerCard, { borderColor: getTimerColor() }]}>
        <Text style={styles.timerType}>
          {isWorkTime ? 'Work Time' : pomodoroCount === 3 ? 'Long Break' : 'Short Break'}
        </Text>
        <Text style={[styles.timer, { color: getTimerColor() }]}>
          {formatTime(timeLeft)}
        </Text>
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={toggleTimer} 
            style={[styles.button, { backgroundColor: getTimerColor() }]}
          >
            <MaterialIcons
              name={isRunning ? 'pause' : 'play-arrow'}
              size={24}
              color="white"
            />
            <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Start'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={resetTimer} 
            style={[styles.button, styles.resetButton]}
          >
            <MaterialIcons name="refresh" size={24} color="white" />
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.progressDots}>
          {[...Array(4)].map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === pomodoroCount && styles.activeDot,
                index < pomodoroCount && styles.completedDot,
              ]}
            />
          ))}
        </View>
        <Text style={styles.sessionInfo}>
          {pomodoroCount}/4 sessions completed
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  timerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  timer: {
    fontSize: 48,
    fontWeight: 'bold',
    marginVertical: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressDots: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E5EA',
  },
  activeDot: {
    backgroundColor: '#2196F3',
    transform: [{ scale: 1.2 }],
  },
  completedDot: {
    backgroundColor: '#4CAF50',
  },
  sessionInfo: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
});

export default PomodoroTimer; 