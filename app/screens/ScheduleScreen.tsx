import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { useTheme } from '../context/ThemeContext';

const ScheduleScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [schedule, setSchedule] = useState({
    title: '',
    startTime: new Date(),
    endTime: new Date(new Date().setHours(new Date().getHours() + 1)),
    days: [] as string[],
    description: '',
  });
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const days = [
    { id: 'monday', label: 'Mon', icon: 'monday' as const },
    { id: 'tuesday', label: 'Tue', icon: 'tuesday' as const },
    { id: 'wednesday', label: 'Wed', icon: 'wednesday' as const },
    { id: 'thursday', label: 'Thu', icon: 'thursday' as const },
    { id: 'friday', label: 'Fri', icon: 'friday' as const },
    { id: 'saturday', label: 'Sat', icon: 'saturday' as const },
    { id: 'sunday', label: 'Sun', icon: 'sunday' as const },
  ];

  const handleCreateSchedule = async () => {
    if (!schedule.title.trim()) {
      Alert.alert('Error', 'Please fill in the schedule title');
      return;
    }

    if (schedule.days.length === 0) {
      Alert.alert('Error', 'Please select at least one day');
      return;
    }

    if (schedule.endTime <= schedule.startTime) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        return;
      }

      await addDoc(collection(db, 'schedules'), {
        title: schedule.title.trim(),
        description: schedule.description.trim() || '',
        startTime: Timestamp.fromDate(schedule.startTime),
        endTime: Timestamp.fromDate(schedule.endTime),
        days: schedule.days,
        userId,
        createdAt: Timestamp.now(),
      });

      router.back();
    } catch (error) {
      console.error('Error creating schedule:', error);
      Alert.alert('Error', 'Failed to create schedule. Please try again.');
    }
  };

  const toggleDay = (dayId: string) => {
    setSchedule(prev => ({
      ...prev,
      days: prev.days.includes(dayId)
        ? prev.days.filter(d => d !== dayId)
        : [...prev.days, dayId]
    }));
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isDark && styles.darkContainer]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#000" : "#fff"} />
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, isDark && styles.darkBackButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Create Schedule</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={[styles.content, isDark && styles.darkContent]}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.form, isDark && styles.darkForm]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Title</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Enter schedule title"
              value={schedule.title}
              onChangeText={(text: string) => setSchedule({ ...schedule, title: text })}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, isDark && styles.darkInput]}
              placeholder="Add schedule description"
              value={schedule.description}
              onChangeText={(text: string) => setSchedule({ ...schedule, description: text })}
              multiline
              numberOfLines={4}
              placeholderTextColor={isDark ? "#888" : "#999"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Start Time</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, isDark && styles.darkDatePickerButton]}
              onPress={() => setShowStartTimePicker(true)}
            >
              <View style={styles.datePickerContent}>
                <MaterialIcons name="schedule" size={20} color={isDark ? "#888" : "#666"} />
                <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                  {schedule.startTime.toLocaleTimeString()}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={isDark ? "#888" : "#666"} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>End Time</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, isDark && styles.darkDatePickerButton]}
              onPress={() => setShowEndTimePicker(true)}
            >
              <View style={styles.datePickerContent}>
                <MaterialIcons name="schedule" size={20} color={isDark ? "#888" : "#666"} />
                <Text style={[styles.datePickerText, isDark && styles.darkText]}>
                  {schedule.endTime.toLocaleTimeString()}
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={isDark ? "#888" : "#666"} />
            </TouchableOpacity>
          </View>

          {showStartTimePicker && (
            <DateTimePicker
              value={schedule.startTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowStartTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setSchedule({ ...schedule, startTime: selectedDate });
                }
              }}
            />
          )}

          {showEndTimePicker && (
            <DateTimePicker
              value={schedule.endTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowEndTimePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setSchedule({ ...schedule, endTime: selectedDate });
                }
              }}
            />
          )}

          <View style={styles.inputGroup}>
            <Text style={[styles.label, isDark && styles.darkText]}>Days</Text>
            <View style={styles.daysContainer}>
              {days.map((day) => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayButton,
                    isDark && styles.darkDayButton,
                    schedule.days.includes(day.id) && (isDark ? styles.darkSelectedDay : styles.selectedDay)
                  ]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      isDark && styles.darkText,
                      schedule.days.includes(day.id) && (isDark ? styles.darkSelectedText : styles.selectedText)
                    ]}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, isDark && styles.darkFooter]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, isDark && styles.darkCancelButton]}
          onPress={() => router.back()}
        >
          <Text style={[styles.cancelButtonText, isDark && styles.darkCancelButtonText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateSchedule}
        >
          <Text style={styles.createButtonText}>Create Schedule</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  darkContainer: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkHeader: {
    backgroundColor: '#121212',
    borderBottomColor: '#333',
    shadowColor: 'transparent',
    elevation: 0,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkBackButton: {
    backgroundColor: '#1E1E1E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  darkText: {
    color: '#E0E0E0',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  darkContent: {
    backgroundColor: '#000',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkForm: {
    backgroundColor: '#121212',
    shadowColor: 'transparent',
    elevation: 0,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#333',
  },
  darkInput: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    color: '#E0E0E0',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkDatePickerButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  darkDayButton: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
  },
  selectedDay: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  darkSelectedDay: {
    backgroundColor: '#1E1E1E',
    borderColor: '#4CAF50',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedText: {
    color: '#2196F3',
    fontWeight: '600',
  },
  darkSelectedText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkFooter: {
    backgroundColor: '#121212',
    borderTopColor: '#333',
    shadowColor: 'transparent',
    elevation: 0,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  darkCancelButton: {
    backgroundColor: '#1E1E1E',
  },
  createButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  darkCancelButtonText: {
    color: '#E0E0E0',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ScheduleScreen; 