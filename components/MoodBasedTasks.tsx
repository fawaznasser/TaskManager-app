import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Task } from '@/types';

interface MoodBasedTasksProps {
  tasks: Task[];
  currentMood: string | null;
  onSelectTask: (taskId: string) => void;
}

// This maps moods to the types of tasks that are most suitable
const MOOD_TASK_MAPPING = {
  happy: {
    priorityOrder: ['high', 'medium', 'low'],
    categories: ['work', 'study', 'health'],
    description: 'You seem energetic today! Here are some challenging tasks you might want to tackle:'
  },
  neutral: {
    priorityOrder: ['medium', 'high', 'low'],
    categories: ['work', 'personal', 'home'],
    description: 'Here are some balanced tasks for today:'
  },
  tired: {
    priorityOrder: ['low', 'medium', 'high'],
    categories: ['personal', 'home', 'shopping'],
    description: 'You seem tired. Consider these lighter tasks:'
  },
  stressed: {
    priorityOrder: ['low', 'medium', 'high'],
    categories: ['health', 'personal', 'home'],
    description: 'You seem stressed. Here are some manageable tasks that might help you feel accomplished:'
  },
  productive: {
    priorityOrder: ['high', 'medium', 'low'],
    categories: ['work', 'study', 'finance'],
    description: 'You\'re feeling productive! Here are some important tasks to keep your momentum going:'
  }
};

export const MoodBasedTasks: React.FC<MoodBasedTasksProps> = ({
  tasks,
  currentMood,
  onSelectTask
}) => {
  const [suggestedTasks, setSuggestedTasks] = useState<Task[]>([]);
  
  useEffect(() => {
    if (!currentMood || tasks.length === 0) {
      setSuggestedTasks([]);
      return;
    }
    
    // Default to neutral mood mapping if the current mood isn't in our mapping
    const moodMapping = MOOD_TASK_MAPPING[currentMood as keyof typeof MOOD_TASK_MAPPING] || 
      MOOD_TASK_MAPPING.neutral;
    
    // Filter and sort tasks based on mood
    let filtered = [...tasks];
    
    // Filter only non-completed tasks
    filtered = filtered.filter(task => task.status !== 'completed');
    
    // Sort by preferred categories for this mood
    filtered.sort((a, b) => {
      const aCategoryIndex = moodMapping.categories.indexOf(a.category);
      const bCategoryIndex = moodMapping.categories.indexOf(b.category);
      
      // If both categories are in the preferred list, compare their indices
      if (aCategoryIndex !== -1 && bCategoryIndex !== -1) {
        return aCategoryIndex - bCategoryIndex;
      }
      // If only a's category is in the preferred list, prioritize a
      if (aCategoryIndex !== -1) return -1;
      // If only b's category is in the preferred list, prioritize b
      if (bCategoryIndex !== -1) return 1;
      // If neither category is preferred, maintain original order
      return 0;
    });
    
    // Then sort by priority
    filtered.sort((a, b) => {
      const aPriorityIndex = moodMapping.priorityOrder.indexOf(a.priority);
      const bPriorityIndex = moodMapping.priorityOrder.indexOf(b.priority);
      return aPriorityIndex - bPriorityIndex;
    });
    
    // Take top 5 suggestions
    setSuggestedTasks(filtered.slice(0, 5));
  }, [tasks, currentMood]);
  
  if (!currentMood || suggestedTasks.length === 0) {
    return null;
  }
  
  const moodMapping = MOOD_TASK_MAPPING[currentMood as keyof typeof MOOD_TASK_MAPPING] || 
    MOOD_TASK_MAPPING.neutral;
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Task Suggestions</Text>
      <Text style={styles.description}>
        {moodMapping.description}
      </Text>
      
      <FlatList
        data={suggestedTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.taskItem}
            onPress={() => onSelectTask(item.id)}
          >
            <View style={styles.taskHeader}>
              <Text style={styles.taskTitle}>{item.title}</Text>
              {item.priority === 'high' && <MaterialIcons name="priority-high" size={18} color="#ff4444" />}
            </View>
            <Text style={styles.taskCategory}>{item.category}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No suggested tasks available.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  taskItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  taskCategory: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    padding: 10,
  },
});

export default MoodBasedTasks; 