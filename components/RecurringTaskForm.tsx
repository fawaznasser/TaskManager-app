import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';

interface RecurringTaskFormProps {
  onSubmit: (taskData: any) => void;
  onCancel: () => void;
}

export const RecurringTaskForm: React.FC<RecurringTaskFormProps> = ({
  onSubmit,
  onCancel
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState(new Date());
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringEndDate, setRecurringEndDate] = useState<Date | null>(null);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Task title is required');
      return;
    }

    if (isRecurring && !recurringEndDate) {
      Alert.alert('Error', 'End date is required for recurring tasks');
      return;
    }

    onSubmit({
      title,
      description,
      deadline,
      priority,
      isRecurring,
      recurringType: isRecurring ? recurringType : undefined,
      recurringInterval: isRecurring ? recurringInterval : undefined,
      recurringEndDate: isRecurring ? recurringEndDate : undefined
    });
  };

  const getRecurringDescription = () => {
    if (!isRecurring) return '';
    
    let text = `Repeats ${recurringInterval > 1 ? `every ${recurringInterval}` : 'every'}`;
    
    switch (recurringType) {
      case 'daily':
        text += recurringInterval > 1 ? ' days' : ' day';
        break;
      case 'weekly':
        text += recurringInterval > 1 ? ' weeks' : ' week';
        break;
      case 'monthly':
        text += recurringInterval > 1 ? ' months' : ' month';
        break;
    }
    
    if (recurringEndDate) {
      text += ` until ${recurringEndDate.toLocaleDateString()}`;
    }
    
    return text;
  };

  const handleDeadlineDateChange = (event: any, selectedDate?: Date) => {
    setShowDeadlinePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDeadline(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setRecurringEndDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create Recurring Task</Text>
        <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Task Title"
        value={title}
        onChangeText={setTitle}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Task Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Priority:</Text>
        <View style={styles.priorityContainer}>
          {['low', 'medium', 'high'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.priorityButton,
                p === 'low' ? styles.lowPriority : 
                p === 'medium' ? styles.mediumPriority : 
                styles.highPriority,
                priority === p && styles.activePriorityButton
              ]}
              onPress={() => setPriority(p as 'low' | 'medium' | 'high')}
            >
              <Text style={[
                styles.priorityButtonText, 
                p === 'low' ? styles.lowPriorityText : 
                p === 'medium' ? styles.mediumPriorityText : 
                styles.highPriorityText
              ]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>Deadline:</Text>
        <TouchableOpacity 
          style={styles.datePickerButton} 
          onPress={() => setShowDeadlinePicker(true)}
        >
          <Text style={styles.datePickerText}>{deadline.toLocaleDateString()}</Text>
          <MaterialIcons name="calendar-today" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {showDeadlinePicker && (
        <DateTimePicker
          value={deadline}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDeadlineDateChange}
        />
      )}

      <View style={styles.switchContainer}>
        <Text style={styles.fieldLabel}>Recurring Task:</Text>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: '#767577', true: '#007AFF' }}
          thumbColor={isRecurring ? '#ffffff' : '#f4f3f4'}
        />
      </View>

      {isRecurring && (
        <>
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Repeat Every:</Text>
            <View style={styles.recurringContainer}>
              <TextInput
                style={styles.intervalInput}
                value={recurringInterval.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text) || 1;
                  setRecurringInterval(Math.max(1, value));
                }}
                keyboardType="numeric"
              />
              
              <Picker
                selectedValue={recurringType}
                style={styles.typePicker}
                onValueChange={(itemValue: string) => setRecurringType(itemValue as 'daily' | 'weekly' | 'monthly')}
              >
                <Picker.Item label="Day(s)" value="daily" />
                <Picker.Item label="Week(s)" value="weekly" />
                <Picker.Item label="Month(s)" value="monthly" />
              </Picker>
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>End Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerButton} 
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.datePickerText}>{recurringEndDate ? recurringEndDate.toLocaleDateString() : 'Select End Date'}</Text>
              <MaterialIcons name="calendar-today" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {showEndDatePicker && (
            <DateTimePicker
              value={recurringEndDate || new Date()}
              mode="date"
              minimumDate={new Date()}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleEndDateChange}
            />
          )}

          <Text style={styles.recurringDescription}>
            {getRecurringDescription()}
          </Text>
        </>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.createButton} onPress={handleSubmit}>
          <Text style={styles.createButtonText}>Create Task</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
  },
  priorityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginRight: 8,
  },
  lowPriority: {
    backgroundColor: '#e8f5e9',
  },
  mediumPriority: {
    backgroundColor: '#fff3e0',
  },
  highPriority: {
    backgroundColor: '#ffebee',
  },
  activePriorityButton: {
    borderWidth: 2,
  },
  priorityButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  lowPriorityText: {
    color: '#4caf50',
  },
  mediumPriorityText: {
    color: '#ff9800',
  },
  highPriorityText: {
    color: '#f44336',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recurringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  intervalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    width: 70,
    marginRight: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  typePicker: {
    flex: 1,
    height: 50,
  },
  recurringDescription: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default RecurringTaskForm; 