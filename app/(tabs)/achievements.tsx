import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Achievements, Achievement } from '../../components/Achievements';
import { db, auth } from '@/config/firebase';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { useState, useEffect } from 'react';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Load user achievements
      const achievementsRef = collection(db, 'achievements');
      const q = query(achievementsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const achievementsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Achievement[];

      setAchievements(achievementsList);

      // Load user points
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDocs(query(collection(db, 'users'), where('userId', '==', user.uid)));
      
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        setUserPoints(userData.points || 0);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (achievementId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      // Find achievement to claim
      const achievement = achievements.find(a => a.id === achievementId);
      if (!achievement || achievement.claimed) return;
      
      // Update achievement claimed status
      const achievementRef = doc(db, 'achievements', achievementId);
      await updateDoc(achievementRef, { claimed: true });
      
      // Add points to user
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { points: userPoints + (achievement.points || 0) });
      
      // Refresh achievements
      loadAchievements();
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  };

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
    backgroundColor: 'white',
  },
}); 