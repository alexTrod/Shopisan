import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { parseTime } from './utils';
import { AppColors } from '../../utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
const ITEM_HEIGHT = 44; // paddingVertical (10) * 2 + fontSize approximate height + marginVertical (2) * 2

export default function TimePicker({ value, onChange, label }) {
  const [showPicker, setShowPicker] = useState(false);
  const { hour, minute } = parseTime(value);
  const hoursScrollRef = useRef(null);
  const minutesScrollRef = useRef(null);

  // Scroll to selected values when picker opens
  useEffect(() => {
    if (showPicker) {
      setTimeout(() => {
        if (hoursScrollRef.current) {
          const hourOffset = hour * ITEM_HEIGHT;
          hoursScrollRef.current.scrollTo({ y: hourOffset, animated: false });
        }
        if (minutesScrollRef.current) {
          const minuteIndex = MINUTES.indexOf(minute);
          const minuteOffset = minuteIndex >= 0 ? minuteIndex * ITEM_HEIGHT : 0;
          minutesScrollRef.current.scrollTo({ y: minuteOffset, animated: false });
        }
      }, 100);
    }
  }, [showPicker, hour, minute]);

  const displayTime = minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, '0')}`;

  const handleSelect = (newHour, newMinute) => {
    onChange(`${newHour}:${String(newMinute).padStart(2, '0')}`);
    setShowPicker(false);
  };

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.buttonText}>{displayTime}</Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{label || 'Select Time'}</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {/* Hours */}
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Hour</Text>
                <ScrollView
                  ref={hoursScrollRef}
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[
                        styles.option,
                        hour === h && styles.optionSelected
                      ]}
                      onPress={() => handleSelect(h, minute)}
                    >
                      <Text style={[
                        styles.optionText,
                        hour === h && styles.optionTextSelected
                      ]}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.separator}>:</Text>

              {/* Minutes */}
              <View style={styles.column}>
                <Text style={styles.columnLabel}>Min</Text>
                <ScrollView
                  ref={minutesScrollRef}
                  style={styles.scrollView}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                >
                  {MINUTES.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.option,
                        minute === m && styles.optionSelected
                      ]}
                      onPress={() => handleSelect(hour, m)}
                    >
                      <Text style={[
                        styles.optionText,
                        minute === m && styles.optionTextSelected
                      ]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: AppColors.grey_200,
    marginBottom: 4,
  },
  button: {
    backgroundColor: AppColors.grey_300,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.black,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: AppColors.black,
  },
  doneButton: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
  },
  pickerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  column: {
    alignItems: 'center',
    width: 80,
  },
  columnLabel: {
    fontSize: 12,
    color: AppColors.grey_200,
    marginBottom: 8,
  },
  scrollView: {
    maxHeight: 200,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 2,
  },
  optionSelected: {
    backgroundColor: AppColors.primary,
  },
  optionText: {
    fontSize: 20,
    fontWeight: '500',
    color: AppColors.black,
    textAlign: 'center',
  },
  optionTextSelected: {
    color: AppColors.white,
  },
  separator: {
    fontSize: 24,
    fontWeight: '600',
    color: AppColors.black,
    marginTop: 30,
    marginHorizontal: 8,
  },
});
