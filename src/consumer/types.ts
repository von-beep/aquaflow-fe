export const CONSUMER_SESSION_KEY = 'aquaFlow_consumer_v1'

export type ConsumerProfile = {
  id: string
  email: string
  name: string
  phone: string
}

export type ConsumerSession = {
  token: string | null
  consumer: ConsumerProfile | null
}

export const defaultConsumerSession = (): ConsumerSession => ({
  token: null,
  consumer: null,
})
