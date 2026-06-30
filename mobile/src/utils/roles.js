/** Supervising adult or driving instructor — share link + approval flows. */
export function isSupervisorRole(role) {
  return role === 'adult' || role === 'instructor';
}

export function isInstructorRole(role) {
  return role === 'instructor';
}
