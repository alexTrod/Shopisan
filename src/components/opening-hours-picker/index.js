import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DAYS, PRESETS, getClosedDay, getFullDay, getSplitDay } from './utils';
import DayRow from './DayRow';
import DayEditModal from './DayEditModal';
import CopyModal from './CopyModal';
import styles from './styles';
import { AppColors } from '../../utils';

export default function OpeningHoursPicker({
  value,
  onChange,
  locale = 'en',
  showPresets = true,
  t, // translation function
}) {
  const [editingDay, setEditingDay] = useState(null);
  const [copyModalVisible, setCopyModalVisible] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState(null);
  const [copySourceHours, setCopySourceHours] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);

  const handleDayPress = (day) => {
    setEditingDay(day);
  };

  const handleSave = (day, hours) => {
    onChange({
      ...value,
      [day]: hours,
    });
    setSelectedPreset(null); // Clear preset when manually editing
  };

  const handleCopyPress = (day, hours) => {
    setCopySourceDay(day);
    setCopySourceHours(hours);
    setCopyModalVisible(true);
  };

  const handleCopyToSelectedDays = (selectedDays) => {
    const newHours = { ...value };
    selectedDays.forEach(day => {
      newHours[day] = { ...copySourceHours };
    });
    onChange(newHours);
  };

  const applyPreset = (preset) => {
    const newHours = {};
    DAYS.forEach(day => {
      if (preset.type === 'closed') {
        newHours[day] = getClosedDay();
      } else {
        newHours[day] = { ...preset.hours };
      }
    });
    onChange(newHours);
    setSelectedPreset(preset.label);
  };

  const copyMondayToWeekdays = () => {
    const mondayHours = value.monday;
    onChange({
      ...value,
      tuesday: { ...mondayHours },
      wednesday: { ...mondayHours },
      thursday: { ...mondayHours },
      friday: { ...mondayHours },
    });
  };

  const getPresetLabel = (preset) => {
    if (preset.label === 'closed') {
      return t?.('closed') || 'Closed';
    }
    return preset.label;
  };

  return (
    <View style={styles.container}>
      {/* Section Label */}
      <Text style={styles.sectionLabel}>
        {t?.('opening_hours') || 'Opening Hours'}
      </Text>

      {/* Presets */}
      {showPresets && (
        <View style={styles.presetsContainer}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.label}
              style={[
                styles.presetButton,
                selectedPreset === preset.label && styles.presetButtonActive,
              ]}
              onPress={() => applyPreset(preset)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  selectedPreset === preset.label && styles.presetButtonTextActive,
                ]}
              >
                {getPresetLabel(preset)}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.copyButton}
            onPress={copyMondayToWeekdays}
          >
            <Text style={styles.copyButtonText}>
              {t?.('copy_monday_to_weekdays') || 'Copy Mon → Fri'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Day List */}
      {DAYS.map((day) => (
        <DayRow
          key={day}
          day={day}
          hours={value[day]}
          locale={locale}
          closedLabel={t?.('closed') || 'Closed'}
          onPress={() => handleDayPress(day)}
        />
      ))}

      {/* Edit Modal */}
      <DayEditModal
        visible={editingDay !== null}
        day={editingDay}
        hours={editingDay ? value[editingDay] : null}
        locale={locale}
        onSave={handleSave}
        onClose={() => setEditingDay(null)}
        onCopyPress={handleCopyPress}
        t={t}
      />

      {/* Copy Modal */}
      <CopyModal
        visible={copyModalVisible}
        sourceDay={copySourceDay}
        locale={locale}
        onCopy={handleCopyToSelectedDays}
        onClose={() => {
          setCopyModalVisible(false);
          setCopySourceDay(null);
          setCopySourceHours(null);
        }}
        t={t}
      />
    </View>
  );
}
