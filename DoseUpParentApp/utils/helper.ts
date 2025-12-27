import { DoseRow, Medicine } from "./firebase";

export const shouldShowMedicineToday = (medicine: Medicine) => {
  const today = new Date().getDay();

  if (medicine.frequency.type === "daily") return true;
  if (medicine?.frequency?.days?.length) {
    if (medicine.frequency.type === "weekly") {
      return medicine?.frequency?.days.includes(today);
    }

    if (medicine.frequency.type === "custom") {
      return medicine?.frequency?.days.includes(today);
    }
  }

  return false;
};


const getTodayKey = () => {
  const d = new Date();
  return d.toISOString().split("T")[0]; // yyyy-mm-dd
};

const getMinutesFromTime = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const buildTodayDoseRows = (
  medicines: Medicine[]
): DoseRow[] => {
  const today = new Date();
  const todayDay = today.getDay(); // 0–6 (Sun–Sat)
  const nowMinutes = today.getHours() * 60 + today.getMinutes();

  // 1️⃣ filter medicines valid for today
  const validMedicines = medicines.filter((m) => {
    if (!m.frequency) return true;

    if (m.frequency.type === "daily") return true;

    if (m.frequency.type === "weekly") {
      return m.frequency.days?.includes(todayDay);
    }

    if (m.frequency.type === "custom") {
      return m.frequency.days?.includes(todayDay);
    }

    return false;
  });

  // 2️⃣ expand to dose rows
  const rows: DoseRow[] = [];

  validMedicines.forEach((medicine) => {
    medicine.doseTimes.forEach((doseTime) => {
      rows.push({
        medicineId: medicine.id,
        medicineName: medicine.name,
        doseTime,
        medicine,
      });
    });
  });

  // 3️⃣ sort by closest to now
  return rows.sort((a, b) => {
    const diffA = getMinutesFromTime(a.doseTime) - nowMinutes;
    const diffB = getMinutesFromTime(b.doseTime) - nowMinutes;

    // future doses first, past doses later
    if (diffA >= 0 && diffB < 0) return -1;
    if (diffA < 0 && diffB >= 0) return 1;

    return diffA - diffB;
  });
};

export function getNextTriggerDate(time: string) {
  const [hours, minutes] = time.split(':').map(Number);

  const now = new Date();
  const trigger = new Date();

  trigger.setHours(hours, minutes, 0, 0);

  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  return trigger;
}

export const getMedicinesHash = (medicines: Medicine[]) =>
  JSON.stringify(
    medicines.map(m => ({
      id: m.id,
      doseTimes: [...m.doseTimes].sort(),
    }))
  );
