import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Search as SearchIcon, X } from 'lucide-react-native'
import { SearchRepository, type SearchResult } from '@/db/repository'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'

const SEARCH_DEBOUNCE_MS = 150

const SearchRow = ({ item, onPress }: { item: SearchResult; onPress: (item: SearchResult) => void }) => {
  const { colors } = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}, ${item.entityType}`}
      onPress={() => onPress(item)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.primarySubtle }]}>
        <TrackerIcon name="search" size="sm" color={colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {item.title || 'Untitled'}
        </Text>
        <Text numberOfLines={2} style={[styles.meta, { color: colors.textMuted }]}>
          {item.entityType.replace(/_/g, ' ')}{item.body ? ` · ${item.body}` : ''}
        </Text>
      </View>
    </Pressable>
  )
}

export function SearchScreen() {
  const db = useSQLiteContext()
  const { colors } = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const requestId = useRef(0)
  const repository = useMemo(() => new SearchRepository(db), [db])
  const router = useRouter()

  const handleResultPress = useCallback((item: SearchResult) => {
    switch (item.entityType) {
      case 'activity_template':
        router.push('/activities')
        break
      case 'activity_log':
      case 'task':
        router.push('/')
        break
      case 'note':
        router.push('/notes')
        break
      case 'journal':
        router.push('/journal')
        break
      case 'calendar_event':
        router.push('/calendar')
        break
      case 'vault':
        router.push('/vault')
        break
    }
  }, [router])

  useEffect(() => {
    const trimmed = query.trim()

    if (!trimmed) {
      setResults([])
      setSearching(false)
      return
    }

    const id = ++requestId.current
    setSearching(true)

    const timer = setTimeout(() => {
      void repository.search(trimmed, 50).then((next) => {
        if (id !== requestId.current) return
        setResults(next)
        setSearching(false)
      }).catch(() => {
        if (id === requestId.current) {
          setResults([])
          setSearching(false)
        }
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, repository])

  const renderItem = useCallback(
    ({ item }: { item: SearchResult }) => (
      <SearchRow item={item} onPress={handleResultPress} />
    ),
    [handleResultPress]
  )

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={[styles.heading, { color: colors.text }]}>Search</Text>

        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search Tracker"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search Tracker"
            style={[styles.input, { color: colors.text }]}
          />
          {query.length > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <X size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {searching ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : query.trim() && results.length === 0 ? (
          <View style={styles.center}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No results</Text>
            <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
              Search your locally indexed Tracker data.
            </Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item) => `${item.entityType}:${item.entityId}`}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={results.length === 0 ? styles.emptyList : styles.list}
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews
          />
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.md },
  heading: { ...typography.h2 },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: { flex: 1, ...typography.body },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1 },
  row: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  title: { ...typography.body, fontWeight: '700' },
  meta: { ...typography.caption },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  emptyTitle: { ...typography.h3 },
  emptyBody: { ...typography.body, textAlign: 'center' },
})
