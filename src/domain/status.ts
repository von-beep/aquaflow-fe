import type { DeliveryStatus } from '@/domain/types'

export const STATUS_CHIP: Record<DeliveryStatus, string> = {
  Pending: 'c-orange',
  'In Progress': 'c-blue',
  Completed: 'c-green',
  Cancelled: 'c-gray',
}
