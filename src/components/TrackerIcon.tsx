import React from 'react'
import type { ColorValue } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import {
  Activity,
  AlertTriangle,
  Apple,
  ArrowUpDown,
  Bell,
  Bike,
  BookOpen,
  Brain,
  Briefcase,
  Calendar,
  Car,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  Coffee,
  Crown,
  DollarSign,
  Download,
  Droplet,
  Dumbbell,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flame,
  Folder,
  FolderPlus,
  Fuel,
  Gamepad2,
  Globe,
  Heart,
  Home,
  Key,
  Laptop,
  Link as LinkIcon,
  Lock,
  LogOut,
  Moon,
  MoreHorizontal,
  Music,
  PenTool,
  Pencil,
  Phone,
  Pill,
  Plane,
  Plus,
  RefreshCw,
  RotateCcw,
  Scale,
  Scissors,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  ShowerHead,
  Smile,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  Tv,
  Unlock,
  Upload,
  User,
  Users,
  Utensils,
  Wifi,
  Wrench,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react-native'
import { colors, normalizeColor } from '@/theme/tokens'

// Custom ISKCON-inspired Japa Mala SVG Icon matching Tracker Web
export function JapaMalaIcon({
  size = 20,
  color = colors.text,
  strokeWidth = 2,
}: {
  size?: number
  color?: ColorValue
  strokeWidth?: number
}) {
  const strokeColor = (typeof color === 'string' ? color : colors.text) as string
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={strokeColor}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="8.5" r="5.5" stroke={strokeColor} strokeWidth="1.5" strokeDasharray="3 3" />
      <Circle cx="12" cy="3" r="1.1" fill={strokeColor} />
      <Circle cx="17.5" cy="8.5" r="1.1" fill={strokeColor} />
      <Circle cx="6.5" cy="8.5" r="1.1" fill={strokeColor} />
      <Circle cx="15.89" cy="4.61" r="1.1" fill={strokeColor} />
      <Circle cx="8.11" cy="4.61" r="1.1" fill={strokeColor} />
      <Circle cx="15.89" cy="12.39" r="1.1" fill={strokeColor} />
      <Circle cx="8.11" cy="12.39" r="1.1" fill={strokeColor} />
      <Circle cx="12" cy="14" r="1.8" fill={strokeColor} stroke={strokeColor} strokeWidth="0.5" />
      <Path d="M12 15.8v3.2" strokeWidth="2.2" stroke={strokeColor} />
      <Path d="M10.5 19c0-0.8 3-0.8 3 0v1.5c0 .4-.4.8-.8.8h-1.4c-.4 0-.8-.4-.8-.8V19z" fill={strokeColor} opacity="0.9" />
    </Svg>
  )
}

export type KnownTrackerIconName =
  // Web Canonical Template Icons
  | 'Activity'
  | 'Apple'
  | 'Bell'
  | 'Bicycle'
  | 'BookOpen'
  | 'Brain'
  | 'Briefcase'
  | 'Calendar'
  | 'Car'
  | 'CheckSquare'
  | 'Coffee'
  | 'DollarSign'
  | 'Droplet'
  | 'Dumbbell'
  | 'FileText'
  | 'Flame'
  | 'Fuel'
  | 'Gamepad'
  | 'Globe'
  | 'Heart'
  | 'Home'
  | 'JapaMala'
  | 'Key'
  | 'Laptop'
  | 'Moon'
  | 'Music'
  | 'PenTool'
  | 'Phone'
  | 'Pill'
  | 'Plane'
  | 'Scissors'
  | 'ShoppingBag'
  | 'ShowerHead'
  | 'Smile'
  | 'Sparkles'
  | 'Sun'
  | 'Trash2'
  | 'TrendingUp'
  | 'Tv'
  | 'Users'
  | 'Utensils'
  | 'Wifi'
  | 'Wrench'
  // Mobile / UI Aliases
  | 'activity'
  | 'alert-triangle'
  | 'book-open'
  | 'briefcase'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'clock'
  | 'close'
  | 'code'
  | 'crown'
  | 'delete'
  | 'download'
  | 'edit'
  | 'eye'
  | 'eye-off'
  | 'filter'
  | 'folder'
  | 'folder-plus'
  | 'home'
  | 'journal'
  | 'link'
  | 'lock'
  | 'logout'
  | 'more-horizontal'
  | 'notes'
  | 'pencil'
  | 'plus'
  | 'refresh'
  | 'restore'
  | 'scale'
  | 'search'
  | 'settings'
  | 'shield'
  | 'sort'
  | 'sticky-note'
  | 'target'
  | 'task'
  | 'trash'
  | 'trophy'
  | 'unlock'
  | 'upload'
  | 'user'
  | 'vault'
  | 'weight'
  | 'work'
  | 'x'
  | 'zap'

export type TrackerIconName = KnownTrackerIconName | (string & {})

export type TrackerIconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number

// Central Icon Registry: maps normalized keys to icon components
type IconComponentType = LucideIcon | React.ComponentType<{ size?: number; color?: ColorValue; strokeWidth?: number }>

const ICON_REGISTRY: Record<string, IconComponentType> = {
  // Web Canonical Activity Icons
  activity: Activity,
  apple: Apple,
  bell: Bell,
  bicycle: Bike,
  bike: Bike,
  bookopen: BookOpen,
  brain: Brain,
  briefcase: Briefcase,
  calendar: Calendar,
  car: Car,
  checksquare: CheckSquare,
  coffee: Coffee,
  dollarsign: DollarSign,
  droplet: Droplet,
  dumbbell: Dumbbell,
  filetext: FileText,
  flame: Flame,
  fuel: Fuel,
  gamepad: Gamepad2,
  gamepad2: Gamepad2,
  globe: Globe,
  heart: Heart,
  home: Home,
  japamala: JapaMalaIcon,
  key: Key,
  laptop: Laptop,
  moon: Moon,
  music: Music,
  pentool: PenTool,
  phone: Phone,
  pill: Pill,
  plane: Plane,
  scissors: Scissors,
  shoppingbag: ShoppingBag,
  showerhead: ShowerHead,
  smile: Smile,
  sparkles: Sparkles,
  sun: Sun,
  trash2: Trash2,
  trendingup: TrendingUp,
  tv: Tv,
  users: Users,
  utensils: Utensils,
  wifi: Wifi,
  wrench: Wrench,

  // UI System Icons & Aliases
  alerttriangle: AlertTriangle,
  arrowupdown: ArrowUpDown,
  check: Check,
  chevronleft: ChevronLeft,
  chevronright: ChevronRight,
  clock: Clock,
  close: X,
  code: Code,
  crown: Crown,
  delete: Trash2,
  download: Download,
  edit: Pencil,
  eye: Eye,
  eyeoff: EyeOff,
  filter: Filter,
  folder: Folder,
  folderplus: FolderPlus,
  journal: BookOpen,
  link: LinkIcon,
  lock: Lock,
  logout: LogOut,
  morehorizontal: MoreHorizontal,
  notes: FileText,
  pencil: Pencil,
  plus: Plus,
  refresh: RefreshCw,
  refreshcw: RefreshCw,
  restore: RotateCcw,
  rotateccw: RotateCcw,
  scale: Scale,
  search: Search,
  settings: Settings,
  shield: Shield,
  sort: ArrowUpDown,
  stickynote: FileText,
  target: Target,
  task: CheckSquare,
  trash: Trash2,
  trophy: Trophy,
  unlock: Unlock,
  upload: Upload,
  user: User,
  vault: Shield,
  weight: Scale,
  work: Briefcase,
  x: X,
  zap: Zap,
}

const SIZE_MAP: Record<Exclude<TrackerIconSize, number>, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
}

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
  // Normalize icon key: strip dashes, underscores, and lowercase
  const normalizedKey = (name || '').toLowerCase().replace(/[-_\s]/g, '')
  const IconComponent = ICON_REGISTRY[normalizedKey] || Activity

  const numericSize = typeof size === 'number' ? size : SIZE_MAP[size] || 22
  const rawColor = (disabled ? colors.textSubtle : color) as string
  const resolvedColor = typeof rawColor === 'string' ? normalizeColor(rawColor, colors.text) : rawColor

  return (
    <IconComponent
      color={resolvedColor}
      size={numericSize}
      strokeWidth={strokeWidth}
    />
  )
}
