import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface PomodoroTimerProps {
  onComplete?: () => void;
}

const WORK_TIME = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK = 5 * 60; // 5 minutes in seconds
const LONG_BREAK = 15 * 60; // 15 minutes in seconds

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ onComplete }) => {
  const [timeLeft, setTimeLeft] = useState(WORK_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkTime, setIsWorkTime] = useState(true);
  const [pomodoroCount, setPomodoroCount] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (isWorkTime) {
        setPomodoroCount((prev) => prev + 1);
        if (pomodoroCount < 3) {
          setTimeLeft(SHORT_BREAK);
        } else {
          setTimeLeft(LONG_BREAK);
          setPomodoroCount(0);
        }
      } else {
        setTimeLeft(WORK_TIME);
      }
      setIsWorkTime((prev) => !prev);
      setIsRunning(false);
      if (onComplete) {
        onComplete();
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRunning, timeLeft, isWorkTime, pomodoroCount, onComplete]);

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
    Haptics.selectionAsync();
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(WORK_TIME);
    setIsWorkTime(true);
    setPomodoroCount(0);
    Haptics.selectionAsync();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerCard}>
        <Text style={styles.timerType}>
          {isWorkTime ? 'Work Time' : pomodoroCount === 3 ? 'Long Break' : 'Short Break'}
        </Text>
        <Text style={styles.timer}>{formatTime(timeLeft)}</Text>
        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleTimer} style={styles.button}>
            <MaterialIcons
              name={isRunning ? 'pause' : 'play-arrow'}
              size={24}
              color="white"
            />
            <Text style={styles.buttonText}>{isRunning ? 'Pause' : 'Start'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={resetTimer} style={[styles.button, styles.resetButton]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    color: '#007AFF',
    marginVertical: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
    transform: [{ scale: 1.2 }],
  },
  completedDot: {
    backgroundColor: '#34C759',
  },
});

export default PomodoroTimer; 