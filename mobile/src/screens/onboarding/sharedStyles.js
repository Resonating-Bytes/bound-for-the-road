import { StyleSheet } from 'react-native';

export const shared = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: { fontSize: 24, fontWeight: '700', color: '#1a2b3c', marginBottom: 8 },
  fieldLabel: { fontSize: 15, fontWeight: '600', color: '#1a2b3c', marginBottom: 4 },
  hint: { fontSize: 15, lineHeight: 22, color: '#5a6b7c', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryButtonText: { fontSize: 16, fontWeight: '600', color: '#1a2b3c' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#1a2b3c' },
});

export function themeAccentStyles(theme) {
  return {
    button: { backgroundColor: theme.accent },
    buttonText: { color: theme.accentText },
  };
}
