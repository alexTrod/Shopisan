import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DAYS, DAY_LABELS } from './utils';
import styles from './styles';
import { AppColors } from '../../utils';

export default function CopyModal({
  visible,
  sourceDay,
  locale = 'en',
  onCopy,
  onClose,
  t,
}) {
  const [selectedDays, setSelectedDays] = useState([]);

  const otherDays = DAYS.filter(d => d !== sourceDay);
  const weekdays = ['tuesday', 'wednesday', 'thursday', 'friday'].filter(d => d !== sourceDay);

  const toggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const selectAllWeekdays = () => {
    const toSelect = weekdays.filter(d => !selectedDays.includes(d));
    if (toSelect.length > 0) {
      setSelectedDays(prev => [...new Set([...prev, ...weekdays])]);
    } else {
      setSelectedDays(prev => prev.filter(d => !weekdays.includes(d)));
    }
  };

  const selectAll = () => {
    if (selectedDays.length === otherDays.length) {
      setSelectedDays([]);
    } else {
      setSelectedDays([...otherDays]);
    }
  };

  const handleCopy = () => {
    if (selectedDays.length > 0) {
      onCopy(selectedDays);
      setSelectedDays([]);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedDays([]);
    onClose();
  };

  const sourceDayLabel = DAY_LABELS[sourceDay]?.[locale] || sourceDay;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.copyModalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {t?.('copy_hours_from') || 'Copy hours from'} {sourceDayLabel}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={24} color={AppColors.black} />
            </TouchableOpacity>
          </View>

          {/* Day checkboxes */}
          {otherDays.map(day => {
            const isSelected = selectedDays.includes(day);
            const dayLabel = DAY_LABELS[day]?.[locale] || day;

            return (
              <TouchableOpacity
                key={day}
                style={styles.checkboxRow}
                onPress={() => toggleDay(day)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color={AppColors.white} />
                  )}
                </View>
                <Text style={styles.checkboxLabel}>{dayLabel}</Text>
              </TouchableOpacity>
            );
          })}

          {/* Quick select buttons */}
          <View style={styles.quickSelectRow}>
            <TouchableOpacity style={styles.quickSelectButton} onPress={selectAllWeekdays}>
              <Text style={styles.quickSelectText}>
                {t?.('select_weekdays') || 'Weekdays'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickSelectButton} onPress={selectAll}>
              <Text style={styles.quickSelectText}>
                {selectedDays.length === otherDays.length
                  ? (t?.('deselect_all') || 'Deselect all')
                  : (t?.('select_all') || 'Select all')
                }
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>
                {t?.('cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                selectedDays.length === 0 && { opacity: 0.5 }
              ]}
              onPress={handleCopy}
              disabled={selectedDays.length === 0}
            >
              <Text style={styles.saveButtonText}>
                {t?.('copy') || 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
