import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DAY_LABELS, isDayClosed, formatHoursDisplay } from './utils';
import styles from './styles';
import { AppColors } from '../../utils';

export default function DayRow({ day, hours, locale = 'fr', closedLabel, onPress }) {
  const isClosed = isDayClosed(hours);
  const dayLabel = DAY_LABELS[day]?.[locale] || day;
  const hoursDisplay = formatHoursDisplay(hours, closedLabel);

  return (
    <TouchableOpacity
      style={[styles.dayRow, isClosed && styles.dayRowClosed]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.dayName}>{dayLabel}</Text>
      <Text style={[styles.dayHours, isClosed && styles.dayHoursClosed]}>
        {hoursDisplay}
      </Text>
      <Ionicons
        name="chevron-forward"
        size={20}
        color={AppColors.grey_200}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}
