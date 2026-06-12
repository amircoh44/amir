/**
 * Adaptive navigation: a luminous sidebar rail on desktop/tablet, a translucent
 * dock on phones. No animations in the bar itself — battery-kind by design.
 */
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SIDEBAR_W } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Txt } from '@/ui/primitives';

type Ion = React.ComponentProps<typeof Ionicons>['name'];

const ITEMS: { href: string; label: string; icon: Ion; activeIcon: Ion }[] = [
  { href: '/', label: 'Today', icon: 'today-outline', activeIcon: 'today' },
  { href: '/prayers', label: 'Prayers', icon: 'book-outline', activeIcon: 'book' },
  { href: '/tehillim', label: 'Tehillim', icon: 'musical-notes-outline', activeIcon: 'musical-notes' },
  { href: '/zmanim', label: 'Zmanim', icon: 'time-outline', activeIcon: 'time' },
  { href: '/compass', label: 'Compass', icon: 'compass-outline', activeIcon: 'compass' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '/index';
  return pathname === href || pathname.startsWith(href + '/');
}

/* ---------- Desktop / tablet sidebar ---------- */
export function Sidebar() {
  const { c, fonts } = useTheme();
  const pathname = usePathname();
  return (
    <View style={[styles.sidebar, { width: SIDEBAR_W, backgroundColor: c.backgroundElevated, borderRightColor: c.line }]}>
      <View style={styles.brand}>
        <LinearGradient colors={['#f3d27a', '#e7b955', '#9a7322']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandMark}>
          <Txt style={{ color: '#1a1206', fontSize: 20, fontWeight: '900' }}>ס</Txt>
        </LinearGradient>
        <View>
          <Txt style={{ color: c.text, fontFamily: fonts.display, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }}>SUPER</Txt>
          <Txt style={{ color: c.accentSoft, fontFamily: fonts.display, fontSize: 13, letterSpacing: 4 }}>SIDDUR</Txt>
        </View>
      </View>

      <View style={{ gap: 4, marginTop: 8 }}>
        {ITEMS.map((it) => {
          const on = isActive(pathname, it.href);
          return (
            <Link key={it.href} href={it.href} asChild>
              <Pressable style={styles.railItem}>
                {on && (
                  <LinearGradient
                    colors={[c.surface2, 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                  />
                )}
                {on && <View style={[styles.railBead, { backgroundColor: c.accent }]} />}
                <Ionicons name={on ? it.activeIcon : it.icon} size={22} color={on ? c.accent : c.tabInactive} />
                <Txt style={{ color: on ? c.text : c.textSecondary, fontSize: 15, fontWeight: on ? '700' : '500' }}>{it.label}</Txt>
              </Pressable>
            </Link>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <Link href="/settings" asChild>
        <Pressable style={styles.railItem}>
          {pathname === '/settings' && <View style={[styles.railBead, { backgroundColor: c.accent }]} />}
          <Ionicons name={pathname === '/settings' ? 'sparkles' : 'sparkles-outline'} size={21} color={pathname === '/settings' ? c.accent : c.tabInactive} />
          <Txt style={{ color: pathname === '/settings' ? c.text : c.textSecondary, fontSize: 15, fontWeight: pathname === '/settings' ? '700' : '500' }}>Personal Zone</Txt>
        </Pressable>
      </Link>
      <Txt variant="mono" style={{ color: c.textFaint, fontSize: 11, marginTop: 8 }}>Offline-first · v1</Txt>
    </View>
  );
}

/* ---------- Phone dock ---------- */
export function Dock() {
  const { c } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.dock, { backgroundColor: c.navBar, borderTopColor: c.line, paddingBottom: Math.max(insets.bottom, 8) }]}>
      {ITEMS.map((it) => {
        const on = isActive(pathname, it.href);
        return (
          <Link key={it.href} href={it.href} asChild>
            <Pressable style={styles.dockItem}>
              {on && <View style={[styles.dockBead, { backgroundColor: c.accent }]} />}
              <Ionicons name={on ? it.activeIcon : it.icon} size={23} color={on ? c.accent : c.tabInactive} />
              <Txt style={{ fontSize: 10.5, color: on ? c.accent : c.tabInactive, fontWeight: on ? '700' : '500' }}>{it.label}</Txt>
            </Pressable>
          </Link>
        );
      })}
      <Link href="/settings" asChild>
        <Pressable style={styles.dockItem}>
          {pathname === '/settings' && <View style={[styles.dockBead, { backgroundColor: c.accent }]} />}
          <Ionicons name={pathname === '/settings' ? 'sparkles' : 'sparkles-outline'} size={23} color={pathname === '/settings' ? c.accent : c.tabInactive} />
          <Txt style={{ fontSize: 10.5, color: pathname === '/settings' ? c.accent : c.tabInactive, fontWeight: pathname === '/settings' ? '700' : '500' }}>Zone</Txt>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingTop: 28, paddingBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  brandMark: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  railItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, overflow: 'hidden' },
  railBead: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2 },
  dock: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, paddingHorizontal: 6 },
  dockItem: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 4 },
  dockBead: { position: 'absolute', top: 0, width: 18, height: 3, borderRadius: 2 },
});
