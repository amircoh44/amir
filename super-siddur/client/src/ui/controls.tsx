/**
 * Small settings controls: labelled Field, Segmented selector, Toggle row, and
 * a themed TextField — all styled to the Midnight & Gold system.
 */
import { Pressable, Switch, TextInput, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { Txt } from '@/ui/primitives';

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="kicker">{label}</Txt>
      {children}
      {hint ? <Txt variant="mono" style={{ fontSize: 11.5 }}>{hint}</Txt> : null}
    </View>
  );
}

export function TextField(props: React.ComponentProps<typeof TextInput>) {
  const { c, fonts } = useTheme();
  return (
    <TextInput
      placeholderTextColor={c.textFaint}
      {...props}
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: c.text,
          fontFamily: fonts.sans,
          fontSize: 16,
        },
        props.style,
      ]}
    />
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.surface, borderRadius: 12, borderWidth: 1, borderColor: c.line, padding: 4, gap: 4, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={{ flexGrow: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 9, backgroundColor: on ? c.surface2 : 'transparent', alignItems: 'center' }}>
            <Txt style={{ fontSize: 14, fontWeight: on ? '700' : '500', color: on ? c.accent : c.textSecondary }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Txt variant="body">{label}</Txt>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: c.accentSoft, false: c.line }} thumbColor={value ? c.accent : c.textFaint} />
    </View>
  );
}
