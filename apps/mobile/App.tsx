import { useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import Constants from 'expo-constants'
import {
  COUNTRIES,
  COUNTRY_BY_ISO,
  DEFAULT_SETTINGS,
  ORIGIN,
  usd,
  type Address,
  type QuoteInput,
} from '@amir/shipping-core'
import { createShippingClient, useAddressCheck, useRates } from '@amir/shipping-client'
import { carrierColor, theme } from './src/theme'

/**
 * The entire rating engine, packaging model and all four carriers' tariff
 * tables come from @amir/shipping-core — the same code the web calculator
 * runs. Nothing here is duplicated from it.
 */

const PROXY_URL = (Constants.expoConfig?.extra?.ratesProxyUrl as string | undefined) ?? ''

const POPULAR = ['GB', 'CA', 'DE', 'AU', 'JP', 'FR', 'MX', 'NL', 'IT', 'ES']

export default function App() {
  const [iso, setIso] = useState('GB')
  const [search, setSearch] = useState('')
  const [item, setItem] = useState(DEFAULT_SETTINGS.item)
  const [street1, setStreet1] = useState('')
  const [zip, setZip] = useState('')

  const client = useMemo(
    () => (PROXY_URL ? createShippingClient({ baseUrl: PROXY_URL }) : null),
    [],
  )

  const country = COUNTRY_BY_ISO[iso]

  const input = useMemo<QuoteInput>(
    () => ({
      country,
      item,
      pack: DEFAULT_SETTINGS.pack,
      fuelPct: DEFAULT_SETTINGS.fuelPct,
      residential: true,
      signature: false,
      insurance: false,
      remoteArea: false,
      ddp: false,
    }),
    [country, item],
  )

  const to: Address | null = street1.trim()
    ? { street1: street1.trim(), zip: zip.trim() || undefined, country: iso }
    : null

  const { rows, loading, error, offline, messages } = useRates(client, input, to)
  const addressCheck = useAddressCheck(client, to)

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES.filter((c) => POPULAR.includes(c.iso))
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 12)
  }, [search])

  const num = (v: number, set: (n: number) => void, label: string, step = 1) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        value={String(v)}
        onChangeText={(t) => set(Number(t) || 0)}
        placeholderTextColor={theme.dim}
        accessibilityLabel={label}
      />
    </View>
  )

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Denver → the world</Text>
          <Text style={styles.subtitle}>
            {ORIGIN.city}, {ORIGIN.state} {ORIGIN.zip} → {country?.name}
          </Text>

          <Text style={styles.legend}>Destination</Text>
          <TextInput
            style={styles.input}
            placeholder="Search 229 destinations"
            placeholderTextColor={theme.dim}
            value={search}
            onChangeText={setSearch}
          />
          <View style={styles.chips}>
            {matches.map((c) => (
              <Pressable
                key={c.iso}
                onPress={() => {
                  setIso(c.iso)
                  setSearch('')
                }}
                style={[styles.chip, c.iso === iso && styles.chipOn]}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, c.iso === iso && styles.chipTextOn]}>{c.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.legend}>Parcel</Text>
          <View style={styles.row}>
            {num(item.lengthIn, (n) => setItem({ ...item, lengthIn: n }), 'Length in')}
            {num(item.widthIn, (n) => setItem({ ...item, widthIn: n }), 'Width in')}
            {num(item.heightIn, (n) => setItem({ ...item, heightIn: n }), 'Height in')}
          </View>
          <View style={styles.row}>
            {num(item.weightLb, (n) => setItem({ ...item, weightLb: n }), 'Weight lb')}
            {num(item.valueUsd, (n) => setItem({ ...item, valueUsd: n }), 'Value USD')}
            {num(item.quantity, (n) => setItem({ ...item, quantity: Math.max(1, n) }), 'Qty')}
          </View>

          <Text style={styles.legend}>
            Delivery address {client ? '' : '— proxy not configured'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Street address (enables live rates)"
            placeholderTextColor={theme.dim}
            value={street1}
            onChangeText={setStreet1}
            autoCapitalize="words"
          />
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Postal code"
            placeholderTextColor={theme.dim}
            value={zip}
            onChangeText={setZip}
            autoCapitalize="characters"
          />

          {addressCheck.loading && <Text style={styles.hint}>Checking address…</Text>}
          {addressCheck.data && !addressCheck.data.valid && (
            <Text style={[styles.hint, { color: theme.warn }]}>
              {addressCheck.data.messages.join(' · ') || 'Address could not be verified'}
            </Text>
          )}
          {addressCheck.data?.valid && (
            <Text style={[styles.hint, { color: theme.good }]}>Address verified</Text>
          )}

          <View style={styles.headerRow}>
            <Text style={styles.legend}>Rates</Text>
            {loading && <ActivityIndicator size="small" color={theme.accent} />}
          </View>

          {offline && (
            <Text style={styles.hint}>
              Showing published tariff rates. Enter a street address to fetch live account rates.
            </Text>
          )}
          {error && (
            <Text style={[styles.hint, { color: theme.warn }]}>
              Live rates unavailable ({error}). Published tariffs shown below.
            </Text>
          )}
          {messages.map((m) => (
            <Text key={m} style={styles.hint}>
              {m}
            </Text>
          ))}

          {rows.map((row) => {
            const price = row.live?.amount ?? row.published?.shipperCost
            if (price === undefined) return null
            const days = row.live?.deliveryDays ?? row.published?.transitDays
            return (
              <View key={row.service.id} style={styles.rate}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: carrierColor[row.service.carrier] ?? theme.dim },
                  ]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rateName}>{row.service.name}</Text>
                  <Text style={styles.rateMeta}>
                    {row.live ? 'live account rate' : 'published tariff'}
                    {days ? ` · ${days} days` : ''}
                    {row.published ? ` · ${row.published.container.name}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ratePrice}>{usd(price)}</Text>
                  {row.savingVsList != null && row.savingVsList > 0 && (
                    <Text style={styles.saving}>{usd(row.savingVsList)} under list</Text>
                  )}
                </View>
              </View>
            )
          })}

          {rows.length === 0 && (
            <Text style={styles.hint}>
              No service can carry this parcel to {country?.name}.
            </Text>
          )}

          <Text style={styles.footer}>
            Published rates come from the carriers' 2026 tariffs bundled in the app, so they work
            offline. Live rates come from your EasyPost account through the rate proxy and are
            commercial pricing, which is why they read lower.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  scroll: { padding: 18, paddingBottom: 60 },
  title: { color: theme.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { color: theme.muted, fontSize: 13, marginTop: 2, marginBottom: 8 },
  legend: {
    color: theme.dim,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: {
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    color: theme.text,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 15,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  chip: {
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.panel,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  chipOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.muted, fontSize: 13 },
  chipTextOn: { color: '#08101f', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  field: { flex: 1 },
  fieldLabel: { color: theme.muted, fontSize: 12, marginBottom: 4 },
  hint: { color: theme.dim, fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  rate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.panel,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  dot: { width: 9, height: 9, borderRadius: 5 },
  rateName: { color: theme.text, fontSize: 14.5, fontWeight: '600' },
  rateMeta: { color: theme.dim, fontSize: 11.5, marginTop: 2 },
  ratePrice: { color: theme.text, fontSize: 16, fontWeight: '700' },
  saving: { color: theme.good, fontSize: 11, marginTop: 2 },
  footer: {
    color: theme.dim,
    fontSize: 11.5,
    lineHeight: 17,
    marginTop: 26,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.line,
  },
})
