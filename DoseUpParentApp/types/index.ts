// Navigation Types
export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  MedicineDetail: { medicineId: string; adminId: string };
};

// Firebase Types
export interface ParentData {
  parentId: string;
  phoneNumber: string;
  adminId: string;
  name?: string;
}

export interface Medicine {
  id: string;
  name: string;
  parentId: string;
  doseTimes: string[];
  reminderInterval?: number;
  lastTakenAt?: string;
  dosage?: string;
  notes?: string;
}

export interface DoseHistory {
  takenAt: string;
  medicineId: string;
}

// Session Types
export interface ParentSession extends ParentData {
  lastLoginAt?: string;
}

// Notification Types
export interface NotificationData {
  medicineId: string;
  doseTime: string;
}
