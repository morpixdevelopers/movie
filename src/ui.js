import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, S, F, shadow } from './theme';
import { initials } from './logic';

export const poster = (id, w = 400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=75`;

export function Btn({ title, onPress, kind = 'primary', small, style, disabled }) {
  const inner = (
    <Text
      style={[
        st.btnText,
        small && { fontSize: 13.5 },
        kind === 'primary' ? { color: C.onAccent } : { color: C.text },
      ]}
      numberOfLines={1}
    >
      {title}
    </Text>
  );
  const shell = [st.btn, small && st.btnSm, disabled && { opacity: 0.4 }, style];

  if (kind === 'primary') {
    return (
      <Pressable
        onPress={disabled ? undefined : onPress}
        style={({ pressed }) => [...shell, pressed && !disabled && st.pressed]}
        accessibilityRole="button"
      >
        <LinearGradient
          colors={[C.gradA, C.gradB]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, { borderRadius: S.radiusSm }]}
        />
        {inner}
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        ...shell,
        { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
        pressed && !disabled && st.pressed,
      ]}
      accessibilityRole="button"
    >
      {inner}
    </Pressable>
  );
}

export function Card({ children, style, level = 1, onPress }) {
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={({ pressed } = {}) => [st.card, shadow(level), pressed && st.pressed, style]}
    >
      {children}
    </Comp>
  );
}

// A poster with the gradient scrim every movie app uses to keep text legible.
export function Poster({ movie, style, radius = S.radiusSm, children, width = 400 }) {
  // a real IMDb poster when we have one, else the seeded placeholder
  const src = movie.posterUrl || (movie.image ? poster(movie.image, width) : null);
  return (
    <View style={[{ backgroundColor: movie.color || C.panelHi, borderRadius: radius, overflow: 'hidden' }, style]}>
      {!!src && (
        <Image source={{ uri: src }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(10,13,20,0.15)', 'rgba(10,13,20,0.88)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function Chip({ label, solid, style }) {
  return (
    <View style={[st.chip, solid && { backgroundColor: C.tint, borderColor: C.tintLine }, style]}>
      <Text style={[st.chipText, solid && { color: C.accent }]}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, size = 30, style }) {
  return (
    <View style={[st.avatar, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Text style={{ color: C.muted, fontSize: size * 0.36, fontWeight: '800' }}>
        {initials(name)}
      </Text>
    </View>
  );
}

export const Label = ({ children, style }) => (
  <Text style={[F.label, style]}>{String(children).toUpperCase()}</Text>
);

export const Rule = ({ style }) => <View style={[st.rule, style]} />;

export function Stat({ value, caption, accent }) {
  return (
    <View style={{ flex: 1, minWidth: 80 }}>
      <Text style={[st.statValue, accent && { color: C.accent }]}>{value}</Text>
      <Text style={st.statCaption}>{caption}</Text>
    </View>
  );
}

export function SectionHead({ title, action, onAction, sub }) {
  return (
    <View style={st.sectionHead}>
      <View style={{ flex: 1 }}>
        <Text style={F.h2}>{title}</Text>
        {!!sub && <Text style={[F.tiny, { marginTop: 3 }]}>{sub}</Text>}
      </View>
      {!!action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={st.link}>{action}</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  btn: {
    minHeight: 50, borderRadius: S.radiusSm, paddingHorizontal: S.xl,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  btnSm: { minHeight: 40, paddingHorizontal: S.md, borderRadius: S.radiusXs },
  btnText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  pressed: { transform: [{ scale: 0.975 }], opacity: 0.92 },
  card: { backgroundColor: C.panel, borderRadius: S.radius, padding: S.xl },
  chip: {
    borderWidth: 1, borderColor: C.line, backgroundColor: C.chip,
    borderRadius: 100, paddingHorizontal: 11, paddingVertical: 6,
  },
  chipText: { fontSize: 11, color: C.muted, fontWeight: '700' },
  avatar: { backgroundColor: C.panelHi, alignItems: 'center', justifyContent: 'center' },
  rule: { height: 1, backgroundColor: C.line },
  statValue: { fontSize: 23, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  statCaption: { fontSize: 10.5, color: C.muted, marginTop: 3, lineHeight: 14 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginBottom: S.md },
  link: { color: C.accent, fontSize: 13, fontWeight: '700' },
});
