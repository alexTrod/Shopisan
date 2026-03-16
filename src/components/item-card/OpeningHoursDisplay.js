import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { height } from "../../utils/dimension";
import { useTranslation } from '../../utils/useTranslation';

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
];

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return "";
  const parts = timeStr.split(':');
  const hour = parts[0];
  const minute = parts[1];
  return minute === "00" || !minute ? `${hour}h` : `${hour}h${minute}`;
};

const OpeningHoursDisplay = ({ openingHours }) => {
  const { t } = useTranslation();

  if (!openingHours) {
    return null;
  }

  const getHoursText = (dayHours) => {
    if (dayHours?.morning && dayHours?.afternoon) {
      return `${formatTimeDisplay(dayHours.morning.start)} - ${formatTimeDisplay(dayHours.morning.end)} / ${formatTimeDisplay(dayHours.afternoon.start)} - ${formatTimeDisplay(dayHours.afternoon.end)}`;
    } else if (dayHours?.morning) {
      return `${formatTimeDisplay(dayHours.morning.start)} - ${formatTimeDisplay(dayHours.morning.end)}`;
    } else if (dayHours?.afternoon) {
      return `${formatTimeDisplay(dayHours.afternoon.start)} - ${formatTimeDisplay(dayHours.afternoon.end)}`;
    }
    return t('closed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('opening_hours')}</Text>
      {DAYS.map((dayKey) => {
        const dayHours = openingHours[dayKey];
        const dayLabel = t(dayKey);
        const hoursText = getHoursText(dayHours);

        return (
          <View key={dayKey} style={styles.openingHourRow}>
            <Text style={styles.openingHourDay}>{dayLabel} :</Text>
            <Text style={styles.openingHourText}>{hoursText}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: height(2.2),
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  openingHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  openingHourDay: {
    fontSize: height(1.8),
    fontWeight: '600',
    color: '#333',
    minWidth: 100,
  },
  openingHourText: {
    fontSize: height(1.8),
    color: '#666',
    textAlign: 'right',
  },
});

export default OpeningHoursDisplay;
