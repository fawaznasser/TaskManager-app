import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  total: number;
  completed: boolean;
  points: number;
  claimed: boolean;
}

interface AchievementsProps {
  achievements: Achievement[];
  userPoints: number;
  onClaimReward?: (achievementId: string) => void;
}

const ACHIEVEMENT_LEVELS = {
  BRONZE: { color: '#CD7F32', label: 'Bronze' },
  SILVER: { color: '#C0C0C0', label: 'Silver' },
  GOLD: { color: '#FFD700', label: 'Gold' },
};

export const Achievements: React.FC<AchievementsProps> = ({
  achievements,
  userPoints,
  onClaimReward,
}) => {
  const getAchievementLevel = (points: number) => {
    if (points >= 1000) return ACHIEVEMENT_LEVELS.GOLD;
    if (points >= 500) return ACHIEVEMENT_LEVELS.SILVER;
    return ACHIEVEMENT_LEVELS.BRONZE;
  };

  const userLevel = getAchievementLevel(userPoints);

  return (
    <View style={styles.container}>
      <View style={styles.userStats}>
        <View style={styles.levelBadge}>
          <MaterialIcons name="stars" size={24} color={userLevel.color} />
          <Text style={[styles.levelText, { color: userLevel.color }]}>
            {userLevel.label} Level
          </Text>
        </View>
        <Text style={styles.pointsText}>{userPoints} Points</Text>
      </View>

      <Text style={styles.sectionTitle}>Achievements</Text>
      
      <ScrollView 
        style={styles.achievementsList}
        contentContainerStyle={styles.achievementsContent}
        showsVerticalScrollIndicator={false}
      >
        {achievements.map((achievement) => (
          <View key={achievement.id} style={styles.achievementCard}>
            <View style={styles.achievementHeader}>
              <MaterialIcons name={achievement.icon as any} size={24} color="#007AFF" />
              <Text style={styles.achievementTitle}>{achievement.title}</Text>
              {achievement.completed && (
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              )}
            </View>

            <Text style={styles.achievementDescription}>
              {achievement.description}
            </Text>

            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${(achievement.progress / achievement.total) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {achievement.progress}/{achievement.total}
              </Text>
            </View>

            {achievement.completed && !achievement.claimed && onClaimReward && (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => onClaimReward(achievement.id)}
              >
                <Text style={styles.claimButtonText}>
                  Claim {achievement.points} Points
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
    backgroundColor: 'white',
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: '600',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  achievementsList: {
    flex: 1,
  },
  achievementsContent: {
    paddingBottom: 20,
  },
  achievementCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  achievementTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  achievementDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 45,
    textAlign: 'right',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  claimButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default Achievements; 