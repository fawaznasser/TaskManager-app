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
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { signOut } from "firebase/auth";
import { auth, db } from "@/config/firebase";
import { router } from "expo-router";
import { collection, getDocs, addDoc, Timestamp, query, where, updateDoc, doc, orderBy, deleteDoc, setDoc, getDoc, increment, writeBatch } from "firebase/firestore";
import { Task } from "@/types";
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { BarChart } from "react-native-chart-kit";
import PomodoroTimer from '../components/PomodoroTimer';
import TaskFilters from '../components/TaskFilters';
import { Achievement, Achievements } from '../components/Achievements';
import MoodBasedTasks from '../components/MoodBasedTasks';
import RecurringTaskForm from '../components/RecurringTaskForm';
import VoiceCommandButton from '../components/VoiceCommandButton';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MobileContainer from './_layout/mobile-container';

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
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'deadline' | 'priority' | 'category'>('deadline');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [showRecurringForm, setShowRecurringForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({ 
    title: '', 
    description: '', 
    dueDate: new Date(), 
    priority: 'medium' as 'low' | 'medium' | 'high'
  });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [moodSelectionCount, setMoodSelectionCount] = useState(0);
  const [lastMoodSelectionTime, setLastMoodSelectionTime] = useState<string | null>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const analyticsRef = React.useRef<View>(null);
  const achievementsRef = React.useRef<View>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.log("No user logged in, redirecting to login");
        router.replace("/(auth)/login");
      } else {
        console.log("User authenticated:", user.uid);
        try {
          // Initialize user document and collections
          await initializeUserData(user.uid);
          console.log("User data initialized");
          
          // Fetch tasks
          await fetchTasks();
          console.log("Tasks fetched");
          
          // Load achievements
          await loadAchievements(user.uid);
          console.log("Achievements loaded");
        } catch (error) {
          console.error("Error during initialization:", error);
          if (error instanceof Error) {
            Alert.alert("Error", `Initialization failed: ${error.message}`);
          }
        }
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
            task => 
              task.completed && 
              task.createdAt && 
              task.createdAt.toDateString() === today.toDateString()
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

  const initializeUserData = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(userDocRef, {
          createdAt: Timestamp.now(),
          stats: {
            totalTasks: 0,
            completedTasks: 0,
            currentStreak: 0,
            longestStreak: 0,
            points: 0
          },
          settings: {
            theme: 'light',
            notifications: true,
            soundEffects: true
          }
        });
        
        // Initialize achievements collection
        await initializeAchievements(userId);
        
        // Add an example task
        const tasksRef = collection(userDocRef, 'tasks');
        await addDoc(tasksRef, {
          title: "Welcome to Task Manager!",
          description: "This is an example task to help you get started. Try completing it!",
          deadline: Timestamp.fromDate(new Date(Date.now() + 86400000)), // Tomorrow
          priority: "medium",
          status: TASK_STATUS.PENDING,
          category: "Getting Started",
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          userId: userId,
          completedAt: null
        });
      }
    } catch (error) {
      console.error("Error initializing user data:", error);
      Alert.alert("Error", "Failed to initialize user data. Please try again.");
    }
  };

  const initializeAchievements = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const achievementsRef = collection(userDocRef, 'achievements');
      
      // Check if achievements collection is empty
      const achievementsSnapshot = await getDocs(achievementsRef);
      
      if (achievementsSnapshot.empty) {
        // Add initial achievements to the user's achievements collection
        const batch = writeBatch(db);
        
        INITIAL_ACHIEVEMENTS.forEach(achievement => {
          const newAchievementRef = doc(achievementsRef);
          batch.set(newAchievementRef, {
            ...achievement,
            userId: userId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
          });
        });
        
        await batch.commit();
      }
    } catch (error) {
      console.error("Error initializing achievements:", error);
      Alert.alert("Error", "Failed to initialize achievements. Please try again.");
    }
  };

  const loadAchievements = async (userId: string) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const achievementsRef = collection(userDocRef, 'achievements');
      const achievementsSnapshot = await getDocs(achievementsRef);
      
      if (!achievementsSnapshot.empty) {
        const userAchievements = achievementsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Achievement[];
        
        setAchievements(userAchievements);
        
        // Calculate total points from claimed achievements
        const points = userAchievements
          .filter(achievement => achievement.claimed)
          .reduce((total, achievement) => total + achievement.points, 0);
        
        setUserPoints(points);
      }
    } catch (error) {
      console.error("Error loading achievements:", error);
      Alert.alert("Error", "Failed to load achievements. Please try again.");
    }
  };

  const fetchTasks = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      const tasksRef = collection(userDocRef, 'tasks');
      const q = query(tasksRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const fetchedTasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline instanceof Date ? data.deadline : data.deadline.toDate(),
          priority: data.priority,
          status: data.status,
          category: data.category,
          createdAt: data.createdAt instanceof Date ? data.createdAt : data.createdAt.toDate(),
          updatedAt: data.updatedAt instanceof Date ? data.updatedAt : data.updatedAt.toDate(),
          completedAt: data.completedAt ? (data.completedAt instanceof Date ? data.completedAt : data.completedAt.toDate()) : null,
          userId: data.userId,
          completed: data.status === TASK_STATUS.COMPLETED,
          isRecurring: data.isRecurring || false,
          recurringType: data.recurringType,
          recurringInterval: data.recurringInterval,
          recurringEndDate: data.recurringEndDate ? data.recurringEndDate.toDate() : undefined,
          parentTaskId: data.parentTaskId,
          mood: data.mood
        } as Task;
      });

      setTasks(fetchedTasks);
      setFilteredTasks(fetchedTasks);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      Alert.alert("Error", "Failed to fetch tasks. Please try again.");
    }
  };

  const handleAddTask = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        console.error("No user ID available");
        router.replace("/(auth)/login");
        return;
      }

      // Validate input
      if (!newTask.title?.trim()) {
        Alert.alert("Error", "Please enter a task title");
        return;
      }

      console.log("Creating task for user:", userId);

      // First make sure the user document exists
      const userDocRef = doc(db, 'users', userId);
      const userSnapshot = await getDoc(userDocRef);
      
      if (!userSnapshot.exists()) {
        console.log("User document does not exist, creating it...");
        // Create the user document first
        await setDoc(userDocRef, {
          createdAt: Timestamp.now(),
          email: auth.currentUser?.email || "",
          stats: {
            totalTasks: 0,
            completedTasks: 0
          },
          settings: {
            theme: 'light',
            notifications: true
          }
        });
        console.log("User document created successfully");
      }

      // Now create the task
      console.log("Adding task to user's tasks subcollection");
      const tasksRef = collection(userDocRef, 'tasks');
      
      // Use the task data from the form
      const newTaskData = {
        title: newTask.title.trim(),
        description: newTask.description?.trim() || "",
        deadline: Timestamp.fromDate(newTask.dueDate || new Date()),
        priority: newTask.priority || "medium",
        status: "pending",
        category: categorizeTask(newTask.title),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        userId: userId
      };

      console.log("Task data being saved:", newTaskData);
      const docRef = await addDoc(tasksRef, newTaskData);
      console.log("Task added successfully with ID:", docRef.id);
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        dueDate: new Date(),
        priority: 'medium'
      });
      setShowNewTask(false);
      
      // Show success message
      Alert.alert("Success", "Task created successfully!");
      
      // Fetch tasks again
      await fetchTasks();
    } catch (error) {
      console.error("Error adding task:", error);
      // More detailed error message
      if (error instanceof Error) {
        Alert.alert("Error", `Failed to add task: ${error.message}`);
      } else {
        Alert.alert("Error", "Failed to add task. Please try again.");
      }
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      const taskRef = doc(userDocRef, 'tasks', taskId);
      const updateData: {
        status: string;
        updatedAt: Timestamp;
        completedAt?: Timestamp | null;
      } = {
        status: newStatus,
        updatedAt: Timestamp.now()
      };

      if (newStatus === TASK_STATUS.COMPLETED) {
        updateData.completedAt = Timestamp.now();
        
        // Update user stats
        await updateDoc(userDocRef, {
          'stats.completedTasks': increment(1)
        });

        // Update "task_master" achievement
        await updateAchievement(userId, 'task_master', 1);

        // Check if we need to update "productive_day" achievement
        const today = new Date().toDateString();
        const completedToday = tasks.filter(task => 
          task.completed && 
          task.createdAt && 
          task.createdAt.toDateString() === today
        ).length;
        
        if (completedToday >= 4) { // Already completed 4, this will be the 5th
          await updateAchievement(userId, 'productive_day', 1);
        }
      } else if (newStatus !== TASK_STATUS.COMPLETED) {
        // If a task is being uncompleted, set completedAt to null
        updateData.completedAt = null;
        
        // Decrement completed tasks count if it was previously completed
        const taskSnapshot = await getDoc(taskRef);
        if (taskSnapshot.exists() && taskSnapshot.data().status === TASK_STATUS.COMPLETED) {
          await updateDoc(userDocRef, {
            'stats.completedTasks': increment(-1)
          });
        }
      }

      await updateDoc(taskRef, updateData);
      await fetchTasks();
    } catch (error) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", "Failed to update task status. Please try again.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      const taskRef = doc(userDocRef, 'tasks', taskId);
      
      // Check if the task was completed before deleting it
      const taskSnapshot = await getDoc(taskRef);
      if (taskSnapshot.exists()) {
        const taskData = taskSnapshot.data();
        
        // Update stats
        await updateDoc(userDocRef, {
          'stats.totalTasks': increment(-1)
        });
        
        // If task was completed, also decrement completed tasks
        if (taskData.status === TASK_STATUS.COMPLETED) {
          await updateDoc(userDocRef, {
            'stats.completedTasks': increment(-1)
          });
        }
      }
      
      await deleteDoc(taskRef);
      await fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      Alert.alert("Error", "Failed to delete task. Please try again.");
    }
  };

  const updateAchievement = async (userId: string, achievementId: string, progressIncrement: number) => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const achievementsRef = collection(userDocRef, 'achievements');
      const q = query(achievementsRef, where('id', '==', achievementId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const achievementDoc = querySnapshot.docs[0];
        const achievement = achievementDoc.data() as Achievement;
        
        if (achievement.completed) {
          return; // Achievement already completed
        }
        
        let newProgress = achievement.progress + progressIncrement;
        
        // Cap progress at the total
        if (newProgress > achievement.total) {
          newProgress = achievement.total;
        }
        
        const completed = newProgress >= achievement.total;
        
        await updateDoc(doc(achievementsRef, achievementDoc.id), {
          progress: newProgress,
          completed: completed,
          updatedAt: Timestamp.now()
        });
        
        // Notify user if achievement completed
        if (completed) {
          Alert.alert(
            "Achievement Unlocked!",
            `You've earned the "${achievement.title}" achievement! Claim it in the Achievements tab to get ${achievement.points} points.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating achievement:", error);
    }
  };

  const handleClaimAchievement = async (achievementId: string) => {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        router.replace("/(auth)/login");
        return;
      }

      const userDocRef = doc(db, 'users', userId);
      const achievementsRef = collection(userDocRef, 'achievements');
      const q = query(achievementsRef, where('id', '==', achievementId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const achievementDoc = querySnapshot.docs[0];
        const achievement = achievementDoc.data() as Achievement;
        
        if (achievement.completed && !achievement.claimed) {
          // Update achievement
          await updateDoc(doc(achievementsRef, achievementDoc.id), {
            claimed: true,
            updatedAt: Timestamp.now()
          });
          
          // Update user points
          await updateDoc(userDocRef, {
            'stats.points': increment(achievement.points)
          });
          
          // Update local state
          setUserPoints(prev => prev + achievement.points);
          
          // Update achievements state
          loadAchievements(userId);
          
          Alert.alert(
            "Achievement Claimed!",
            `You've claimed ${achievement.points} points for completing "${achievement.title}".`
          );
        }
      }
    } catch (error) {
      console.error("Error claiming achievement:", error);
      Alert.alert("Error", "Failed to claim achievement. Please try again.");
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
    console.log("Voice command received:", taskData);
    setNewTask(taskData);
    setShowNewTask(true);
  };

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const currentDate = selectedDate || newTask.dueDate;
    setShowDatePicker(Platform.OS === 'ios');
    setNewTask({...newTask, dueDate: currentDate});
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
            style={styles.taskActionButton}
          >
            <MaterialIcons name="check-circle-outline" size={28} color="#4CAF50" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteTask(item.id)}
            style={styles.taskActionButton}
          >
            <MaterialIcons name="delete-outline" size={28} color="#F44336" />
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

  const scrollToSection = (ref: React.RefObject<View>) => {
    if (ref.current && scrollViewRef.current) {
      ref.current.measureLayout(
        // @ts-ignore - This is necessary for the RN API
        scrollViewRef.current,
        (_, y) => {
          scrollViewRef.current?.scrollTo({ y, animated: true });
        },
        () => console.log('Failed to measure')
      );
    }
  };

  if (loading) {
    return (
      <MobileContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </MobileContainer>
    );
  }

  return (
    <MobileContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Task Manager</Text>
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
            <MaterialIcons name="logout" size={24} color="#FF6B6B" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          ref={scrollViewRef}
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
        >
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
            <Text style={styles.cardTitle}>Quick Actions</Text>
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
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => scrollToSection(achievementsRef)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                  <MaterialIcons name="emoji-events" size={24} color="#FF9800" />
                </View>
                <Text style={styles.actionButtonText}>Achievements</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => scrollToSection(analyticsRef)}
              >
                <View style={[styles.actionIcon, { backgroundColor: '#E1F5FE' }]}>
                  <MaterialIcons name="insert-chart" size={24} color="#03A9F4" />
                </View>
                <Text style={styles.actionButtonText}>Analytics</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
              >
                <VoiceCommandButton onTaskCreated={handleVoiceCommand} />
                <Text style={styles.actionButtonText}>Voice</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Main Content - Tasks, Analytics, and Achievements */}
          <View style={styles.mainContent}>
            <View style={styles.tabContent}>
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
              
              {/* Analytics Section */}
              <View ref={analyticsRef} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Analytics</Text>
                <View style={styles.analyticsCard}>
                  <Text style={styles.analyticsSubtitle}>Task Completion</Text>
                  <BarChart
                    data={{
                      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                      datasets: [
                        {
                          data: [
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 1).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 2).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 3).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 4).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 5).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 6).length,
                            tasks.filter(task => task.completed && task.createdAt && new Date(task.createdAt).getDay() === 0).length,
                          ]
                        }
                      ]
                    }}
                    width={Dimensions.get("window").width - (Dimensions.get("window").width < 400 ? 40 : 64)}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: "#fff",
                      backgroundGradientFrom: "#fff",
                      backgroundGradientTo: "#fff",
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                      style: {
                        borderRadius: 16
                      },
                      propsForLabels: {
                        fontSize: Dimensions.get("window").width < 400 ? 10 : 12,
                      }
                    }}
                    style={{
                      marginVertical: 8,
                      borderRadius: 16
                    }}
                  />
                </View>
                
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
                      <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
                    </View>
                    <Text style={styles.statValue}>
                      {tasks.filter(task => task.completed).length}
                    </Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
                      <MaterialIcons name="hourglass-empty" size={24} color="#FF9800" />
                    </View>
                    <Text style={styles.statValue}>
                      {tasks.filter(task => !task.completed).length}
                    </Text>
                    <Text style={styles.statLabel}>Pending</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#E1F5FE' }]}>
                      <MaterialIcons name="trending-up" size={24} color="#03A9F4" />
                    </View>
                    <Text style={styles.statValue}>
                      {Math.round((tasks.filter(task => task.completed).length / 
                        (tasks.length || 1)) * 100)}%
                    </Text>
                    <Text style={styles.statLabel}>Completion Rate</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <View style={[styles.statIcon, { backgroundColor: '#F3E5F5' }]}>
                      <MaterialIcons name="emoji-events" size={24} color="#9C27B0" />
                    </View>
                    <Text style={styles.statValue}>{userPoints}</Text>
                    <Text style={styles.statLabel}>Points</Text>
                  </View>
                </View>
              </View>
              
              {/* Achievements Section */}
              <View ref={achievementsRef} style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsGrid}>
                  {achievements.map((achievement) => (
                    <View key={achievement.id} style={styles.achievementCard}>
                      <View 
                        style={[
                          styles.achievementIconContainer, 
                          achievement.completed ? styles.achievementCompleted : {}
                        ]}
                      >
                        <MaterialIcons 
                          name={achievement.icon as any} 
                          size={32} 
                          color={achievement.completed ? "#fff" : "#9E9E9E"} 
                        />
                      </View>
                      <Text style={styles.achievementTitle}>{achievement.title}</Text>
                      <Text style={styles.achievementDescription}>{achievement.description}</Text>
                      <View style={styles.achievementProgressContainer}>
                        <View 
                          style={[
                            styles.achievementProgressBar,
                            { flex: achievement.progress / achievement.total }
                          ]} 
                        />
                      </View>
                      <Text style={styles.achievementProgress}>
                        {achievement.progress}/{achievement.total}
                      </Text>
                      {achievement.completed && !achievement.claimed && (
                        <TouchableOpacity
                          style={styles.claimButton}
                          onPress={() => handleClaimAchievement(achievement.id)}
                        >
                          <Text style={styles.claimButtonText}>Claim {achievement.points} points</Text>
                        </TouchableOpacity>
                      )}
                      {achievement.claimed && (
                        <View style={styles.claimedBadge}>
                          <Text style={styles.claimedText}>Claimed</Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {showNewTask && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <TouchableOpacity 
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} 
              onPress={() => setShowNewTask(false)} 
              activeOpacity={1}
            >
              <View style={{flex: 1}} />
            </TouchableOpacity>
            <View style={[styles.modalContent, {width: Dimensions.get('window').width > 500 ? '80%' : '90%'}]}>
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
              
              {/* Deadline Picker */}
              <View style={styles.datePickerContainer}>
                <Text style={styles.datePickerLabel}>Deadline:</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.datePickerButtonText}>
                    {newTask.dueDate ? newTask.dueDate.toLocaleDateString() : 'Select date'}
                  </Text>
                  <MaterialIcons name="calendar-today" size={20} color="#666" />
                </TouchableOpacity>
              </View>
              
              {showDatePicker && (
                <DateTimePicker
                  value={newTask.dueDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setNewTask({ ...newTask, dueDate: selectedDate });
                    }
                  }}
                />
              )}
              
              <View style={styles.priorityButtons}>
                {['low', 'medium', 'high'].map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityButton,
                      newTask.priority === p && (
                        p === 'low' ? styles.lowPriorityButton : 
                        p === 'medium' ? styles.mediumPriorityButton : 
                        styles.highPriorityButton
                      ),
                    ]}
                    onPress={() => setNewTask({ ...newTask, priority: p as 'low' | 'medium' | 'high' })}
                  >
                    <Text
                      style={styles.priorityButtonText}
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
          </KeyboardAvoidingView>
        )}

        {showPomodoro && (
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, styles.pomodoroContainer]}>
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
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowPomodoro(false)}
              >
                <MaterialIcons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {showRecurringForm && (
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"} 
            style={styles.modalContainer}
            keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
          >
            <TouchableOpacity 
              style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0}} 
              onPress={() => setShowRecurringForm(false)} 
              activeOpacity={1}
            >
              <View style={{flex: 1}} />
            </TouchableOpacity>
            <View style={[styles.modalContent, { maxHeight: Dimensions.get("window").height * 0.9, width: Dimensions.get('window').width > 500 ? '80%' : '90%' }]}>
              <ScrollView>
                <RecurringTaskForm
                  onSubmit={handleRecurringTaskSubmit}
                  onCancel={() => setShowRecurringForm(false)}
                />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </MobileContainer>
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
    flex: 1,
    marginTop: 16,
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
    justifyContent: 'center',
    padding: 8,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    margin: 4,
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
  },
  actionButton: {
    width: '32%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 4,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  tabContent: {
    flex: 1,
  },
  taskList: {
    paddingBottom: 80,
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
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 8,
    maxWidth: 400,
  },
  pomodoroContainer: {
    width: Dimensions.get('window').width > 600 ? '60%' : '90%',
    backgroundColor: '#262626',
    padding: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
  datePickerContainer: {
    marginBottom: 12,
  },
  datePickerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  datePickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    padding: 8,
  },
  taskItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  taskActionButton: {
    padding: 10,
    marginLeft: 8,
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
    gap: 16,
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
  },
  moodLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  sectionContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  analyticsCard: {
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
  analyticsSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: Dimensions.get('window').width < 400 ? '100%' : '45%',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginBottom: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: Dimensions.get('window').width < 400 ? '100%' : '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  achievementIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  achievementCompleted: {
    backgroundColor: '#4CAF50',
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  achievementProgressContainer: {
    height: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  achievementProgressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  achievementProgress: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  claimButton: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  claimButtonText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 12,
  },
  claimedBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  claimedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 12,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  statusFilters: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 16,
  },
  filterButtonActive: {
    backgroundColor: '#2196F3',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontWeight: 'bold',
  },
  lowPriorityButton: {
    backgroundColor: '#e8f5e9',
  },
  mediumPriorityButton: {
    backgroundColor: '#fff3e0',
  },
  highPriorityButton: {
    backgroundColor: '#ffebee',
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
});

export default HomeScreen;