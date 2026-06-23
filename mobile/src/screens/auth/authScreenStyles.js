import { StyleSheet } from 'react-native';

export const authScreen = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: { fontSize: 32, fontWeight: '700', color: '#1a2b3c', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#5a6b7c', marginBottom: 24 },
  body: { fontSize: 16, lineHeight: 24, color: '#2a3b4c', marginBottom: 20 },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: '600' },
  linkRow: { marginTop: 16, alignItems: 'center' },
  linkText: { fontSize: 15, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  dividerText: { fontSize: 14, color: '#94a3b8' },
  hint: { fontSize: 13, color: '#6a7b8c', marginTop: 12, lineHeight: 18 },
  successCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  successText: { fontSize: 15, lineHeight: 22, color: '#166534' },
});

export function themeAuthBtn(theme) {
  return {
    button: { backgroundColor: theme.accent },
    buttonText: { color: theme.accentText },
    link: { color: theme.accent },
  };
}
