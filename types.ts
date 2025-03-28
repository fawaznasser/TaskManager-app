export type RootStackParamList = {
    Login: undefined; 
    Signup: undefined; 
    Home: undefined; 
  };

  export interface Task {
    id: string;
    title: string;
    completed: boolean;
    createdAt: Date;
    userId: string;
    priority: 'low' | 'medium' | 'high';
    category?: string;
    dueDate?: Date;
    description?: string;
    status?: 'pending' | 'in_progress' | 'completed';
    completedAt?: Date;
    isRecurring?: boolean;
  }

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

  export interface User {
    id: string;
    email: string;
    displayName?: string;
    achievements: Achievement[];
    totalPoints: number;
    createdAt: Date;
    lastLogin: Date;
  }

  export interface Mood {
    id: string;
    userId: string;
    mood: 'happy' | 'neutral' | 'tired' | 'stressed' | 'productive';
    timestamp: Date;
    notes?: string;
  }

  export interface PomodoroSession {
    id: string;
    userId: string;
    taskId?: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // in minutes
    completed: boolean;
    type: 'work' | 'break' | 'longBreak';
  }