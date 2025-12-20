import { Medicine } from "@/utils";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { styles } from "./styles";

interface MedicineCardProps {
  medicine: Medicine;
  doseTime: string; // 👈 THIS row’s time
  isTaken: boolean; // 👈 for THIS dose
  onMarkAsTaken: (medicineId: string, doseTime: string) => void;
}

const MedicineCard: React.FC<MedicineCardProps> = ({
  medicine,
  doseTime,
  isTaken,
  onMarkAsTaken,
}) => {
  const formatTime = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, "0")} ${period}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardContent}>
        {/* Left */}
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, isTaken && styles.iconTaken]}>
            <Text style={styles.pillIcon}>💊</Text>
          </View>
        </View>

        {/* Middle */}
        <View style={styles.middleSection}>
          <Text style={[styles.medicineName, isTaken && styles.nameTaken]}>
            {medicine.name}
          </Text>

          <View style={styles.timeContainer}>
            <Text style={styles.clockIcon}>🕐</Text>
            <Text style={styles.timeText}>{formatTime(doseTime)}</Text>
          </View>
        </View>

        {/* Right */}
        <View style={styles.rightSection}>
          {isTaken ? (
            <View style={styles.takenBadge}>
              <Text style={styles.checkIcon}>✓</Text>
              <Text style={styles.takenText}>Taken</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.takeButton}
              onPress={() => onMarkAsTaken(medicine.id, doseTime)}
            >
              <Text style={styles.takeButtonIcon}>✓</Text>
              <Text style={styles.takeButtonText}>Mark as Taken</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

export default MedicineCard;
