import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'expo-router'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSQLiteContext } from 'expo-sqlite'
import { Search as SearchIcon, X } from 'lucide-react-native'
import { SearchRepository, type SearchResult } from '@/db/repository'
import { Screen } from '@/components/Screen'
import { TrackerIcon } from '@/components/TrackerIcon'
import { radius, spacing, typography } from '@/theme/tokens'
import { useTheme } from '@/theme/ThemeContext'
import { measureAsync } from '@/utils/performance'
import { fastCache } from '@/utils/dataCache'

const SEARCH_DEBOUNCE_MS = 150

function getEntityIcon(type: string) {
  switch (type) {
    case 'activity_template':
      return 'activity'
    case 'activity_log':
    case 'task':
      return 'check'
    case 'note':
      return 'notes'
    case 'journal':
      return 'journal'
    case 'calendar_event':
      return 'calendar'
    case 'vault':
      return 'vault'
    default:
      return 'search'
  }
}

const SearchRow = memo(function SearchRow({ item, onPress }: { item: SearchResult; onPress: (item: SearchResult) => void }) {
  const { colors } = useTheme()
  const iconName = getEntityIcon(item.entityType)

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
        <TrackerIcon name={iconName} size="sm" color={colors.primary} />
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
})

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
        router.push('/(app)/(tabs)/activities')
        break
      case 'activity_log':
      case 'task':
        router.push('/(app)/(tabs)')
        break
      case 'note':
        router.push('/(app)/(tabs)/notes')
        break
      case 'journal':
        router.push('/(app)/(tabs)/journal')
        break
      case 'calendar_event':
        router.push('/(app)/(tabs)/calendar')
        break
      case 'vault':
        router.push('/(app)/vault')
        break
      default:
        router.push('/(app)/(tabs)')
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
    const cacheKey = `search:${trimmed.toLocaleLowerCase()}`
    const cached = fastCache.peek<SearchResult[]>(cacheKey)

    if (cached) {
      setResults(cached)
      setSearching(false)
    } else {
      setSearching(true)
    }

    const timer = setTimeout(() => {
      void measureAsync('search:local', () => repository.search(trimmed, 50)).then((next) => {
        if (id !== requestId.current) return
        fastCache.set(cacheKey, next, 30_000)
        setResults(next)
        setSearching(false)
      }).catch(() => {
        if (id === requestId.current) {
          // Preserve a valid cached result when a refresh fails.
          if (!cached) setResults([])
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

  const renderHeader = useMemo(() => (
    <View style={styles.headerContainer}>
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

      {searching && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}
    </View>
  ), [colors.border, colors.primary, colors.surface, colors.text, colors.textMuted, query, searching])

  const renderEmpty = useMemo(() => {
    if (searching) return null
    if (query.trim() && results.length === 0) {
      return (
        <View style={styles.center}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No results</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
            {`No items matched "${query.trim()}".`}
          </Text>
        </View>
      )
    }
    return (
      <View style={styles.center}>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>Search Tracker</Text>
        <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
          Quickly find tasks, habits, notes, journals, calendar events, and vault files.
        </Text>
      </View>
    )
  }, [colors.text, colors.textMuted, query, results.length, searching])

  return (
    <Screen scrollable={false}>
      <FlatList
        data={results}
        keyExtractor={(item) => `${item.entityType}:${item.entityId}`}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={12}
        windowSize={7}
        removeClippedSubviews
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  headerContainer: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  heading: { ...typography.xl, fontWeight: '800' },
  searchBox: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: { flex: 1, ...typography.base },
  loadingWrap: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  row: {
    minHeight: 68,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  title: { ...typography.base, fontWeight: '700' },
  meta: { ...typography.xs },
  center: {
    paddingTop: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  emptyTitle: { ...typography.lg, fontWeight: '700' },
  emptyBody: { ...typography.base, textAlign: 'center', paddingHorizontal: spacing.lg },
})
