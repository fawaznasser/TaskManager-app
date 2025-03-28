import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { signOut } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, orderBy, deleteDoc } from "firebase/firestore";
import { Task } from "@/types";
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BarChart, PieChart } from "react-native-chart-kit";
import TaskFilters from '@/components/TaskFilters';
import { Achievement } from '@/types';
import Achievements from '@/components/Achievements';
import MoodBasedTasks from '../../components/MoodBasedTasks';
import RecurringTaskForm from '@/components/RecurringTaskForm';
import VoiceCommandButton from '@/components/VoiceCommandButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MoodBasedSuggestions from '@/components/MoodBasedSuggestions';
import MoodCheckup from '@/components/MoodCheckup';
import { useTheme } from '../context/ThemeContext';

const MOODS = [
  { id: 'happy', icon: '😊', label: 'Happy' },
  { id: 'neutral', icon: '😐', label: 'Neutral' },
  { id: 'tired', icon: '😫', label: 'Tired' },
  { id: 'stressed', icon: '😰', label: 'Stressed' },
  { id: 'productive', icon: '💪', label: 'Productive' }
];

const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

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
  }
];

const HomeScreen = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [lastMoodSelectionDate, setLastMoodSelectionDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'analytics' | 'achievements'>('tasks');
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sortKey, setSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [userPoints, setUserPoints] = useState(0);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moodSelectionCount, setMoodSelectionCount] = useState(0);
  const [lastMoodSelectionTime, setLastMoodSelectionTime] = useState<string | null>(null);
  const [showMoodCheckup, setShowMoodCheckup] = useState(false);
  const [pomodoroSessions, setPomodoroSessions] = useState(0);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user: any) => {
      if (!user) {
        router.replace("/(auth)/login");
      } else {
        fetchTasks();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkMoodSelection = async () => {
      try {
        const now = new Date();
        const today = now.toDateString();
        const lastSelection = await AsyncStorage.getItem('lastMoodSelectionTime');
        const count = await AsyncStorage.getItem('moodSelectionCount');
        
        if (lastSelection && !lastSelection.startsWith(today)) {
          await AsyncStorage.setItem('moodSelectionCount', '0');
          setMoodSelectionCount(0);
        }

        const currentCount = count ? parseInt(count) : 0;
        
        if (currentCount < 3) {
          setShowMoodPicker(true);
          await AsyncStorage.setItem('lastMoodSelectionTime', now.toISOString());
          await AsyncStorage.setItem('moodSelectionCount', (currentCount + 1).toString());
          setMoodSelectionCount(currentCount + 1);
        }
      } catch (error) {
        console.error('Error checking mood selection:', error);
      }
    };

    checkMoodSelection();
  }, []);

  useEffect(() => {
    if (tasks.length > 0) {
      let filtered = [...tasks];

      if (searchQuery) {
        filtered = filtered.filter(
          task =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description?.toLowerCase() ?? '').includes(searchQuery.toLowerCase())
        );
      }

      if (statusFilter !== 'all') {
        filtered = filtered.filter(task => {
          switch (statusFilter) {
            case 'completed':
              return task.completed;
            case 'in_progress':
              return !task.completed;
            case 'pending':
              return !task.completed;
            default:
              return true;
          }
        });
      }

      filtered.sort((a, b) => {
        switch (sortKey) {
          case 'deadline':
            return (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0);
          case 'priority':
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          case 'category':
            return (a.category ?? '').localeCompare(b.category ?? '');
          default:
            return 0;
        }
      });

      setFilteredTasks(filtered);
    } else {
      setFilteredTasks([]);
    }
  }, [tasks, searchQuery, statusFilter, sortKey]);

  useEffect(() => {
    const updatedAchievements = achievements.map(achievement => {
      switch (achievement.id) {
        case 'first_task':
          return {
            ...achievement,
            progress: tasks.length > 0 ? 1 : 0,
            completed: tasks.length > 0,
          };
        case 'task_master':
          const completedTasks = tasks.filter(task => task.completed).length;
          return {
            ...achievement,
            progress: completedTasks,
            completed: completedTasks >= achievement.total,
          };
        case 'productive_day':
          const today = new Date();
          const tasksCompletedToday = tasks.filter(
            task => task.completed
          ).length;
          return {
            ...achievement,
            progress: tasksCompletedToday,
            completed: tasksCompletedToday >= achievement.total,
          };
        default:
          return achievement;
      }
    });

    setAchievements(updatedAchievements);
  }, [tasks]);

  const fetchTasks = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace('/(auth)/login');
        return;
      }

      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const fetchedTasks: Task[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline,
          dueDate: data.deadline ? new Date(data.deadline.seconds * 1000) : undefined,
          priority: data.priority,
          category: data.category,
          createdAt: new Date(data.createdAt.seconds * 1000),
          completed: data.completed || false,
          status: data.status || 'pending',
          userId: data.userId,
          completedAt: data.completedAt ? new Date(data.completedAt.seconds * 1000) : undefined,
          isRecurring: data.isRecurring || false
        };
      });

      setTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, currentStatus: string = TASK_STATUS.PENDING) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      let newStatus;
      
      switch (currentStatus) {
        case TASK_STATUS.PENDING:
          newStatus = TASK_STATUS.IN_PROGRESS;
          break;
        case TASK_STATUS.IN_PROGRESS:
          newStatus = TASK_STATUS.COMPLETED;
          break;
        case TASK_STATUS.COMPLETED:
          newStatus = TASK_STATUS.PENDING;
          break;
        default:
          newStatus = TASK_STATUS.PENDING;
      }

      await updateDoc(taskRef, {
        status: newStatus,
        completed: newStatus === TASK_STATUS.COMPLETED,
        completedAt: newStatus === TASK_STATUS.COMPLETED ? Timestamp.now() : null
      });

      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
    }
  };

  const getStatusIcon = (status: string = TASK_STATUS.PENDING) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return "check-circle";
      case TASK_STATUS.IN_PROGRESS:
        return "pending";
      default:
        return "radio-button-unchecked";
    }
  };

  const getStatusColor = (status: string = TASK_STATUS.PENDING) => {
    switch (status) {
      case TASK_STATUS.COMPLETED:
        return "#4CAF50";
      case TASK_STATUS.IN_PROGRESS:
        return "#FFC107";
      default:
        return "#757575";
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      await fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/login");
    } catch (error) {
      console.error("Error signing out:", error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  const categorizeTask = (title: string): string => {
    const categories = {
      work: ['work', 'meeting', 'project', 'report', 'presentation'],
      personal: ['personal', 'self', 'health', 'exercise'],
      shopping: ['buy', 'purchase', 'shopping', 'grocery'],
      home: ['home', 'house', 'clean', 'repair'],
      study: ['study', 'learn', 'read', 'course'],
      health: ['health', 'doctor', 'medical', 'appointment'],
      social: ['meet', 'party', 'event', 'social'],
      finance: ['bill', 'payment', 'budget', 'finance']
    };

    const lowercaseTitle = title.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowercaseTitle.includes(keyword))) {
        return category;
      }
    }
    return 'other';
  };

  const handleClaimAchievement = (achievementId: string) => {
    setAchievements(prev =>
      prev.map(achievement =>
        achievement.id === achievementId
          ? { ...achievement, claimed: true }
          : achievement
      )
    );

      const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
      setUserPoints(prev => prev + achievement.points);
      Alert.alert(
        'Congratulations!',
        `You've earned ${achievement.points} points for completing "${achievement.title}"!`
      );
    }
  };

  const handleRecurringTaskSubmit = async (taskData: any) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      setLoading(true);
      const category = categorizeTask(taskData.title);
      
      await addDoc(collection(db, "tasks"), {
        title: taskData.title,
        description: taskData.description || '',
        deadline: Timestamp.fromDate(taskData.deadline),
        priority: taskData.priority,
        category,
        status: TASK_STATUS.PENDING,
        userId,
        createdAt: Timestamp.now(),
        completed: false,
        isRecurring: true,
        recurringType: taskData.recurringType,
        recurringInterval: taskData.recurringInterval,
        recurringEndDate: taskData.recurringEndDate ? Timestamp.fromDate(taskData.recurringEndDate) : null,
        mood: currentMood || null
      });

      setShowRecurringForm(false);
      await fetchTasks();
    } catch (error) {
      console.error("Error adding recurring task:", error);
      Alert.alert("Error", "Failed to add recurring task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleVoiceCommand = (taskData: Partial<Task>) => {
    // Handle voice command
    console.log('Voice command task:', taskData);
    // You can add logic here to create a task from the voice command
  };

  const handleMoodSelect = (mood: string) => {
    setCurrentMood(mood);
    setShowMoodCheckup(false);
  };

  const handleBackPress = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: handleSignOut
        }
      ]
    );
  };

  const handleTaskCompletion = async () => {
    try {
      // Update achievements progress
      const updatedAchievements = achievements.map(achievement => {
        if (achievement.id === 'first_task' && !achievement.completed) {
          return { ...achievement, progress: 1, completed: true };
        }
        if (achievement.id === 'task_master') {
          const newProgress = Math.min(achievement.progress + 1, achievement.total);
          return {
            ...achievement,
            progress: newProgress,
            completed: newProgress >= achievement.total
          };
        }
        return achievement;
      });

      setAchievements(updatedAchievements);

      // Check for daily task completion achievement
      const today = new Date().toDateString();
      const completedToday = tasks.filter(task => 
        task.completed && 
        task.completedAt?.toDateString() === today
      ).length;

      if (completedToday >= 5) {
        const productiveDayAchievement = updatedAchievements.find(a => a.id === 'productive_day');
        if (productiveDayAchievement && !productiveDayAchievement.completed) {
          setAchievements(prev => prev.map(a => 
            a.id === 'productive_day' 
              ? { ...a, progress: a.total, completed: true }
              : a
          ));
        }
      }
    } catch (error) {
      console.error('Error updating achievements:', error);
    }
  };

  const handleTaskComplete = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const newStatus = !task.completed ? 'completed' as const : 'pending' as const;
      
      await updateDoc(taskRef, {
        completed: !task.completed,
        status: newStatus,
        completedAt: !task.completed ? Timestamp.now() : null
      });
      
      // Update local state
      setTasks(tasks.map(t => 
        t.id === task.id 
          ? { ...t, completed: !t.completed, status: newStatus }
          : t
      ));

      // Update achievements if task is completed
      if (!task.completed) {
        handleTaskCompletion();
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task status');
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[
      styles.taskItem,
      item.priority === 'high' && styles.highPriorityTask,
      item.priority === 'medium' && styles.mediumPriorityTask,
      item.priority === 'low' && styles.lowPriorityTask,
      isDark && styles.darkTaskItem
    ]}>
      <View style={styles.taskHeader}>
        <Text style={[
          styles.taskTitle,
          item.completed && styles.completedTaskTitle,
          isDark && styles.darkText
        ]}>
          {item.title}
        </Text>
        <View style={styles.taskActions}>
          <TouchableOpacity onPress={() => handleTaskComplete(item)}>
            <MaterialIcons
              name={item.completed ? "check-circle" : "radio-button-unchecked"}
              size={24}
              color={isDark ? (item.completed ? "#4CAF50" : "#666") : (item.completed ? "#4CAF50" : "#333")}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
            <MaterialIcons name="delete" size={24} color={isDark ? "#666" : "#333"} />
          </TouchableOpacity>
        </View>
      </View>
      {item.description ? (
        <Text style={[styles.taskDescription, isDark && styles.darkText]}>
          {item.description}
        </Text>
      ) : null}
      <View style={styles.taskFooter}>
        <View style={[styles.taskMeta, isDark && styles.darkTaskMeta]}>
          <MaterialIcons name="event" size={16} color={isDark ? "#666" : "#333"} />
          <Text style={[styles.taskMetaText, isDark && styles.darkText]}>
            {new Date(item.deadline.seconds * 1000).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.taskStatus, isDark && styles.darkTaskStatus]}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: item.completed ? "#4CAF50" : "#FFC107" }
          ]} />
          <Text style={[styles.statusText, isDark && styles.darkText]}>
            {item.completed ? "Completed" : "In Progress"}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderAnalytics = (isDark: boolean) => {
    // Get current date and calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Filter tasks by time periods
    const weeklyTasks = tasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= startOfWeek
    );
    const monthlyTasks = tasks.filter(task => 
      task.createdAt && new Date(task.createdAt) >= startOfMonth
    );

    // Calculate completion rates
    const weeklyCompletionRate = weeklyTasks.length > 0 
      ? (weeklyTasks.filter(task => task.completed).length / weeklyTasks.length) * 100 
      : 0;
    const monthlyCompletionRate = monthlyTasks.length > 0 
      ? (monthlyTasks.filter(task => task.completed).length / monthlyTasks.length) * 100 
      : 0;

    // Group tasks by category
    const categoryData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.category ?? 'other'] = (acc[task.category ?? 'other'] || 0) + 1;
      return acc;
    }, {});

    // Prepare chart data
    const categoryChartData = {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData) as number[]
      }]
    };

    // Calculate tasks by priority
    const priorityData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});

    const priorityChartData = {
      labels: Object.keys(priorityData),
      datasets: [{
        data: Object.values(priorityData) as number[]
      }]
    };

    return (
      <ScrollView style={styles.analyticsContainer}>
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>{tasks.length}</Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>Total Tasks</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>
              {tasks.filter(task => task.completed).length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>Completed</Text>
          </View>
          <View style={[styles.statCard, isDark && styles.darkStatCard]}>
            <Text style={[styles.statNumber, isDark && styles.darkStatNumber]}>
              {tasks.filter(task => !task.completed).length}
            </Text>
            <Text style={[styles.statLabel, isDark && styles.darkText]}>In Progress</Text>
          </View>
        </View>

        <View style={styles.periodStatsContainer}>
          <View style={[styles.periodCard, isDark && styles.darkPeriodCard]}>
            <Text style={[styles.periodTitle, isDark && styles.darkText]}>This Week</Text>
            <Text style={[styles.periodNumber, isDark && styles.darkStatNumber]}>{weeklyTasks.length}</Text>
            <Text style={[styles.periodLabel, isDark && styles.darkText]}>Tasks</Text>
            <View style={[styles.progressBar, isDark && styles.darkProgressBar]}>
              <View style={[styles.progressFill, { width: `${weeklyCompletionRate}%` }]} />
            </View>
            <Text style={[styles.completionRate, isDark && styles.darkText]}>{weeklyCompletionRate.toFixed(1)}% Complete</Text>
          </View>
          <View style={[styles.periodCard, isDark && styles.darkPeriodCard]}>
            <Text style={[styles.periodTitle, isDark && styles.darkText]}>This Month</Text>
            <Text style={[styles.periodNumber, isDark && styles.darkStatNumber]}>{monthlyTasks.length}</Text>
            <Text style={[styles.periodLabel, isDark && styles.darkText]}>Tasks</Text>
            <View style={[styles.progressBar, isDark && styles.darkProgressBar]}>
              <View style={[styles.progressFill, { width: `${monthlyCompletionRate}%` }]} />
            </View>
            <Text style={[styles.completionRate, isDark && styles.darkText]}>{monthlyCompletionRate.toFixed(1)}% Complete</Text>
          </View>
        </View>

        <View style={[styles.chartContainer, isDark && styles.darkChartContainer]}>
          <Text style={[styles.chartTitle, isDark && styles.darkText]}>Tasks by Category</Text>
          <BarChart
            data={categoryChartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" tasks"
            chartConfig={{
              backgroundColor: isDark ? '#1E1E1E' : '#ffffff',
              backgroundGradientFrom: isDark ? '#1E1E1E' : '#ffffff',
              backgroundGradientTo: isDark ? '#1E1E1E' : '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(33, 150, 243, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              barPercentage: 0.8
            }}
            style={styles.chart}
          />
        </View>

        <View style={[styles.chartContainer, isDark && styles.darkChartContainer]}>
          <Text style={[styles.chartTitle, isDark && styles.darkText]}>Tasks by Priority</Text>
          <PieChart
            data={Object.entries(priorityData).map(([priority, count]) => ({
              name: priority.charAt(0).toUpperCase() + priority.slice(1),
              count,
              color: priority === 'high' ? '#FF6B6B' : 
                     priority === 'medium' ? '#FFD93D' : '#6BCB77',
              legendFontColor: isDark ? '#fff' : '#7F7F7F',
            }))}
            width={Dimensions.get('window').width - 40}
            height={220}
            chartConfig={{
              color: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => isDark ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        </View>
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && styles.darkContainer]}>
      <View style={[styles.header, isDark && styles.darkHeader]}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={[styles.backButton, isDark && styles.darkButton]}
        >
          <MaterialIcons name="arrow-back" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, isDark && styles.darkText]}>Task Manager</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.headerButton, isDark && styles.darkHeaderButton]}
            onPress={() => router.push("/(app)/settings")}
          >
            <MaterialIcons name="settings" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, isDark && styles.darkHeaderButton]}
            onPress={handleSignOut}
          >
            <MaterialIcons name="logout" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={[styles.content, isDark && styles.darkContent]} contentContainerStyle={[styles.contentContainer, isDark && styles.darkContent]}>
        <MoodBasedSuggestions
          tasks={tasks}
          currentMood={currentMood}
          onSelectTask={handleTaskSelect}
          onOpenMoodCheckup={() => setShowMoodCheckup(true)}
          isDark={isDark}
        />

        {/* Quick Actions */}
        <View style={[styles.quickActionsCard, isDark && styles.darkCard]}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton]}
              onPress={() => router.push('/create-task')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#E8F5E9' }]}>
                <MaterialIcons name="add" size={24} color={isDark ? '#4CAF50' : '#4CAF50'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText]}>New Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton]}
              onPress={() => router.push('/create-recurring-task')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#E3F2FD' }]}>
                <MaterialIcons name="repeat" size={24} color={isDark ? '#2196F3' : '#2196F3'} />
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText]}>Recurring Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, isDark && styles.darkActionButton]}
              onPress={() => router.push('/pomodoro')}
            >
              <View style={[styles.actionIcon, isDark && styles.darkActionIcon, { backgroundColor: isDark ? '#1E1E1E' : '#F3E5F5' }]}>
                <MaterialIcons name="timer" size={24} color={isDark ? '#9C27B0' : '#9C27B0'} />
                {pomodoroSessions > 0 && (
                  <View style={styles.sessionBadge}>
                    <Text style={styles.sessionBadgeText}>{pomodoroSessions}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.actionButtonText, isDark && styles.darkText]}>Pomodoro</Text>
            </TouchableOpacity>
            <View style={[styles.actionButton, isDark && styles.darkActionButton]}>
              <VoiceCommandButton onTaskCreated={handleVoiceCommand} isDark={isDark} />
            </View>
          </View>
        </View>

        {/* Main Content Tabs */}
        <View style={[styles.mainContent, isDark && styles.darkCard]}>
          <View style={[styles.tabButtons, isDark && styles.darkTabButtons]}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'tasks' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialIcons 
                name="list" 
                size={24} 
                color={activeTab === 'tasks' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'tasks' && styles.activeTabButtonText,
                isDark && styles.darkText
              ]}>
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'analytics' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('analytics')}
            >
              <MaterialIcons 
                name="analytics" 
                size={24} 
                color={activeTab === 'analytics' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'analytics' && styles.activeTabButtonText,
                isDark && styles.darkText
              ]}>
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'achievements' && [styles.activeTabButton, isDark && { backgroundColor: '#333' }]
              ]}
              onPress={() => setActiveTab('achievements')}
            >
              <MaterialIcons 
                name="emoji-events" 
                size={24} 
                color={activeTab === 'achievements' ? '#4CAF50' : (isDark ? '#666' : '#666')} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'achievements' && styles.activeTabButtonText,
                isDark && styles.darkText
              ]}>
                Achievements
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContent}>
            {activeTab === 'tasks' && (
              <>
                <TaskFilters
                  onSearch={setSearchQuery}
                  onSort={setSortKey}
                  onFilter={setStatusFilter}
                  isDark={isDark}
                />
                <View style={styles.filterContainer}>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilter === 'all' && styles.filterButtonActive
                    ]}
                    onPress={() => setStatusFilter('all')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilter === 'all' && styles.filterButtonTextActive
                    ]}>All</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilter === 'pending' && styles.filterButtonActive
                    ]}
                    onPress={() => setStatusFilter('pending')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilter === 'pending' && styles.filterButtonTextActive
                    ]}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.filterButton,
                      isDark && styles.darkFilterButton,
                      statusFilter === 'completed' && styles.filterButtonActive
                    ]}
                    onPress={() => setStatusFilter('completed')}
                  >
                    <Text style={[
                      styles.filterButtonText,
                      isDark && styles.darkText,
                      statusFilter === 'completed' && styles.filterButtonTextActive
                    ]}>Completed</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.taskListContainer}>
                  <FlatList
                    data={filteredTasks}
                    renderItem={renderTaskItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.taskList}
                    nestedScrollEnabled
                    scrollEnabled={false}
                  />
                </View>
              </>
            )}

            {activeTab === 'analytics' && renderAnalytics(isDark)}

            {activeTab === 'achievements' && (
              <View style={styles.achievementsContainer}>
                <Achievements
                  achievements={achievements}
                  userPoints={userPoints}
                  onClaimReward={handleClaimAchievement}
                  isDark={isDark}
                />
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {showRecurringForm && (
        <RecurringTaskForm
          onCreateTask={handleRecurringTaskSubmit}
          isDark={isDark}
        />
      )}

      <MoodCheckup
        visible={showMoodCheckup}
        onClose={() => setShowMoodCheckup(false)}
        onMoodSelect={handleMoodSelect}
        isDark={isDark}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    elevation: 2,
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  darkHeaderButton: {
    backgroundColor: '#2C2C2C',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F5F6F8',
  },
  darkContent: {
    backgroundColor: '#121212',
  },
  taskListContainer: {
    minHeight: 200,
  },
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    width: '45%',
    padding: 8,
    borderRadius: 8,
  },
  darkActionButton: {
    backgroundColor: '#1E1E1E',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkActionIcon: {
    backgroundColor: '#1E1E1E',
    elevation: 0,
    shadowColor: 'transparent',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  mainContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#E8F5E9',
  },
  tabButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  taskList: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsContainer: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  darkStatCard: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  darkStatNumber: {
    color: '#64B5F6',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  periodStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  periodCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  darkPeriodCard: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  periodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  periodNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  periodLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  darkProgressBar: {
    backgroundColor: '#333',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  completionRate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  darkChartContainer: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    alignItems: 'center',
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
  priorityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButton: {
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  signOutButton: {
    padding: 8,
  },
  achievementsContainer: {
    flex: 1,
    padding: 16,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  darkTaskItem: {
    backgroundColor: '#1E1E1E',
    shadowColor: 'transparent',
    elevation: 0,
  },
  highPriorityTask: {
    borderLeftColor: '#f44336',
    borderLeftWidth: 4,
  },
  mediumPriorityTask: {
    borderLeftColor: '#ff9800',
    borderLeftWidth: 4,
  },
  lowPriorityTask: {
    borderLeftColor: '#4caf50',
    borderLeftWidth: 4,
  },
  highPriorityBadge: {
    backgroundColor: '#ffebee',
  },
  mediumPriorityBadge: {
    backgroundColor: '#fff3e0',
  },
  lowPriorityBadge: {
    backgroundColor: '#e8f5e9',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 16,
    lineHeight: 22,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskMeta: {
    backgroundColor: '#333',
  },
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  darkTaskStatus: {
    backgroundColor: '#333',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  datePickerText: {
    fontSize: 16,
    color: '#333',
  },
  completedTaskTitle: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  completedTaskText: {
    color: '#888',
  },
  pomodoroModal: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    padding: 8,
  },
  pomodoroStats: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  pomodoroStatsText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  darkContainer: {
    backgroundColor: '#121212',
  },
  darkHeader: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  darkButton: {
    backgroundColor: '#333',
  },
  darkText: {
    color: '#fff',
  },
  darkCard: {
    backgroundColor: '#1E1E1E',
  },
  darkTabButtons: {
    backgroundColor: '#1E1E1E',
    borderBottomColor: '#333',
  },
  sessionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 2,
  },
  sessionBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  searchContainer: {
    padding: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
    fontSize: 16,
  },
  darkSearchInput: {
    backgroundColor: '#333',
    borderColor: '#555',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  darkFilterButton: {
    backgroundColor: '#2C2C2C',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
});

export default HomeScreen;

