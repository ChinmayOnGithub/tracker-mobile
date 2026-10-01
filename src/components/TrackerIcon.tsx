import React from 'react'
import {
  Activity,
  ArrowUpDown,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Home,
  Link as LinkIcon,
  Lock,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  Unlock,
  Upload,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import { colors } from '@/theme/tokens'

export type TrackerIconName =
  | 'home'
  | 'calendar'
  | 'activity'
  | 'work'
  | 'briefcase'
  | 'weight'
  | 'journal'
  | 'book-open'
  | 'notes'
  | 'sticky-note'
  | 'link'
  | 'vault'
  | 'trash'
  | 'delete'
  | 'settings'
  | 'search'
  | 'plus'
  | 'edit'
  | 'restore'
  | 'check'
  | 'x'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'more-horizontal'
  | 'filter'
  | 'sort'
  | 'upload'
  | 'download'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eye-off'
  | 'clock'
  | 'sparkles'
  | 'refresh'
  | 'user'
  | 'logout'

export type TrackerIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number

const ICON_REGISTRY: Record<TrackerIconName, LucideIcon> = {
  home: Home,
  calendar: Calendar,
  activity: Activity,
  work: Briefcase,
  briefcase: Briefcase,
  weight: Scale,
  journal: BookOpen,
  'book-open': BookOpen,
  notes: FileText,
  'sticky-note': FileText,
  link: LinkIcon,
  vault: Shield,
  trash: Trash2,
  delete: Trash2,
  settings: Settings,
  search: Search,
  plus: Plus,
  edit: Pencil,
  restore: RotateCcw,
  check: Check,
  x: X,
  close: X,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'more-horizontal': MoreHorizontal,
  filter: Filter,
  sort: ArrowUpDown,
  upload: Upload,
  download: Download,
  lock: Lock,
  unlock: Unlock,
  eye: Eye,
  'eye-off': EyeOff,
  clock: Clock,
  sparkles: Sparkles,
  refresh: RefreshCw,
  user: User,
  logout: LogOut,
}

const SIZE_MAP: Record<Exclude<TrackerIconSize, number>, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
}

import type { ColorValue } from 'react-native'

export interface TrackerIconProps {
  name: TrackerIconName
  size?: TrackerIconSize
  color?: string | ColorValue
  strokeWidth?: number
  disabled?: boolean
}

export function TrackerIcon({
  name,
  size = 'md',
  color = colors.text,
  strokeWidth = 2,
  disabled = false,
}: TrackerIconProps) {
  const IconComponent = ICON_REGISTRY[name]
  if (!IconComponent) {
    return null
  }

  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size] || 22
  const resolvedColor = (disabled ? colors.textSubtle : color) as string

  return (
    <IconComponent
      color={resolvedColor}
      size={numericSize}
      strokeWidth={strokeWidth}
    />
  )
}
