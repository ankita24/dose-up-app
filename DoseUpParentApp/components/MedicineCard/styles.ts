import { StyleSheet } from "react-native";

// Theme colors
export const COLORS = {
  primary: "#6C63FF",
  secondary: "#4CAF50",
  accent: "#F7F8FA",
  background: "#FFFFFF",
  text: "#333333",
  textLight: "#666666",
  border: "#E0E0E0",
  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
};

export const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftSection: {
    marginRight: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: "center",
    alignItems: "center",
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
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  nameTaken: {
    textDecorationLine: "line-through",
    color: COLORS.textLight,
  },
  dosageText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 6,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "500",
  },
  rightSection: {
    alignItems: "flex-end",
  },
  takeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 130,
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  takeButtonIcon: {
    color: COLORS.background,
    fontSize: 14,
    marginRight: 6,
    fontWeight: "bold",
  },
  takeButtonText: {
    color: COLORS.background,
    fontSize: 14,
    fontWeight: "600",
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "bold",
  },
  takenText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: "600",
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
    fontStyle: "italic",
  },
});
