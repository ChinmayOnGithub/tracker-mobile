import { useCallback, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { useSQLiteContext } from 'expo-sqlite'
import { trackerApi, type VaultBreadcrumb, type VaultItem } from '@/api/client'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { EmptyState } from '@/components/EmptyState'
import { ErrorView } from '@/components/ErrorView'
import { Input } from '@/components/Input'
import { LoadingState } from '@/components/LoadingState'
import { Screen } from '@/components/Screen'
import { TrackerIcon, type TrackerIconName } from '@/components/TrackerIcon'
import { useTheme } from '@/theme/ThemeContext'
import { radius, spacing, typography } from '@/theme/tokens'
import { SearchRepository } from '@/db/repository'

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function getItemIcon(item: VaultItem): TrackerIconName {
  if (item.isFolder) return 'folder'
  const ext = (item.extension || '').toLowerCase()
  if (['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) return 'sparkles'
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return 'notes'
  return 'shield'
}

export function VaultScreen() {
  const db = useSQLiteContext()
  const { colors } = useTheme()
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [items, setItems] = useState<VaultItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<VaultBreadcrumb[]>([
    { id: null, name: 'Vault' },
  ])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // New folder modal
  const [folderModalVisible, setFolderModalVisible] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  const loadVault = useCallback(
    async (isPull = false) => {
      if (isPull) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const res = await trackerApi.getVaultItems(currentFolderId)
        setItems(res.items)
        if (res.breadcrumbs && res.breadcrumbs.length > 0) {
          setBreadcrumbs(res.breadcrumbs)
        }
        await new SearchRepository(db).upsertMany(
          res.items.map((item) => ({
            entityType: 'vault' as const,
            entityId: item.id,
            title: item.name,
            body: item.isFolder ? 'folder' : [item.extension ?? '', item.fileSize ?? ''].join(' '),
            updatedAt: item.updatedAt ?? item.createdAt ?? null,
          }))
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load Vault items.')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [currentFolderId, db]
  )

  useFocusEffect(
    useCallback(() => {
      void loadVault()
    }, [loadVault])
  )

  const handleCreateFolder = async () => {
    const trimmed = folderName.trim()
    if (!trimmed) {
      setFolderError('Folder name is required.')
      return
    }

    setCreatingFolder(true)
    setFolderError(null)
    try {
      await trackerApi.createVaultFolder(trimmed, currentFolderId)
      setFolderName('')
      setFolderModalVisible(false)
      void loadVault()
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : 'Failed to create folder.')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDeleteItem = (item: VaultItem) => {
    Alert.alert(
      'Move to Bin',
      `Are you sure you want to delete "${item.name}"? It can be restored from the Bin.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await trackerApi.deleteVaultItem(item.id)
              setItems((prev) => prev.filter((i) => i.id !== item.id))
              await new SearchRepository(db).remove('vault', item.id)
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete item.')
            }
          },
        },
      ]
    )
  }

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId)
  }

  if (loading && !refreshing) {
    return (
      <Screen>
        <LoadingState message="Accessing encrypted vault..." />
      </Screen>
    )
  }

  return (
    <Screen onRefresh={() => void loadVault(true)} refreshing={refreshing}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Secure Vault</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              AES-256-GCM encrypted confidential document cabinet.
            </Text>
          </View>
          <Button
            label="+ Folder"
            variant="outline"
            size="sm"
            onPress={() => {
              setFolderName('')
              setFolderError(null)
              setFolderModalVisible(true)
            }}
            accessibilityLabel="Create new vault folder"
          />
        </View>

        {/* Breadcrumb Trail */}
        {breadcrumbs.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.breadcrumbScroll}
          >
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1
              return (
                <View key={crumb.id || 'root'} style={styles.crumbItem}>
                  <TouchableOpacity
                    onPress={() => !isLast && navigateToFolder(crumb.id)}
                    disabled={isLast}
                    accessibilityRole="button"
                    accessibilityLabel={`Navigate to ${crumb.name}`}
                  >
                    <Text
                      style={[
                        styles.crumbText,
                        { color: isLast ? colors.text : colors.primary },
                        isLast && { fontWeight: '700' },
                      ]}
                    >
                      {crumb.name}
                    </Text>
                  </TouchableOpacity>
                  {!isLast ? (
                    <Text style={[styles.crumbSeparator, { color: colors.textMuted }]}>
                      /
                    </Text>
                  ) : null}
                </View>
              )
            })}
          </ScrollView>
        ) : null}
      </View>

      {error ? <ErrorView message={error} onRetry={() => void loadVault()} /> : null}

      {/* Items List */}
      {items.length === 0 ? (
        <EmptyState
          title="Vault is empty"
          message={
            currentFolderId
              ? 'This folder has no files or subfolders.'
              : 'Store confidential files, encrypted documents, and archives.'
          }
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => {
            const iconName = getItemIcon(item)
            const iconColor = item.isFolder ? colors.primary : colors.indigo

            return (
              <Card key={item.id} style={styles.card}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => {
                    if (item.isFolder) {
                      navigateToFolder(item.id)
                    } else {
                      Alert.alert(
                        item.name,
                        `Type: ${item.extension?.toUpperCase() || 'FILE'}\nSize: ${formatBytes(item.fileSize)}\n\nThis encrypted file is securely stored in your personal vault.`,
                        [{ text: 'Close' }]
                      )
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.isFolder ? 'Folder' : 'File'} ${item.name}`}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: `${iconColor}22` },
                    ]}
                  >
                    <TrackerIcon name={iconName} size="xs" color={iconColor} />
                  </View>

                  <View style={styles.copyWrap}>
                    <Text
                      style={[styles.itemName, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {item.isFolder
                        ? 'Folder'
                        : `${formatBytes(item.fileSize)} • ${item.extension?.toUpperCase() || 'FILE'}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteItem(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name}`}
                  >
                    <TrackerIcon name="trash" size="xs" color={colors.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </Card>
            )
          })}
        </View>
      )}

      {/* Create Folder Modal */}
      <Modal
        visible={folderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Card style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Folder</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
              Enter a name for the encrypted folder.
            </Text>

            <Input
              label="Folder Name"
              value={folderName}
              onChangeText={setFolderName}
              placeholder="e.g. Legal Documents, Tax 2026"
              error={folderError || undefined}
              autoFocus
            />

            <View style={styles.modalActionRow}>
              <Button
                label="Cancel"
                variant="outline"
                size="sm"
                onPress={() => setFolderModalVisible(false)}
                disabled={creatingFolder}
              />
              <Button
                label={creatingFolder ? 'Creating...' : 'Create Folder'}
                variant="primary"
                size="sm"
                onPress={handleCreateFolder}
                disabled={creatingFolder}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: typography.hero.fontSize,
    lineHeight: typography.hero.lineHeight,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: typography.sm.fontSize,
    lineHeight: typography.sm.lineHeight,
  },
  breadcrumbScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: 4,
  },
  crumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  crumbText: {
    fontSize: typography.xs.fontSize,
  },
  crumbSeparator: {
    fontSize: typography.xs.fontSize,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    padding: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: typography.sm.fontSize,
    fontWeight: '700',
  },
  itemMeta: {
    fontSize: 11,
  },
  deleteButton: {
    padding: spacing.xs,
    borderRadius: radius.md,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: typography.lg.fontSize,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: typography.sm.fontSize,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
})
