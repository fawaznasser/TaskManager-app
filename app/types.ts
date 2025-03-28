export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline: {
    seconds: number;
    nanoseconds: number;
  };
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed';
  userId: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
  category?: string;
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

const Types = {
  Task: {} as Task,
  Achievement: {} as Achievement
};

export default Types; 