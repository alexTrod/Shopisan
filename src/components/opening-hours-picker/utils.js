// Days of the week
export const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export const DAY_LABELS = {
  monday: { en: 'Monday', fr: 'Lundi' },
  tuesday: { en: 'Tuesday', fr: 'Mardi' },
  wednesday: { en: 'Wednesday', fr: 'Mercredi' },
  thursday: { en: 'Thursday', fr: 'Jeudi' },
  friday: { en: 'Friday', fr: 'Vendredi' },
  saturday: { en: 'Saturday', fr: 'Samedi' },
  sunday: { en: 'Sunday', fr: 'Dimanche' },
};

// Parse time string "9:00" or "14:30" to { hour, minute }
export const parseTime = (timeStr) => {
  if (!timeStr) return { hour: 9, minute: 0 };
  const parts = timeStr.split(':');
  return {
    hour: parseInt(parts[0], 10) || 0,
    minute: parseInt(parts[1], 10) || 0,
  };
};

// Format hour and minute to time string "9:00"
export const formatTimeString = (hour, minute) => {
  return `${hour}:${String(minute).padStart(2, '0')}`;
};

// Convert time string to Date object for picker
export const timeStringToDate = (timeStr) => {
  const { hour, minute } = parseTime(timeStr);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
};

// Convert Date object to time string
export const dateToTimeString = (date) => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  return formatTimeString(hours, minutes);
};

// Check if a day is closed
export const isDayClosed = (dayHours) => {
  if (!dayHours) return true;
  return !dayHours.morning && !dayHours.afternoon;
};

// Check if day has split hours (lunch break)
export const hasSplitHours = (dayHours) => {
  if (!dayHours) return false;
  return dayHours.morning && dayHours.afternoon;
};

// Format hours for display: "9h - 12h / 14h - 19h" or "9h - 19h" or "Closed"
export const formatHoursDisplay = (dayHours, closedLabel = 'Closed') => {
  if (isDayClosed(dayHours)) return closedLabel;

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const { hour, minute } = parseTime(timeStr);
    return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, '0')}`;
  };

  let result = '';

  if (dayHours.morning) {
    result += `${formatTime(dayHours.morning.start)} - ${formatTime(dayHours.morning.end)}`;
  }

  if (dayHours.afternoon) {
    if (result) result += ' / ';
    result += `${formatTime(dayHours.afternoon.start)} - ${formatTime(dayHours.afternoon.end)}`;
  }

  return result;
};

// Get default hours structure
export const getDefaultHours = () => ({
  monday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  tuesday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  wednesday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  thursday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  friday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  saturday: { morning: { start: '9:00', end: '19:00' }, afternoon: null },
  sunday: { morning: null, afternoon: null },
});

// Get closed day structure
export const getClosedDay = () => ({
  morning: null,
  afternoon: null,
});

// Get full day structure (no lunch break)
export const getFullDay = (startHour = 9, endHour = 19) => ({
  morning: { start: `${startHour}:00`, end: `${endHour}:00` },
  afternoon: null,
});

// Get split day structure (with lunch break)
export const getSplitDay = (
  morningStart = 9,
  morningEnd = 12,
  afternoonStart = 14,
  afternoonEnd = 19
) => ({
  morning: { start: `${morningStart}:00`, end: `${morningEnd}:00` },
  afternoon: { start: `${afternoonStart}:00`, end: `${afternoonEnd}:00` },
});

// Presets
export const PRESETS = [
  { label: 'closed', type: 'closed' },
  { label: '9-19', type: 'full', hours: getFullDay(9, 19) },
  { label: '9-12/14-19', type: 'split', hours: getSplitDay(9, 12, 14, 19) },
];
