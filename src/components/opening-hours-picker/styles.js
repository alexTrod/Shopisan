import { StyleSheet } from 'react-native';
import { AppColors } from '../../utils';

export default StyleSheet.create({
  container: {
    marginVertical: 10,
  },

  // Presets bar
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.primary,
    backgroundColor: AppColors.white,
  },
  presetButtonActive: {
    backgroundColor: AppColors.primary,
  },
  presetButtonText: {
    color: AppColors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  presetButtonTextActive: {
    color: AppColors.white,
  },
  copyButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    backgroundColor: AppColors.white,
  },
  copyButtonText: {
    color: AppColors.black,
    fontSize: 13,
  },

  // Day row
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: AppColors.white,
    borderRadius: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  dayRowClosed: {
    opacity: 0.6,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.black,
    flex: 1,
  },
  dayHours: {
    fontSize: 14,
    color: AppColors.grey_200,
    flex: 2,
    textAlign: 'right',
    marginRight: 8,
  },
  dayHoursClosed: {
    fontStyle: 'italic',
  },
  chevron: {
    marginLeft: 4,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.black,
  },
  closeButton: {
    padding: 4,
  },

  // Closed toggle
  closedToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
    marginBottom: 16,
  },
  closedToggleLabel: {
    fontSize: 15,
    color: AppColors.black,
  },

  // Time slot
  timeSlotContainer: {
    marginBottom: 16,
  },
  timeSlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeSlotLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.grey_200,
  },
  removeSlotButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  removeSlotText: {
    fontSize: 13,
    color: AppColors.red,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timePickerWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  timePickerLabel: {
    fontSize: 12,
    color: AppColors.grey_200,
    marginBottom: 4,
  },
  timePickerButton: {
    backgroundColor: AppColors.grey_300,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  timePickerButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: AppColors.black,
  },
  timeSeparator: {
    fontSize: 16,
    color: AppColors.grey_200,
    marginHorizontal: 8,
  },

  // Add lunch break button
  addLunchBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AppColors.primary,
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  addLunchBreakText: {
    fontSize: 14,
    color: AppColors.primary,
    marginLeft: 6,
  },

  // Copy to other days button
  copyToDaysButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  copyToDaysText: {
    fontSize: 14,
    color: AppColors.primary,
    marginLeft: 6,
  },

  // Modal buttons
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: AppColors.grey_200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    color: AppColors.black,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    color: AppColors.white,
    fontWeight: '600',
  },

  // Copy modal
  copyModalContent: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.grey_300,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: AppColors.grey_200,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  checkboxLabel: {
    fontSize: 15,
    color: AppColors.black,
  },
  quickSelectRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  quickSelectText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '600',
  },

  // Section label
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.black,
    marginBottom: 12,
  },
});
