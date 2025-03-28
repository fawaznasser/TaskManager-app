import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  completed: boolean;
  claimed: boolean;
  points: number;
}

interface AchievementsProps {
  achievements: Achievement[];
  userPoints: number;
  onClaimReward: (achievementId: string) => void;
  isDark: boolean;
}

function Achievements({ achievements, userPoints, onClaimReward, isDark }: AchievementsProps) {
  const getUserLevel = (points: number) => {
    if (points >= 1000) return 'Diamond Level';
    if (points >= 500) return 'Platinum Level';
    if (points >= 250) return 'Gold Level';
    if (points >= 100) return 'Silver Level';
    return 'Bronze Level';
  };

  return (
    <ScrollView style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <View style={styles.levelContainer}>
          <Text style={[styles.levelText, isDark && styles.darkText]}>{getUserLevel(userPoints)}</Text>
          <Text style={[styles.pointsText, isDark && styles.darkText]}>{userPoints} Points</Text>
        </View>
      </View>

      <View style={styles.achievementsContainer}>
        {achievements.map((achievement) => (
          <View key={achievement.id} style={[styles.achievementCard, isDark && styles.darkAchievementCard]}>
            <View style={[
              styles.achievementIconContainer,
              isDark && styles.darkAchievementIconContainer,
              achievement.completed && styles.achievementCompleted,
              achievement.completed && isDark && styles.darkAchievementCompleted
            ]}>
              <MaterialIcons
                name={achievement.icon as any}
                size={32}
                color={achievement.completed ? '#fff' : (isDark ? '#fff' : '#666')}
              />
            </View>
            <View style={styles.achievementInfo}>
              <Text style={[styles.achievementTitle, isDark && styles.darkText]}>
                {achievement.title}
              </Text>
              <Text style={[styles.achievementDescription, isDark && styles.darkSubText]}>
                {achievement.description}
              </Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, isDark && styles.darkProgressBar]}>
                  <View 
                    style={[
                      styles.progressFill,
                      isDark && styles.darkProgressFill,
                      { width: `${(achievement.progress / achievement.total) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, isDark && styles.darkSubText]}>
                  {achievement.progress}/{achievement.total}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.claimButton,
                (!achievement.completed || achievement.claimed) && styles.claimButtonDisabled,
                isDark && styles.darkClaimButton,
                (!achievement.completed || achievement.claimed) && isDark && styles.darkClaimButtonDisabled
              ]}
              onPress={() => onClaimReward(achievement.id)}
              disabled={!achievement.completed || achievement.claimed}
            >
              <Text style={[
                styles.claimButtonText,
                (!achievement.completed || achievement.claimed) && isDark && styles.darkClaimButtonDisabledText
              ]}>
                {achievement.claimed ? 'Claimed' : 'Claim'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  levelContainer: {
    alignItems: 'center',

  },
  levelText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  pointsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  achievementsContainer: {
    padding: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementCompleted: {
    backgroundColor: '#4CAF50',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 16,
  },
  claimButtonDisabled: {
    backgroundColor: '#ccc',
  },
  claimButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkHeader: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  darkText: {
    color: '#fff',
  },
  darkAchievementCard: {
    backgroundColor: '#1E1E1E',
    borderColor: '#333',
    borderWidth: 1,
    elevation: 0,
    shadowColor: 'transparent',
  },
  darkAchievementIconContainer: {
    backgroundColor: '#333',
  },
  darkAchievementCompleted: {
    backgroundColor: '#388E3C',
  },
  darkSubText: {
    color: '#999',
  },
  darkProgressBar: {
    backgroundColor: '#333',
  },
  darkProgressFill: {
    backgroundColor: '#388E3C',
  },
  darkClaimButton: {
    backgroundColor: '#388E3C',
  },
  darkClaimButtonDisabled: {
    backgroundColor: '#333',
  },
  darkClaimButtonDisabledText: {
    color: '#666',
  },
});

export default Achievements; 
