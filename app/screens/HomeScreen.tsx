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
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { signOut } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, orderBy, deleteDoc } from "firebase/firestore";
import { Task } from "@/types";
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BarChart } from "react-native-chart-kit";
import PomodoroTimer from '../../components/PomodoroTimer';
import TaskFilters from '../../components/TaskFilters';
import { Achievement, Achievements } from '../../components/Achievements';
import MoodBasedTasks from '../../components/MoodBasedTasks';
import RecurringTaskForm from '../../components/RecurringTaskForm';
import VoiceCommandButton from '../../components/VoiceCommandButton';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const HomeScreen = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState(new Date());
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [lastMoodSelectionDate, setLastMoodSelectionDate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'analytics' | 'achievements'>('tasks');
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [sortKey, setSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [userPoints, setUserPoints] = useState(0);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', deadline: new Date(), priority: 'medium' });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moodSelectionCount, setMoodSelectionCount] = useState(0);
  const [lastMoodSelectionTime, setLastMoodSelectionTime] = useState<string | null>(null);

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
        
        // Reset count if it's a new day
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
      setLoading(true);
      const q = query(
        collection(db, 'tasks'),
        where('userId', '==', auth.currentUser?.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedTasks = querySnapshot.docs.map(doc => {
          const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          dueDate: data.deadline?.toDate(),
          priority: data.priority,
          category: data.category,
          createdAt: data.createdAt.toDate(),
          completed: data.completed || false,
          status: data.status || 'pending',
          userId: data.userId
        } as Task;
      });

      setTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      Alert.alert('Error', 'Failed to fetch tasks. Please try again.');
    } finally {
      setLoading(false);
      }
    };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !newTaskDescription.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      setLoading(true);
      const category = categorizeTask(newTaskTitle);
      
      await addDoc(collection(db, "tasks"), {
        title: newTaskTitle,
        description: newTaskDescription,
        deadline: Timestamp.fromDate(newTaskDeadline),
        priority: newTaskPriority,
        status: TASK_STATUS.PENDING,
        category,
        userId,
        createdAt: Timestamp.now(),
        completed: false,
        isRecurring: false,
        mood: currentMood
      });

      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDeadline(new Date());
      setNewTaskPriority("medium");
      await fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      Alert.alert("Error", "Failed to add task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        status: newStatus,
        completedAt: newStatus === TASK_STATUS.COMPLETED ? Timestamp.now() : null
      });
      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
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
        description: taskData.description,
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
        mood: currentMood
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

  const renderTaskItem = ({ item }: { item: Task }) => (
    <View style={[
      styles.taskItem,
      item.priority === 'high' && styles.highPriorityTask,
      item.priority === 'medium' && styles.mediumPriorityTask,
      item.priority === 'low' && styles.lowPriorityTask,
    ]}>
      <View style={styles.taskHeader}>
        <Text style={[
          styles.taskTitle,
          item.priority === 'high' && styles.highPriorityText,
          item.priority === 'medium' && styles.mediumPriorityText,
          item.priority === 'low' && styles.lowPriorityText,
        ]}>{item.title}</Text>
        <View style={styles.taskActions}>
          <TouchableOpacity
            onPress={() => handleUpdateTaskStatus(item.id, TASK_STATUS.COMPLETED)}
            style={styles.actionButton}
          >
            <MaterialIcons name="check-circle-outline" size={24} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTask(item.id)}
            style={styles.actionButton}
          >
            <MaterialIcons name="delete-outline" size={24} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.taskDescription}>{item.description}</Text>
      <View style={styles.taskFooter}>
        <View style={styles.taskMeta}>
          <MaterialIcons name="category" size={16} color="#666" />
          <Text style={styles.taskMetaText}>{item.category}</Text>
        </View>
        <View style={styles.taskMeta}>
          <MaterialIcons name="schedule" size={16} color="#666" />
          <Text style={styles.taskMetaText}>
            {item.dueDate?.toLocaleDateString() || 'No date'}
          </Text>
        </View>
        <View style={[
          styles.taskMeta,
          item.priority === 'high' && styles.highPriorityBadge,
          item.priority === 'medium' && styles.mediumPriorityBadge,
          item.priority === 'low' && styles.lowPriorityBadge,
        ]}>
          <MaterialIcons 
            name="flag" 
            size={16} 
            color={
              item.priority === 'high' ? '#f44336' :
              item.priority === 'medium' ? '#ff9800' :
              '#4caf50'
            } 
          />
          <Text style={[
            styles.taskMetaText,
            item.priority === 'high' && styles.highPriorityText,
            item.priority === 'medium' && styles.mediumPriorityText,
            item.priority === 'low' && styles.lowPriorityText,
          ]}>{item.priority}</Text>
        </View>
      </View>
      <View style={styles.taskStatus}>
        <View style={[
          styles.statusIndicator,
          { backgroundColor: item.completed ? '#4CAF50' : '#FFC107' }
        ]} />
        <Text style={styles.statusText}>{item.completed ? 'Completed' : 'In Progress'}</Text>
      </View>
    </View>
  );

  const renderAnalytics = () => {
    const categoryData = tasks.reduce((acc: { [key: string]: number }, task) => {
      acc[task.category ?? 'other'] = (acc[task.category ?? 'other'] || 0) + 1;
      return acc;
    }, {});

    const chartData = {
      labels: Object.keys(categoryData),
      datasets: [{
        data: Object.values(categoryData) as number[]
      }]
  };

  return (
      <ScrollView style={styles.analyticsContainer}>
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{tasks.length}</Text>
            <Text style={styles.statLabel}>Total Tasks</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {tasks.filter(task => task.completed).length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {tasks.filter(task => !task.completed).length}
            </Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Tasks by Category</Text>
          <BarChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={220}
            yAxisLabel=""
            yAxisSuffix=" tasks"
            chartConfig={{
              backgroundColor: '#ffffff',
              backgroundGradientFrom: '#ffffff',
              backgroundGradientTo: '#ffffff',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
              style: {
                borderRadius: 16
              }
            }}
            style={styles.chart}
          />
        </View>
      </ScrollView>
    );
  };

  const renderMoodPicker = () => (
      <View style={styles.modalContainer}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>Select Your Mood</Text>
        <Text style={styles.moodSubtitle}>Check-in {moodSelectionCount}/3</Text>
          <View style={styles.moodButtons}>
            {MOODS.map((mood) => (
              <TouchableOpacity
                key={mood.id}
                style={[
                  styles.moodButton,
                  currentMood === mood.id && styles.selectedMoodButton,
                ]}
              onPress={() => {
                setSelectedMood(mood.id);
                setShowMoodPicker(false);
              }}
              >
                <Text style={styles.moodIcon}>{mood.icon}</Text>
                <Text style={styles.moodLabel}>{mood.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );

  const renderMoodBasedSuggestions = () => {
    if (!selectedMood) return null;

    const suggestedTasks = tasks.filter((task) => {
      if (selectedMood === "energetic") {
        return task.priority === "high" && !task.completed;
      } else if (selectedMood === "focused") {
        return task.priority === "medium" && !task.completed;
      } else if (selectedMood === "tired") {
        return task.priority === "low" && !task.completed;
      }
      return false;
    });

    if (suggestedTasks.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Task Suggestions</Text>
        {showSuggestions && (
          <View style={styles.suggestionsList}>
            {suggestedTasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={[
                  styles.suggestionItem,
                  task.priority === 'high' && styles.highPriorityTask,
                  task.priority === 'medium' && styles.mediumPriorityTask,
                  task.priority === 'low' && styles.lowPriorityTask,
                ]}
                onPress={() => handleTaskSelect(task.id)}
              >
                <Text style={styles.suggestionTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                <Text style={styles.suggestionCategory}>
                  {task.category || 'Other'}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
        )}
        <TouchableOpacity 
          style={styles.toggleButton}
          onPress={() => setShowSuggestions(!showSuggestions)}
        >
          <Text style={styles.toggleButtonText}>
            {showSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
          </Text>
          <MaterialIcons 
            name={showSuggestions ? "expand-less" : "expand-more"} 
            size={24} 
            color="#666" 
          />
        </TouchableOpacity>
      </View>
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
    <View style={styles.container}>
      <View style={styles.header}>
          <Text style={styles.headerTitle}>Task Manager</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <MaterialIcons name="logout" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Mood Section */}
        {showMoodPicker && (
          <View style={styles.moodCard}>
            <Text style={styles.cardTitle}>How are you feeling today?</Text>
            <Text style={styles.moodSubtitle}>Check-in {moodSelectionCount}/3</Text>
            <View style={styles.moodButtons}>
              {MOODS.map((mood) => (
                <TouchableOpacity
                  key={mood.id}
                  style={[
                    styles.moodButton,
                    currentMood === mood.id && styles.selectedMoodButton,
                  ]}
                  onPress={() => {
                    setSelectedMood(mood.id);
                    setShowMoodPicker(false);
                  }}
                >
                  <Text style={styles.moodIcon}>{mood.icon}</Text>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Task Suggestions */}
        {selectedMood && renderMoodBasedSuggestions()}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowNewTask(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <MaterialIcons name="add" size={24} color="#4CAF50" />
              </View>
              <Text style={styles.actionButtonText}>New Task</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowRecurringForm(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
                <MaterialIcons name="repeat" size={24} color="#2196F3" />
              </View>
              <Text style={styles.actionButtonText}>Recurring</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowPomodoro(true)}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3E5F5' }]}>
                <MaterialIcons name="timer" size={24} color="#9C27B0" />
              </View>
              <Text style={styles.actionButtonText}>Pomodoro</Text>
            </TouchableOpacity>
            <View style={styles.actionButton}>
              <VoiceCommandButton onTaskCreated={handleVoiceCommand} />
            </View>
          </View>
        </View>

        {/* Main Content Tabs */}
        <View style={styles.mainContent}>
          <View style={styles.tabButtons}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'tasks' && styles.activeTabButton]}
              onPress={() => setActiveTab('tasks')}
            >
              <MaterialIcons 
                name="list" 
                size={24} 
                color={activeTab === 'tasks' ? '#4CAF50' : '#666'} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'tasks' && styles.activeTabButtonText
              ]}>
                Tasks
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'analytics' && styles.activeTabButton]}
              onPress={() => setActiveTab('analytics')}
            >
              <MaterialIcons 
                name="analytics" 
                size={24} 
                color={activeTab === 'analytics' ? '#4CAF50' : '#666'} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'analytics' && styles.activeTabButtonText
              ]}>
                Analytics
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'achievements' && styles.activeTabButton]}
              onPress={() => setActiveTab('achievements')}
            >
              <MaterialIcons 
                name="emoji-events" 
                size={24} 
                color={activeTab === 'achievements' ? '#4CAF50' : '#666'} 
              />
              <Text style={[
                styles.tabButtonText, 
                activeTab === 'achievements' && styles.activeTabButtonText
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
                />
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

            {activeTab === 'analytics' && renderAnalytics()}

            {activeTab === 'achievements' && (
              <View style={styles.achievementsContainer}>
                <Achievements
                  achievements={achievements}
                  userPoints={userPoints}
                  onClaimReward={handleClaimAchievement}
                />
          </View>
            )}
          </View>
        </View>
      </ScrollView>

      {showNewTask && (
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task Title"
              value={newTask.title}
              onChangeText={(text) => setNewTask({ ...newTask, title: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={newTask.description}
              onChangeText={(text) => setNewTask({ ...newTask, description: text })}
              multiline
            />
            <View style={styles.priorityButtons}>
              {['low', 'medium', 'high'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityButton,
                    newTask.priority === p && (p === 'low' ? styles.lowPriority :
                    p === 'medium' ? styles.mediumPriority :
                    styles.highPriority),
                  ]}
                  onPress={() => setNewTask({ ...newTask, priority: p as 'low' | 'medium' | 'high' })}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      p === 'low' ? styles.lowPriorityText :
                      p === 'medium' ? styles.mediumPriorityText :
                      styles.highPriorityText,
                    ]}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNewTask(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleAddTask}
              >
                <Text style={styles.modalButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showPomodoro && (
        <PomodoroTimer
          onComplete={() => {
            setAchievements(prev =>
              prev.map(achievement =>
                achievement.id === 'pomodoro_master'
                  ? {
                      ...achievement,
                      progress: achievement.progress + 1,
                      completed: achievement.progress + 1 >= achievement.total,
                    }
                  : achievement
              )
            );
            Alert.alert('Pomodoro Complete!', 'Take a break and stay productive!');
            setShowPomodoro(false);
          }}
        />
      )}

      {showRecurringForm && (
        <RecurringTaskForm
          onSubmit={handleRecurringTaskSubmit}
          onCancel={() => setShowRecurringForm(false)}
        />
      )}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32, // Add extra padding at the bottom
  },
  taskListContainer: {
    minHeight: 200, // Minimum height to show some tasks
  },
  moodCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  moodSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  moodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  moodButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  selectedMoodButton: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#2196F3',
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
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  suggestionsContainer: {
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
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  suggestionsList: {
    marginBottom: 12,
  },
  suggestionItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  suggestionCategory: {
    fontSize: 14,
    color: '#666',
  },
  toggleButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 14,
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
  taskMetaText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  taskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
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
  moodIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});

export default HomeScreen;