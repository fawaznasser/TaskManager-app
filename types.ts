export type RootStackParamList = {
    Login: undefined; 
    Signup: undefined; 
    Home: undefined; 
  };

  export interface Task {
    id: string;
    title: string;
    description: string;
    deadline: Date;
    priority: 'low' | 'medium' | 'high';
    category: string;
    completed: boolean;
    userId: string;
    createdAt: Date;
    status: "pending" | "in_progress" | "completed";
    mood?: string;
    completedAt?: Date;
    // Recurring task properties
    isRecurring: boolean;
    recurringType?: 'daily' | 'weekly' | 'monthly';
    recurringInterval?: number; // e.g., every 2 days, 3 weeks, etc.
    recurringEndDate?: Date;
    parentTaskId?: string; // For instances of recurring tasks
  }