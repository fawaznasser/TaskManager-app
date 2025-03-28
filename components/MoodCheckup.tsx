import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface MoodCheckupProps {
  onMoodSelect: (mood: string) => void;
  visible: boolean;
  onClose: () => void;
}

const MOODS = [
  { id: 'happy', icon: '😊', label: 'Happy', color: '#FFD700' },
  { id: 'neutral', icon: '😐', label: 'Neutral', color: '#A9A9A9' },
  { id: 'tired', icon: '😫', label: 'Tired', color: '#87CEEB' },
  { id: 'stressed', icon: '😰', label: 'Stressed', color: '#FF6B6B' },
  { id: 'productive', icon: '💪', label: 'Productive', color: '#98FB98' },
];

const QUOTES = {
  happy: [
    "Your energy is contagious! Let's tackle those important tasks!",
    "Great mood! Perfect time to focus on your priorities.",
    "Your positive energy will help you achieve great things today!",
  ],
  neutral: [
    "A balanced mood is perfect for steady progress.",
    "Take it one task at a time, you've got this!",
    "Stay focused and maintain this steady pace.",
  ],
  tired: [
    "It's okay to take it easy. Focus on what's most important.",
    "Remember to take breaks and stay hydrated!",
    "Let's prioritize your energy levels today.",
  ],
  stressed: [
    "Take a deep breath. Let's break this down into manageable steps.",
    "You're stronger than you think. Let's tackle this together.",
    "Remember to take care of yourself first.",
  ],
  productive: [
    "You're on fire! Let's channel this energy into your goals!",
    "Your productivity is impressive! Keep this momentum going!",
    "You're in the zone! Let's make the most of it!",
  ],
};

const PRIORITY_TIPS = {
  happy: "Focus on high-priority tasks while your energy is high!",
  neutral: "Balance your priorities to maintain steady progress.",
  tired: "Start with low-priority tasks and build up your energy.",
  stressed: "Break down high-priority tasks into smaller steps.",
  productive: "Tackle your most challenging tasks now!",
};

export default function MoodCheckup({ onMoodSelect, visible, onClose }: MoodCheckupProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodSelect = (mood: string) => {
    setSelectedMood(mood);
    onMoodSelect(mood);
    onClose();
  };

  const getRandomQuote = (mood: string) => {
    const moodQuotes = QUOTES[mood as keyof typeof QUOTES];
    return moodQuotes[Math.floor(Math.random() * moodQuotes.length)];
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>How are you feeling today?</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView}>
            <View style={styles.moodsContainer}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodButton,
                    { backgroundColor: mood.color },
                    selectedMood === mood.id && styles.selectedMood,
                  ]}
                  onPress={() => handleMoodSelect(mood.id)}
                >
                  <Text style={styles.moodIcon}>{mood.icon}</Text>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {selectedMood && (
              <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>
                  {getRandomQuote(selectedMood)}
                </Text>
                <Text style={styles.priorityTip}>
                  {PRIORITY_TIPS[selectedMood as keyof typeof PRIORITY_TIPS]}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
      },
      android: {
        elevation: 5,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    padding: 20,
  },
  moodsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodButton: {
    width: '48%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 15,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedMood: {
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  moodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  quoteContainer: {
    backgroundColor: '#f8f8f8',
    padding: 20,
    borderRadius: 15,
    marginTop: 10,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  priorityTip: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
}); 