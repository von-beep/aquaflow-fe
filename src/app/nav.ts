import type { ComponentType } from 'react'
import {
  IconChat,
  IconCust,
  IconDash,
  IconGal,
  IconPay,
  IconRep,
  IconRoute,
  IconSet,
  IconTruck,
  IconUtang,
} from '@/app/icons'

export type PageId =
  | 'dash'
  | 'deliv'
  | 'routes'
  | 'cust'
  | 'utang'
  | 'inv'
  | 'coll'
  | 'rep'
  | 'chat'
  | 'settings'

export type NavPage = {
  id: PageId
  path: string
  label: string
  shortLabel: string
  Icon: ComponentType<{ className?: string }>
}

export const NAV_PAGES: NavPage[] = [
  { id: 'dash', path: '/admin/dashboard', label: 'Dashboard', shortLabel: 'Dashboard', Icon: IconDash },
  { id: 'deliv', path: '/admin/deliveries', label: 'Deliveries', shortLabel: 'Deliveries', Icon: IconTruck },
  { id: 'routes', path: '/admin/routes', label: 'Rider Routes', shortLabel: 'Rider', Icon: IconRoute },
  { id: 'cust', path: '/admin/customers', label: 'Customers', shortLabel: 'Customers', Icon: IconCust },
  { id: 'utang', path: '/admin/utang', label: 'Suki / Utang', shortLabel: 'Suki', Icon: IconUtang },
  { id: 'inv', path: '/admin/inventory', label: 'Gallon Inventory', shortLabel: 'Gallon', Icon: IconGal },
  { id: 'coll', path: '/admin/collections', label: 'Collections', shortLabel: 'Collections', Icon: IconPay },
  { id: 'rep', path: '/admin/reports', label: 'Reports', shortLabel: 'Reports', Icon: IconRep },
  { id: 'chat', path: '/admin/chat', label: 'Chat', shortLabel: 'Chat', Icon: IconChat },
  { id: 'settings', path: '/admin/settings', label: 'Settings', shortLabel: 'Settings', Icon: IconSet },
]

/** Bottom nav subset matching the HTML prototype */
export const MOBILE_NAV_IDS: PageId[] = ['dash', 'deliv', 'chat', 'utang', 'inv', 'settings']
