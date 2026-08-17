import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { db } from "./firebase";
import { 
  UserProfile, 
  FoodLog, 
  WaterLog, 
  ActivityLog, 
  WorkoutPlan, 
  SleepLog, 
  FastingLog, 
  ProgressLog, 
  ChatMessage, 
  ShoppingItem,
  Challenge,
  Achievement
} from "./types";

// Helper: check if device is online
export const isOnline = (): boolean => navigator.onLine;

// LocalStorage helpers for 100% offline-first operations
const getLocal = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setLocal = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Local storage save error:", e);
  }
};

// ================= USER PROFILE SERVICE =================
export const saveUserProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  setLocal(`profile_${userId}`, profile);
  if (isOnline()) {
    try {
      await setDoc(doc(db, "users", userId), profile, { merge: true });
    } catch (e) {
      console.warn("Firestore save failed, will retry on sync: ", e);
    }
  }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const local = getLocal<UserProfile | null>(`profile_${userId}`, null);
  if (isOnline()) {
    try {
      const snap = await getDoc(doc(db, "users", userId));
      if (snap.exists()) {
        const remoteProfile = snap.data() as UserProfile;
        setLocal(`profile_${userId}`, remoteProfile);
        return remoteProfile;
      }
    } catch (e) {
      console.warn("Firestore read failed, using offline data: ", e);
    }
  }
  return local;
};

// ================= FOOD LOGS SERVICE =================
export const logFoodMeal = async (userId: string, foodLog: Omit<FoodLog, "id">): Promise<FoodLog> => {
  const localLogs = getLocal<FoodLog[]>(`foodLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: FoodLog = { ...foodLog, id: tempId };
  
  localLogs.push(completeLog);
  setLocal(`foodLogs_${userId}`, localLogs);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "foodLogs");
      const docRef = await addDoc(colRef, foodLog);
      completeLog.id = docRef.id;
      // Update local storage with real Firestore ID
      const updatedLogs = localLogs.map(l => l.id === tempId ? completeLog : l);
      setLocal(`foodLogs_${userId}`, updatedLogs);
    } catch (e) {
      console.warn("Firestore logging failed, stored locally: ", e);
    }
  }
  return completeLog;
};

export const deleteFoodMeal = async (userId: string, foodLogId: string): Promise<void> => {
  const localLogs = getLocal<FoodLog[]>(`foodLogs_${userId}`, []);
  const updatedLogs = localLogs.filter(l => l.id !== foodLogId);
  setLocal(`foodLogs_${userId}`, updatedLogs);

  if (isOnline() && !foodLogId.startsWith("temp_")) {
    try {
      await deleteDoc(doc(db, "users", userId, "foodLogs", foodLogId));
    } catch (e) {
      console.warn("Firestore deletion failed:", e);
    }
  }
};

export const updateFoodMeal = async (userId: string, foodLogId: string, updatedLog: FoodLog): Promise<void> => {
  const localLogs = getLocal<FoodLog[]>(`foodLogs_${userId}`, []);
  const updatedLogs = localLogs.map(l => l.id === foodLogId ? updatedLog : l);
  setLocal(`foodLogs_${userId}`, updatedLogs);

  if (isOnline() && !foodLogId.startsWith("temp_")) {
    try {
      const { id, ...payload } = updatedLog;
      await setDoc(doc(db, "users", userId, "foodLogs", foodLogId), payload);
    } catch (e) {
      console.warn("Firestore update failed:", e);
    }
  }
};

export const getFoodLogs = async (userId: string, date: string): Promise<FoodLog[]> => {
  const localLogs = getLocal<FoodLog[]>(`foodLogs_${userId}`, []);
  const filteredLocal = localLogs.filter(l => l.date === date);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "foodLogs");
      const q = query(colRef, where("date", "==", date));
      const snap = await getDocs(q);
      const remoteLogs: FoodLog[] = [];
      snap.forEach(d => {
        remoteLogs.push({ id: d.id, ...d.data() } as FoodLog);
      });
      
      // Merge unique logs, updating local
      const merged = [...localLogs.filter(l => l.date !== date), ...remoteLogs];
      setLocal(`foodLogs_${userId}`, merged);
      return remoteLogs;
    } catch (e) {
      console.warn("Firestore foodLogs read error, using offline cache:", e);
    }
  }
  return filteredLocal;
};

// ================= WATER LOGS SERVICE =================
export const logWater = async (userId: string, waterLog: Omit<WaterLog, "id">): Promise<WaterLog> => {
  const localLogs = getLocal<WaterLog[]>(`waterLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: WaterLog = { ...waterLog, id: tempId };
  
  localLogs.push(completeLog);
  setLocal(`waterLogs_${userId}`, localLogs);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "waterLogs");
      const docRef = await addDoc(colRef, waterLog);
      completeLog.id = docRef.id;
      const updatedLogs = localLogs.map(l => l.id === tempId ? completeLog : l);
      setLocal(`waterLogs_${userId}`, updatedLogs);
    } catch (e) {
      console.warn("Firestore water tracking failed:", e);
    }
  }
  return completeLog;
};

export const getWaterLogs = async (userId: string, date: string): Promise<WaterLog[]> => {
  const localLogs = getLocal<WaterLog[]>(`waterLogs_${userId}`, []);
  const filteredLocal = localLogs.filter(l => l.date === date);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "waterLogs");
      const q = query(colRef, where("date", "==", date));
      const snap = await getDocs(q);
      const remoteLogs: WaterLog[] = [];
      snap.forEach(d => {
        remoteLogs.push({ id: d.id, ...d.data() } as WaterLog);
      });
      const merged = [...localLogs.filter(l => l.date !== date), ...remoteLogs];
      setLocal(`waterLogs_${userId}`, merged);
      return remoteLogs;
    } catch (e) {
      console.warn("Firestore waterLogs read error:", e);
    }
  }
  return filteredLocal;
};

// ================= ACTIVITY LOGS SERVICE =================
export const logActivity = async (userId: string, activityLog: Omit<ActivityLog, "id">): Promise<ActivityLog> => {
  const localLogs = getLocal<ActivityLog[]>(`activityLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: ActivityLog = { ...activityLog, id: tempId };

  // Check if today already has steps and replace or aggregate
  const existingIndex = localLogs.findIndex(l => l.date === activityLog.date);
  if (existingIndex > -1) {
    localLogs[existingIndex] = { ...localLogs[existingIndex], ...activityLog, id: localLogs[existingIndex].id };
  } else {
    localLogs.push(completeLog);
  }
  setLocal(`activityLogs_${userId}`, localLogs);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "activityLogs");
      // Find if remote doc exists first
      const q = query(colRef, where("date", "==", activityLog.date));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docId = snap.docs[0].id;
        await setDoc(doc(db, "users", userId, "activityLogs", docId), activityLog, { merge: true });
        completeLog.id = docId;
      } else {
        const docRef = await addDoc(colRef, activityLog);
        completeLog.id = docRef.id;
      }
    } catch (e) {
      console.warn("Firestore activity logging failed:", e);
    }
  }
  return completeLog;
};

export const getActivityLogs = async (userId: string, date: string): Promise<ActivityLog | null> => {
  const localLogs = getLocal<ActivityLog[]>(`activityLogs_${userId}`, []);
  const foundLocal = localLogs.find(l => l.date === date) || null;

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "activityLogs");
      const q = query(colRef, where("date", "==", date));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const remoteLog = { id: snap.docs[0].id, ...snap.docs[0].data() } as ActivityLog;
        // update local cache
        const filtered = localLogs.filter(l => l.date !== date);
        filtered.push(remoteLog);
        setLocal(`activityLogs_${userId}`, filtered);
        return remoteLog;
      }
    } catch (e) {
      console.warn("Firestore activity read error:", e);
    }
  }
  return foundLocal;
};

// ================= WORKOUT PLAN SERVICE =================
export const saveWorkoutPlan = async (userId: string, plan: WorkoutPlan): Promise<WorkoutPlan> => {
  const localPlans = getLocal<WorkoutPlan[]>(`workoutPlans_${userId}`, []);
  const tempId = plan.id || `temp_${Date.now()}`;
  const completePlan: WorkoutPlan = { ...plan, id: tempId };

  const idx = localPlans.findIndex(p => p.id === tempId);
  if (idx > -1) {
    localPlans[idx] = completePlan;
  } else {
    localPlans.push(completePlan);
  }
  setLocal(`workoutPlans_${userId}`, localPlans);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "workoutPlans");
      if (plan.id && !plan.id.startsWith("temp_")) {
        await setDoc(doc(db, "users", userId, "workoutPlans", plan.id), plan, { merge: true });
      } else {
        const { id, ...cleanPlan } = completePlan;
        const docRef = await addDoc(colRef, cleanPlan);
        completePlan.id = docRef.id;
        const updated = localPlans.map(p => p.id === tempId ? completePlan : p);
        setLocal(`workoutPlans_${userId}`, updated);
      }
    } catch (e) {
      console.warn("Firestore workout plan save error:", e);
    }
  }
  return completePlan;
};

export const getWorkoutPlans = async (userId: string, date: string): Promise<WorkoutPlan[]> => {
  const localPlans = getLocal<WorkoutPlan[]>(`workoutPlans_${userId}`, []);
  const filteredLocal = localPlans.filter(p => p.date === date);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "workoutPlans");
      const q = query(colRef, where("date", "==", date));
      const snap = await getDocs(q);
      const remotePlans: WorkoutPlan[] = [];
      snap.forEach(d => {
        remotePlans.push({ id: d.id, ...d.data() } as WorkoutPlan);
      });
      const merged = [...localPlans.filter(p => p.date !== date), ...remotePlans];
      setLocal(`workoutPlans_${userId}`, merged);
      return remotePlans;
    } catch (e) {
      console.warn("Firestore read workout plans error:", e);
    }
  }
  return filteredLocal;
};

// ================= SLEEP TRACKING SERVICE =================
export const logSleep = async (userId: string, log: Omit<SleepLog, "id">): Promise<SleepLog> => {
  const local = getLocal<SleepLog[]>(`sleepLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: SleepLog = { ...log, id: tempId };

  local.push(completeLog);
  setLocal(`sleepLogs_${userId}`, local);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "sleepLogs");
      const docRef = await addDoc(colRef, log);
      completeLog.id = docRef.id;
      const updated = local.map(l => l.id === tempId ? completeLog : l);
      setLocal(`sleepLogs_${userId}`, updated);
    } catch (e) {
      console.warn("Firestore sleep tracking failed:", e);
    }
  }
  return completeLog;
};

export const getSleepLogs = async (userId: string, date: string): Promise<SleepLog[]> => {
  const local = getLocal<SleepLog[]>(`sleepLogs_${userId}`, []);
  const filtered = local.filter(l => l.date === date);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "sleepLogs");
      const q = query(colRef, where("date", "==", date));
      const snap = await getDocs(q);
      const remote: SleepLog[] = [];
      snap.forEach(d => {
        remote.push({ id: d.id, ...d.data() } as SleepLog);
      });
      return remote;
    } catch (e) {
      console.warn("Firestore sleep read error:", e);
    }
  }
  return filtered;
};

// ================= FASTING TRACKING SERVICE =================
export const logFasting = async (userId: string, log: Omit<FastingLog, "id">): Promise<FastingLog> => {
  const local = getLocal<FastingLog[]>(`fastingLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: FastingLog = { ...log, id: tempId };

  local.push(completeLog);
  setLocal(`fastingLogs_${userId}`, local);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "fastingLogs");
      const docRef = await addDoc(colRef, log);
      completeLog.id = docRef.id;
      const updated = local.map(l => l.id === tempId ? completeLog : l);
      setLocal(`fastingLogs_${userId}`, updated);
    } catch (e) {
      console.warn("Firestore fasting tracking failed:", e);
    }
  }
  return completeLog;
};

export const getFastingLogs = async (userId: string): Promise<FastingLog[]> => {
  const local = getLocal<FastingLog[]>(`fastingLogs_${userId}`, []);
  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "fastingLogs");
      const q = query(colRef, orderBy("timestamp", "desc"), limit(10));
      const snap = await getDocs(q);
      const remote: FastingLog[] = [];
      snap.forEach(d => {
        remote.push({ id: d.id, ...d.data() } as FastingLog);
      });
      return remote;
    } catch (e) {
      console.warn("Firestore fasting logs read error:", e);
    }
  }
  return local;
};

// ================= PROGRESS METRICS & HISTORY =================
export const logProgress = async (userId: string, log: Omit<ProgressLog, "id">): Promise<ProgressLog> => {
  const local = getLocal<ProgressLog[]>(`progressLogs_${userId}`, []);
  const tempId = `temp_${Date.now()}`;
  const completeLog: ProgressLog = { ...log, id: tempId };

  local.push(completeLog);
  setLocal(`progressLogs_${userId}`, local);

  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "progressLogs");
      const docRef = await addDoc(colRef, log);
      completeLog.id = docRef.id;
      const updated = local.map(l => l.id === tempId ? completeLog : l);
      setLocal(`progressLogs_${userId}`, updated);
    } catch (e) {
      console.warn("Firestore progress log failed:", e);
    }
  }
  return completeLog;
};

export const getProgressHistory = async (userId: string): Promise<ProgressLog[]> => {
  const local = getLocal<ProgressLog[]>(`progressLogs_${userId}`, []);
  if (isOnline()) {
    try {
      const colRef = collection(db, "users", userId, "progressLogs");
      const q = query(colRef, orderBy("timestamp", "asc"));
      const snap = await getDocs(q);
      const remote: ProgressLog[] = [];
      snap.forEach(d => {
        remote.push({ id: d.id, ...d.data() } as ProgressLog);
      });
      setLocal(`progressLogs_${userId}`, remote);
      return remote;
    } catch (e) {
      console.warn("Firestore read progress logs error:", e);
    }
  }
  return local;
};

// ================= SHOPPING LISTS =================
export const getShoppingList = async (userId: string): Promise<ShoppingItem[]> => {
  const local = getLocal<ShoppingItem[]>(`shopping_${userId}`, [
    { id: "1", name: "Paneer (High Protein)", category: "Dairy", quantity: "400g", completed: false },
    { id: "2", name: "Brown Rice", category: "Grains", quantity: "1 kg", completed: false },
    { id: "3", name: "Yellow Dal / Moong", category: "Protein", quantity: "500g", completed: true },
    { id: "4", name: "Spinach (Palak)", category: "Vegetables", quantity: "1 bunch", completed: false },
    { id: "5", name: "Apples", category: "Fruits", quantity: "6 pieces", completed: false }
  ]);
  return local;
};

export const saveShoppingList = async (userId: string, list: ShoppingItem[]): Promise<void> => {
  setLocal(`shopping_${userId}`, list);
  if (isOnline()) {
    try {
      await setDoc(doc(db, "users", userId, "shoppingLists", "main"), { items: list });
    } catch (e) {
      console.warn("Firestore shopping list save error:", e);
    }
  }
};

// ================= AI CHATS HISTORIES =================
export const saveChatHistory = async (userId: string, messages: ChatMessage[]): Promise<void> => {
  setLocal(`chat_${userId}`, messages);
  if (isOnline()) {
    try {
      await setDoc(doc(db, "users", userId, "aiChats", "main"), { messages });
    } catch (e) {
      console.warn("Firestore chat save error:", e);
    }
  }
};

export const getChatHistory = async (userId: string): Promise<ChatMessage[]> => {
  const local = getLocal<ChatMessage[]>(`chat_${userId}`, []);
  if (isOnline()) {
    try {
      const snap = await getDoc(doc(db, "users", userId, "aiChats", "main"));
      if (snap.exists()) {
        const data = snap.data();
        if (data && data.messages) {
          setLocal(`chat_${userId}`, data.messages);
          return data.messages;
        }
      }
    } catch (e) {
      console.warn("Firestore chat read error:", e);
    }
  }
  return local;
};

// ================= ACTIVE CHALLENGES =================
export const getChallengesList = (): Challenge[] => {
  return [
    { id: "ch_1", title: "10K Steps Challenge", description: "Hit 10,000 steps daily for a week to jumpstart your cardiovascular health.", targetValue: 10000, type: "steps", durationDays: 7, participantsCount: 1420, joined: false },
    { id: "ch_2", title: "7-Day Hydration Hero", description: "Drink 3.0 liters of pure water every day to keep muscles performing perfectly.", targetValue: 3.0, type: "water", durationDays: 7, participantsCount: 840, joined: true },
    { id: "ch_3", title: "30-Day Lean Muscle", description: "Complete 4 strength/HIIT workouts per week for a body transformation.", targetValue: 16, type: "workout", durationDays: 30, participantsCount: 2310, joined: false },
    { id: "ch_4", title: "High-Protein Week", description: "Meet your daily protein goal every day for 7 consecutive days.", targetValue: 7, type: "diet", durationDays: 7, participantsCount: 610, joined: false }
  ];
};

// ================= SYNC ALL LOCAL PENDING RECORDS =================
export const synchronizeLocalData = async (userId: string): Promise<boolean> => {
  if (!isOnline()) return false;
  try {
    console.log("[Sync] Synchronizing offline logs with cloud database...");
    
    // Sync User profile
    const profile = getLocal<UserProfile | null>(`profile_${userId}`, null);
    if (profile) {
      await setDoc(doc(db, "users", userId), profile, { merge: true });
    }

    // Sync Food Logs
    const localFood = getLocal<FoodLog[]>(`foodLogs_${userId}`, []);
    const tempFood = localFood.filter(l => l.id?.startsWith("temp_"));
    for (const log of tempFood) {
      const { id, ...cleanLog } = log;
      const colRef = collection(db, "users", userId, "foodLogs");
      const docRef = await addDoc(colRef, cleanLog);
      log.id = docRef.id;
    }
    setLocal(`foodLogs_${userId}`, localFood);

    // Sync Water Logs
    const localWater = getLocal<WaterLog[]>(`waterLogs_${userId}`, []);
    const tempWater = localWater.filter(l => l.id?.startsWith("temp_"));
    for (const log of tempWater) {
      const { id, ...cleanLog } = log;
      const colRef = collection(db, "users", userId, "waterLogs");
      const docRef = await addDoc(colRef, cleanLog);
      log.id = docRef.id;
    }
    setLocal(`waterLogs_${userId}`, localWater);

    return true;
  } catch (error) {
    console.error("[Sync] Synchronization failed: ", error);
    return false;
  }
};
