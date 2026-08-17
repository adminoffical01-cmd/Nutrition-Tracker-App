export interface UserProfile {
  name: string;
  email: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  height: number; // in cm
  weight: number; // in kg
  targetWeight: number; // in kg
  activityLevel: 'Sedentary' | 'Lightly Active' | 'Moderately Active' | 'Very Active' | 'Athlete';
  goal: 'Weight Loss' | 'Weight Gain' | 'Muscle Gain' | 'Fat Loss' | 'Six-Pack' | 'Maintain Weight';
  dietPreference: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggitarian' | 'Jain';
  cuisinePreference: 'South Indian' | 'North Indian' | 'Tamil' | 'Kerala' | 'Andhra' | 'Telangana' | 'Karnataka' | 'Bengali' | 'Gujarati' | 'Maharashtrian';
  dailyCalorieTarget: number;
  macroTargets: {
    protein: number; // in grams
    carbs: number; // in grams
    fat: number; // in grams
    fiber: number; // in grams
  };
  streakDays: number;
  lastActiveDate?: string;
}

export interface FoodItem {
  name: string;
  portionGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  confidence?: number;
}

export interface FoodLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: 'Breakfast' | 'Mid-Morning Snack' | 'Lunch' | 'Evening Snack' | 'Dinner';
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  timestamp: number;
}

export interface WaterLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  timestamp: number;
}

export interface ActivityLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  steps: number;
  distanceKm: number;
  activeMinutes: number;
  caloriesBurned: number;
  timestamp: number;
}

export interface Exercise {
  name: string;
  sets: number;
  reps?: number;
  durationSeconds?: number;
  restSeconds: number;
  instructions: string;
}

export interface WorkoutPlan {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD or 'template'
  name: string; // e.g. "Upper Body Strength"
  type: 'Strength' | 'Cardio' | 'HIIT' | 'Yoga' | 'Mobility' | 'Home' | 'Gym';
  exercises: Exercise[];
  durationMinutes: number;
  completed: boolean;
  timestamp: number;
}

export interface SleepLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  bedTime: string; // HH:MM
  wakeTime: string; // HH:MM
  durationHours: number;
  sleepQuality: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  timestamp: number;
}

export interface FastingLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  fastingType: '16:8' | '18:6' | '20:4' | 'OMAD' | 'Custom';
  startTime: number; // timestamp
  endTime: number; // timestamp
  durationHours: number;
  completed: boolean;
  timestamp: number;
}

export interface ProgressLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  weight: number;
  bmi: number;
  frontPhotoUrl?: string;
  sidePhotoUrl?: string;
  backPhotoUrl?: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
  timestamp: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  category: 'Vegetables' | 'Fruits' | 'Grains' | 'Dairy' | 'Protein' | 'Spices' | 'Other';
  quantity: string;
  completed: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  type: 'steps' | 'workout' | 'water' | 'diet';
  durationDays: number;
  participantsCount: number;
  joined: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string;
  unlocked: boolean;
  unlockedDate?: string;
}
