export const IL_RULES = {
  stateCode: 'IL',
  stateName: 'Illinois',
  totalHours: 50,
  nightHours: 10,
  holdingMonths: 9,
  minSessionWarnMinutes: 5,
  nudgeHours: 2,
  curfew: {
    weekdayStart: 22,
    weekdayEnd: 6,
    weekendStart: 23,
    weekendEnd: 6,
  },
};

export function hoursFromMinutes(minutes) {
  return Math.round((minutes / 60) * 10) / 10;
}
