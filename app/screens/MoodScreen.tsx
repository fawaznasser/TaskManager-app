import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import MoodBasedTasks from '../../components/MoodBasedTasks';
import MoodCheckup from '../../components/MoodCheckup';
import { db, auth } from '@/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Task } from '@/types';

export default function MoodScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentMood, setCurrentMood] = useState<string>('neutral');
  const [showMoodCheckup, setShowMoodCheckup] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const tasksList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Task[];

      setTasks(tasksList);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMoodCheckup(false);
  };

  const handleSelectTask = (taskId: string) => {
    console.log('Selected task:', taskId);
  };

  return (
    <View style={styles.container}>
      <MoodBasedTasks 
        tasks={tasks} 
        currentMood={currentMood} 
        onSelectTask={handleSelectTask} 
      />
      
      <MoodCheckup
        visible={showMoodCheckup}
        onClose={() => setShowMoodCheckup(false)}
        onMoodSelect={handleMoodSelect}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});