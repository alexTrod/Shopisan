import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DAY_LABELS, isDayClosed, hasSplitHours, getClosedDay, getFullDay, getSplitDay } from './utils';
import TimePicker from './TimePicker';
import styles from './styles';
import { AppColors } from '../../utils';

export default function DayEditModal({
  visible,
  day,
  hours,
  locale = 'fr',
  onSave,
  onClose,
  onCopyPress,
  t, // translation function
}) {
  const [editedHours, setEditedHours] = useState(hours);
  const [isClosed, setIsClosed] = useState(isDayClosed(hours));
  const [hasSplit, setHasSplit] = useState(hasSplitHours(hours));

  useEffect(() => {
    if (visible && hours) {
      setEditedHours(hours);
      setIsClosed(isDayClosed(hours));
      setHasSplit(hasSplitHours(hours));
    }
  }, [visible, hours]);

  const dayLabel = DAY_LABELS[day]?.[locale] || day;

  const handleClosedToggle = (value) => {
    setIsClosed(value);
    if (value) {
      setEditedHours(getClosedDay());
      setHasSplit(false);
    } else {
      setEditedHours(getFullDay());
    }
  };

  const handleAddLunchBreak = () => {
    const currentStart = editedHours?.morning?.start || '9:00';
    const currentEnd = editedHours?.morning?.end || '19:00';
    setEditedHours(getSplitDay(
      parseInt(currentStart.split(':')[0]),
      12,
      14,
      parseInt(currentEnd.split(':')[0])
    ));
    setHasSplit(true);
  };

  const handleRemoveLunchBreak = () => {
    const morningStart = editedHours?.morning?.start || '9:00';
    const afternoonEnd = editedHours?.afternoon?.end || '19:00';
    setEditedHours({
      morning: { start: morningStart, end: afternoonEnd },
      afternoon: null,
    });
    setHasSplit(false);
  };

  const handleTimeChange = (slot, field, value) => {
    setEditedHours(prev => ({
      ...prev,
      [slot]: {
        ...prev[slot],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave(day, editedHours);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{dayLabel}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={AppColors.black} />
              </TouchableOpacity>
            </View>

            {/* Closed Toggle */}
            <View style={styles.closedToggleRow}>
              <Text style={styles.closedToggleLabel}>
                {t?.('closed_this_day') || 'Fermé ce jour'}
              </Text>
              <Switch
                value={isClosed}
                onValueChange={handleClosedToggle}
                trackColor={{ false: AppColors.grey_300, true: AppColors.primary }}
                thumbColor={AppColors.white}
              />
            </View>

            {/* Time Slots (only show if not closed) */}
            {!isClosed && (
              <>
                {/* Morning / Main slot */}
                <View style={styles.timeSlotContainer}>
                  <View style={styles.timeSlotHeader}>
                    <Text style={styles.timeSlotLabel}>
                      {hasSplit
                        ? (t?.('morning') || 'Matin')
                        : (t?.('hours') || 'Horaires')
                      }
                    </Text>
                  </View>
                  <View style={styles.timeRow}>
                    <TimePicker
                      value={editedHours?.morning?.start || '9:00'}
                      onChange={(val) => handleTimeChange('morning', 'start', val)}
                      label={t?.('start') || 'Début'}
                    />
                    <Text style={styles.timeSeparator}>→</Text>
                    <TimePicker
                      value={editedHours?.morning?.end || '19:00'}
                      onChange={(val) => handleTimeChange('morning', 'end', val)}
                      label={t?.('end') || 'Fin'}
                    />
                  </View>
                </View>

                {/* Afternoon slot (only if split) */}
                {hasSplit && (
                  <View style={styles.timeSlotContainer}>
                    <View style={styles.timeSlotHeader}>
                      <Text style={styles.timeSlotLabel}>
                        {t?.('afternoon') || 'Après-midi'}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeSlotButton}
                        onPress={handleRemoveLunchBreak}
                      >
                        <Text style={styles.removeSlotText}>
                          {t?.('remove') || 'Supprimer'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.timeRow}>
                      <TimePicker
                        value={editedHours?.afternoon?.start || '14:00'}
                        onChange={(val) => handleTimeChange('afternoon', 'start', val)}
                        label={t?.('start') || 'Début'}
                      />
                      <Text style={styles.timeSeparator}>→</Text>
                      <TimePicker
                        value={editedHours?.afternoon?.end || '19:00'}
                        onChange={(val) => handleTimeChange('afternoon', 'end', val)}
                        label={t?.('end') || 'Fin'}
                      />
                    </View>
                  </View>
                )}

                {/* Add lunch break button */}
                {!hasSplit && (
                  <TouchableOpacity
                    style={styles.addLunchBreakButton}
                    onPress={handleAddLunchBreak}
                  >
                    <Ionicons name="add" size={20} color={AppColors.primary} />
                    <Text style={styles.addLunchBreakText}>
                      {t?.('add_lunch_break') || 'Ajouter une pause déjeuner'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Copy to other days */}
            <TouchableOpacity
              style={styles.copyToDaysButton}
              onPress={() => onCopyPress?.(day, editedHours)}
            >
              <Ionicons name="copy-outline" size={20} color={AppColors.primary} />
              <Text style={styles.copyToDaysText}>
                {t?.('copy_to_other_days') || 'Copier vers d\'autres jours'}
              </Text>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>
                  {t?.('cancel') || 'Annuler'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {t?.('save') || 'Enregistrer'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
