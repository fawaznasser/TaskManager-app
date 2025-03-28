import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Achievements, Achievement } from '../../components/Achievements';
import { db, auth } from '@/config/firebase';
import { collection, getDocs, query, where, updateDoc, doc, setDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { router } from 'expo-router';

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    title: 'First Steps',
    description: 'Create your first task',
    icon: 'assignment',
    progress: 0,
    total: 1,
    completed: false,
    claimed: false,
    points: 50,
  },
  {
    id: 'task_master',
    title: 'Task Master',
    description: 'Complete 10 tasks',
    icon: 'stars',
    progress: 0,
    total: 10,
    completed: false,
    claimed: false,
    points: 100,
  },
  {
    id: 'productive_day',
    title: 'Productive Day',
    description: 'Complete 5 tasks in a single day',
    icon: 'wb-sunny',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 150,
  },
  {
    id: 'pomodoro_master',
    title: 'Focus Champion',
    description: 'Complete 5 Pomodoro sessions',
    icon: 'timer',
    progress: 0,
    total: 5,
    completed: false,
    claimed: false,
    points: 200,
  },
];

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        initializeUserAchievements(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const initializeUserAchievements = async (userId: string) => {
    try {
      setLoading(true);
      
      // Check if user document exists
      const userDocRef = doc(db, 'users', userId);
      const userAchievementsRef = collection(userDocRef, 'achievements');
      const achievementsSnapshot = await getDocs(userAchievementsRef);

      if (achievementsSnapshot.empty) {
        // Initialize achievements for new user
        const batch = writeBatch(db);
        
        INITIAL_ACHIEVEMENTS.forEach((achievement) => {
          const achievementRef = doc(userAchievementsRef);
          batch.set(achievementRef, {
            ...achievement,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          });
        });

        await batch.commit();
      }

      // Load achievements
      await loadAchievements(userId);
    } catch (error) {
      console.error('Error initializing achievements:', error);
      Alert.alert('Error', 'Failed to initialize achievements');
    }
  };

  const loadAchievements = async (userId: string) => {
    try {
      // Load user achievements
      const userDocRef = doc(db, 'users', userId);
      const userAchievementsRef = collection(userDocRef, 'achievements');
      const achievementsSnapshot = await getDocs(userAchievementsRef);
      
      const achievementsList = achievementsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Achievement[];

      setAchievements(achievementsList);

      // Load user points
      const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', userId)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setUserPoints(userData.points || 0);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
      Alert.alert('Error', 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (achievementId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        router.replace("/(auth)/login");
        return;
      }

      // Find achievement to claim
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.claimed || !achievement.completed) return;

      const userDocRef = doc(db, 'users', user.uid);
      const achievementRef = doc(collection(userDocRef, 'achievements'), achievementId);

      // Update in a batch
      const batch = writeBatch(db);

      // Update achievement claimed status
      batch.update(achievementRef, { 
        claimed: true,
        updatedAt: Timestamp.now()
      });

      // Update user points
      batch.update(userDocRef, { 
        points: userPoints + achievement.points,
        updatedAt: Timestamp.now()
      });

      await batch.commit();

      // Update local state
      setUserPoints(prev => prev + achievement.points);
      setAchievements(prev => 
        prev.map(a => 
          a.id === achievementId 
            ? { ...a, claimed: true }
            : a
        )
      );

      Alert.alert('Success', `Claimed ${achievement.points} points!`);
    } catch (error) {
      console.error('Error claiming reward:', error);
      Alert.alert('Error', 'Failed to claim reward');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Achievements 
        achievements={achievements} 
        userPoints={userPoints} 
        onClaimReward={handleClaimReward}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
}); 