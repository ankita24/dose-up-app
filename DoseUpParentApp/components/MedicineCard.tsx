import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Medicine } from '../utils/firebase';

// Theme colors
const COLORS = {
  primary: '#6C63FF',
  secondary: '#4CAF50',
  accent: '#F7F8FA',
  background: '#FFFFFF',
  text: '#333333',
  textLight: '#666666',
  border: '#E0E0E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

interface MedicineCardProps {
  medicine: Medicine;
  onMarkAsTaken: (medicineId: string) => void;
  onPress: (medicine: Medicine) => void;
  isLoading?: boolean;
}

const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  onMarkAsTaken,
  onPress,
  isLoading = false,
}) => {
  // Check if medicine was taken today
  const isTakenToday = useMemo(() => {
    if (!medicine.lastTakenAt) return false;
    
    const lastTaken = new Date(medicine.lastTakenAt);
    const today = new Date();
    
    return (
      lastTaken.getDate() === today.getDate() &&
      lastTaken.getMonth() === today.getMonth() &&
      lastTaken.getFullYear() === today.getFullYear()
    );
  }, [medicine.lastTakenAt]);

  // Format dose times for display
  const formatDoseTimes = (times: string[]): string => {
    return times
      .map((time) => {
        const [hours, minutes] = time.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      })
      .join(' • ');
  };

  // Get next dose time
  const getNextDoseTime = (): string | null => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const time of medicine.doseTimes.sort()) {
      const [hours, minutes] = time.split(':').map(Number);
      const doseMinutes = hours * 60 + minutes;
      
      if (doseMinutes > currentMinutes) {
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      }
    }

    // If all times passed, return first time for tomorrow
    if (medicine.doseTimes.length > 0) {
      const [hours, minutes] = medicine.doseTimes[0].split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period} (tomorrow)`;
    }

    return null;
  };

  const handleMarkAsTaken = () => {
    if (!isLoading && !isTakenToday) {
      onMarkAsTaken(medicine.id);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(medicine)}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, isTakenToday && styles.iconTaken]}>
            <Text style={styles.pillIcon}>💊</Text>
          </View>
        </View>

        <View style={styles.middleSection}>
          <Text style={[styles.medicineName, isTakenToday && styles.nameTaken]}>
            {medicine.name}
          </Text>
          
          {medicine.dosage && (
            <Text style={styles.dosageText}>{medicine.dosage}</Text>
          )}

          <View style={styles.timeContainer}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.timeText}>
              {formatDoseTimes(medicine.doseTimes)}
            </Text>
          </View>

          {!isTakenToday && getNextDoseTime() && (
            <Text style={styles.nextDoseText}>
              Next: {getNextDoseTime()}
            </Text>
          )}
        </View>

        <View style={styles.rightSection}>
          {isTakenToday ? (
            <View style={styles.takenBadge}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.takenText}>Taken</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.takeButton, isLoading && styles.buttonDisabled]}
              onPress={handleMarkAsTaken}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <>
                  <Text style={styles.takeButtonIcon}>✓</Text>
                  <Text style={styles.takeButtonText}>Mark as Taken</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {medicine.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText}>📝 {medicine.notes}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftSection: {
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconTaken: {
    backgroundColor: `${COLORS.secondary}20`,
  },
  pillIcon: {
    fontSize: 24,
  },
  middleSection: {
    flex: 1,
    marginRight: 12,
  },
  medicineName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  nameTaken: {
    textDecorationLine: 'line-through',
    color: COLORS.textLight,
  },
  dosageText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  nextDoseText: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: '500',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  takeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 130,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  takeButtonIcon: {
    color: COLORS.background,
    fontSize: 14,
    marginRight: 6,
    fontWeight: 'bold',
  },
  takeButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: '600',
  },
  takenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.secondary}20`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  checkIcon: {
    color: COLORS.secondary,
    fontSize: 14,
    marginRight: 4,
    fontWeight: 'bold',
  },
  takenText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});

export default MedicineCard;
