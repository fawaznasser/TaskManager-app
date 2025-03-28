import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { auth, db } from '@/config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface Settings {
  darkMode: boolean;
  notifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  autoCategorize: boolean;
  showMoodPicker: boolean;
  language: string;
}

const SettingsScreen = () => {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>({
    darkMode: false,
    notifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    autoCategorize: true,
    showMoodPicker: true,
    language: 'English',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
      const settingsDoc = await getDoc(settingsRef);
      
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as Settings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const settingsRef = doc(db, 'users', userId, 'settings', 'userSettings');
      await updateDoc(settingsRef, {
        ...newSettings,
        updatedAt: new Date()
      });
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const toggleSetting = (key: keyof Settings) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key],
    };
    saveSettings(newSettings);
  };

  const renderSettingItem = (
    title: string,
    description: string,
    key: keyof Settings,
    icon: string
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingItemLeft}>
        <Ionicons name={icon as any} size={24} color="#666" />
        <View style={styles.settingItemText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        value={settings[key] as boolean}
        onValueChange={() => toggleSetting(key)}
        trackColor={{ false: '#ddd', true: '#4CAF50' }}
        thumbColor={settings[key] ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          {renderSettingItem(
            'Dark Mode',
            'Enable dark theme for the app',
            'darkMode',
            'moon-outline'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {renderSettingItem(
            'Enable Notifications',
            'Receive notifications for tasks and updates',
            'notifications',
            'notifications-outline'
          )}
          {renderSettingItem(
            'Sound',
            'Play sound for notifications',
            'soundEnabled',
            'volume-high-outline'
          )}
          {renderSettingItem(
            'Vibration',
            'Vibrate for notifications',
            'vibrationEnabled',
            'vibrate-outline'
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Task Management</Text>
          {renderSettingItem(
            'Auto-Categorize',
            'Automatically categorize tasks based on content',
            'autoCategorize',
            'folder-outline'
          )}
          {renderSettingItem(
            'Mood Picker',
            'Show mood selection when opening the app',
            'showMoodPicker',
            'happy-outline'
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingItemText: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: '#333',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default SettingsScreen; 