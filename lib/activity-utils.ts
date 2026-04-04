export function formatActivityDate(date?: string | Date | null): string {
  if (!date) return 'Recurring';

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const value = new Date(date);
  const hours = value.getHours();
  const minutes = value.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${days[value.getDay()]}, ${months[value.getMonth()]} ${value.getDate()} · ${displayHour}:${displayMinutes} ${ampm}`;
}

export function formatRecurrenceRule(recurrenceRule?: string | null): string {
  if (!recurrenceRule) return 'Recurring';

  const [, day] = recurrenceRule.split(':');
  if (!day) return 'Recurring';

  return `Every ${day.charAt(0).toUpperCase()}${day.slice(1)}`;
}

export function formatActivitySchedule(
  dateTime?: string | Date | null,
  recurrenceRule?: string | null
): string {
  if (dateTime) {
    return formatActivityDate(dateTime);
  }

  return formatRecurrenceRule(recurrenceRule);
}
