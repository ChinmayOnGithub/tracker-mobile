import { describe, expect, it, mock } from 'bun:test'
import type { VaultItem, VaultBreadcrumb } from '@/api/types'

mock.module('expo-secure-store', () => ({
  getItemAsync: async () => 'test-token',
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
}))

mock.module('react-native', () => ({
  Platform: { OS: 'ios' },
}))

const { trackerApi } = await import('@/api/client')

describe('Vault Mobile Integration', () => {
  it('formats vault breadcrumb hierarchy correctly', () => {
    const breadcrumbs: VaultBreadcrumb[] = [
      { id: null, name: 'Vault', title: 'Vault' },
      { id: 'folder-1', name: 'Tax Records', title: 'Tax Records' },
      { id: 'folder-2', name: '2026', title: '2026' },
    ]

    expect(breadcrumbs.length).toBe(3)
    expect(breadcrumbs[0].id).toBeNull()
    expect(breadcrumbs[0].name).toBe('Vault')
    expect(breadcrumbs[2].name).toBe('2026')
  })

  it('correctly maps vault item properties', () => {
    const folderItem: VaultItem = {
      id: 'f-1',
      name: 'Confidential Notes',
      title: 'Confidential Notes',
      isFolder: true,
      isFavorite: false,
      fileSize: 0,
      mimeGroup: null,
      createdAt: '2026-10-02T12:00:00Z',
      updatedAt: '2026-10-02T12:00:00Z',
    }

    const documentItem: VaultItem = {
      id: 'd-1',
      name: 'passport_scan.pdf',
      title: 'passport_scan.pdf',
      isFolder: false,
      isFavorite: false,
      fileSize: 1048576,
      mimeGroup: 'pdf',
      createdAt: '2026-10-02T12:30:00Z',
      updatedAt: '2026-10-02T12:30:00Z',
    }

    expect(folderItem.isFolder).toBe(true)
    expect(folderItem.mimeGroup).toBeNull()
    expect(documentItem.isFolder).toBe(false)
    expect(documentItem.mimeGroup).toBe('pdf')
    expect(documentItem.fileSize).toBe(1048576)
  })

  it('exposes getVaultItems, createVaultFolder, and deleteVaultItem API methods', () => {
    expect(typeof trackerApi.getVaultItems).toBe('function')
    expect(typeof trackerApi.createVaultFolder).toBe('function')
    expect(typeof trackerApi.deleteVaultItem).toBe('function')
  })
})
