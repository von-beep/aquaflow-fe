import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatMoney } from '@/domain/money'
import { nowTimeInManila } from '@/domain/dates'
import { formatOpenHoursLabel, isOpenAt } from '@/domain/hours'
import { ConsumerAuthModal } from '@/features/landing/ConsumerAuthModal'
import { ConsumerOrdersPanel } from '@/features/landing/ConsumerOrdersPanel'
import { ConsumerAddressesModal } from '@/features/landing/ConsumerAddressesModal'
import { ConsumerProfileModal } from '@/features/landing/ConsumerProfileModal'
import { ConsumerChangePasswordModal } from '@/features/landing/ConsumerChangePasswordModal'
import { ConsumerChatModal } from '@/features/landing/ConsumerChatModal'
import { CartCheckoutModal, type CartLine } from '@/features/landing/CartCheckoutModal'
import { StationMapView } from '@/features/landing/StationMapView'
import { Modal } from '@/components/Modal'
import {
  clearConsumerSession,
  loadConsumerSession,
  saveConsumerSession,
} from '@/consumer/session'
import {
  cartToLandingItems,
  loadLandingBrowseState,
  reconcileCartLines,
  saveLandingBrowseState,
} from '@/consumer/landingState'
import {
  changedOrderIds,
  loadOrderStatusSeen,
  orderStatusSnapshot,
  saveOrderStatusSeen,
} from '@/consumer/orderStatusSeen'
import type { ConsumerProfile, ConsumerSession } from '@/consumer/types'
import * as api from '@/api/client'
import { configuredApiBaseUrl } from '@/session/types'
import '@/styles/landing.css'

type LoadState = 'loading' | 'ready' | 'error'
type NavTab = 'home' | 'orders' | 'addresses' | 'profile'

function ProductThumb({ name }: { name: string }) {
  const lower = name.toLowerCase()
  const bottled = lower.includes('bottle') || lower.includes('ml')
  return (
    <div className="lp-product-thumb" aria-hidden="true">
      {bottled ? (
        <svg viewBox="0 0 48 48" fill="none">
          <rect x="16" y="8" width="16" height="6" rx="2" fill="#7eb6e8" />
          <path
            d="M18 14h12l2 26a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4l2-26z"
            fill="#0e63c4"
          />
          <path d="M20 22h8v14h-8z" fill="#e8f1fb" opacity="0.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" fill="none">
          <ellipse cx="24" cy="14" rx="10" ry="4" fill="#7eb6e8" />
          <path
            d="M14 14c0 16 2 26 10 26s10-10 10-26"
            stroke="#0e63c4"
            strokeWidth="3.5"
            fill="#0e63c4"
          />
          <ellipse cx="24" cy="40" rx="10" ry="3.5" fill="#0a4d9b" />
          <path d="M18 22h12" stroke="#e8f1fb" strokeWidth="2" opacity="0.45" />
        </svg>
      )}
    </div>
  )
}

export function LandingPage() {
  const apiBaseUrl = configuredApiBaseUrl()
  const browseRef = useRef(loadLandingBrowseState())
  const prevStationRef = useRef<string | null>(null)
  const cartReadyRef = useRef(false)

  const [stations, setStations] = useState<api.PublicStation[]>([])
  const [stationId, setStationId] = useState(() => browseRef.current.stationId)
  const [currency, setCurrency] = useState('₱')
  const [products, setProducts] = useState<api.PublicProduct[]>([])
  const [paymentMethods, setPaymentMethods] = useState<api.PublicPaymentMethod[]>([])
  const [stationsState, setStationsState] = useState<LoadState>('loading')
  const [productsState, setProductsState] = useState<LoadState>('ready')
  const [error, setError] = useState<string | null>(null)

  const [qtyByProduct, setQtyByProduct] = useState<Record<string, number>>({})
  const [cart, setCart] = useState<CartLine[]>([])
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [ordersModalOpen, setOrdersModalOpen] = useState(false)

  const [consumerSession, setConsumerSession] = useState<ConsumerSession>(() =>
    loadConsumerSession(),
  )
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authIntent, setAuthIntent] = useState<'none' | 'checkout' | 'chat'>('none')
  const [profileOpen, setProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [addressesOpen, setAddressesOpen] = useState(false)
  const [addressesTick, setAddressesTick] = useState(0)
  const [ordersRefresh, setOrdersRefresh] = useState(0)
  const [orderUpdateCount, setOrderUpdateCount] = useState(0)
  const [updatedOrderIds, setUpdatedOrderIds] = useState<string[]>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [chatUnreadCount, setChatUnreadCount] = useState(0)
  const [navTab, setNavTab] = useState<NavTab>('home')

  const cartRef = useRef<HTMLElement | null>(null)
  const signedIn = Boolean(consumerSession.token && consumerSession.consumer)
  const consumerId = consumerSession.consumer?.id ?? null
  const consumerToken = consumerSession.token

  function applyConsumerSession(token: string, consumer: ConsumerProfile) {
    const next = { token, consumer }
    setConsumerSession(next)
    saveConsumerSession(next)
  }

  function signOutConsumer() {
    clearConsumerSession()
    setConsumerSession({ token: null, consumer: null })
    setCart([])
    setOrderUpdateCount(0)
    setUpdatedOrderIds([])
    setChatUnreadCount(0)
    setChatOpen(false)
  }

  function requireSignIn(intent: 'none' | 'checkout' | 'chat' = 'none') {
    setAuthIntent(intent)
    setAuthMode('login')
    setAuthOpen(true)
  }

  function getQty(productId: string) {
    return qtyByProduct[productId] ?? 1
  }

  function setQty(productId: string, qty: number) {
    setQtyByProduct((prev) => ({
      ...prev,
      [productId]: Math.max(1, Math.min(99, qty)),
    }))
  }

  function addToCart(product: api.PublicProduct) {
    const qty = getQty(product.id)
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, qty: Math.min(99, l.qty + qty) }
            : l,
        )
      }
      return [...prev, { product, qty }]
    })
    setQty(product.id, 1)
  }

  function updateCartQty(productId: string, qty: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.product.id === productId
            ? { ...l, qty: Math.max(1, Math.min(99, qty)) }
            : l,
        )
        .filter((l) => l.qty > 0),
    )
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((l) => l.product.id !== productId))
  }

  function startCheckout() {
    if (cart.length === 0) return
    if (!signedIn) {
      requireSignIn('checkout')
      return
    }
    setCheckoutOpen(true)
  }

  useEffect(() => {
    let cancelled = false
    setStationsState('loading')
    setError(null)
    void api
      .listPublicStations(apiBaseUrl)
      .then((res) => {
        if (cancelled) return
        setStations(res.stations)
        setStationsState('ready')
        const preferred = browseRef.current.stationId
        const match = preferred
          ? res.stations.find((s) => s.id === preferred || s.slug === preferred)
          : undefined
        const nextId = match?.id ?? res.stations[0]?.id ?? ''
        setStationId(nextId)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setStationsState('error')
        setError(err instanceof Error ? err.message : 'Failed to load stations')
      })
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  useEffect(() => {
    if (!stationId) {
      setProducts([])
      setPaymentMethods([])
      setProductsState('ready')
      return
    }

    const stationChanged =
      prevStationRef.current !== null && prevStationRef.current !== stationId
    prevStationRef.current = stationId

    let cancelled = false
    setProductsState('loading')
    setError(null)

    if (stationChanged) {
      cartReadyRef.current = false
      setCart([])
      setQtyByProduct({})
      const cleared = { stationId, cart: [] }
      browseRef.current = cleared
      saveLandingBrowseState(cleared)
    }

    void api
      .getPublicStationProducts(apiBaseUrl, stationId)
      .then((res) => {
        if (cancelled) return
        setProducts(res.products)
        setPaymentMethods(res.paymentMethods ?? [])
        setCurrency(res.currency || '₱')
        setStations((prev) =>
          prev.map((s) => (s.id === res.station.id ? { ...s, ...res.station } : s)),
        )
        setProductsState('ready')

        // Restore or refresh cart against live catalog (prices / availability).
        const saved =
          !stationChanged && browseRef.current.stationId === stationId
            ? browseRef.current.cart
            : []
        setCart((prev) => {
          const source =
            prev.length > 0
              ? cartToLandingItems(prev)
              : saved
          return reconcileCartLines(res.products, source)
        })
        cartReadyRef.current = true
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setProducts([])
        setPaymentMethods([])
        setProductsState('error')
        setError(err instanceof Error ? err.message : 'Failed to load products')
      })
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, stationId])

  useEffect(() => {
    if (!stationId || !cartReadyRef.current) return
    const next = {
      stationId,
      cart: cartToLandingItems(cart),
    }
    browseRef.current = next
    saveLandingBrowseState(next)
  }, [stationId, cart])

  useEffect(() => {
    setChatError(null)
  }, [stationId])

  useEffect(() => {
    const token = consumerSession.token
    if (!token) return
    let cancelled = false
    void api
      .getConsumerMe(apiBaseUrl, token)
      .then((res) => {
        if (cancelled) return
        const next = { token, consumer: res.consumer }
        setConsumerSession(next)
        saveConsumerSession(next)
      })
      .catch(() => {
        if (cancelled) return
        clearConsumerSession()
        setConsumerSession({ token: null, consumer: null })
      })
    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, consumerSession.token])

  useEffect(() => {
    if (!signedIn || !consumerToken || !consumerId) {
      setOrderUpdateCount(0)
      return
    }

    let cancelled = false

    function applyOrders(orders: api.ConsumerOrder[]) {
      if (cancelled || !consumerId) return
      const current = orderStatusSnapshot(orders)
      if (ordersModalOpen) {
        saveOrderStatusSeen(consumerId, current)
        setOrderUpdateCount(0)
        return
      }
      const seen = loadOrderStatusSeen(consumerId)
      if (!seen) {
        saveOrderStatusSeen(consumerId, current)
        setOrderUpdateCount(0)
        setUpdatedOrderIds([])
        return
      }
      const changed = changedOrderIds(current, seen)
      setOrderUpdateCount(changed.length)
      setUpdatedOrderIds(changed)
    }

    async function poll() {
      if (!consumerToken) return
      try {
        const res = await api.listConsumerOrders(apiBaseUrl, consumerToken)
        applyOrders(res.orders)
      } catch (err: unknown) {
        if (cancelled) return
        // Keep previous badge across transient network errors while polling.
        void err
      }
    }

    void poll()
    const intervalId = window.setInterval(() => {
      void poll()
    }, 30_000)
    const onFocus = () => {
      void poll()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [
    apiBaseUrl,
    signedIn,
    consumerToken,
    consumerId,
    ordersModalOpen,
    ordersRefresh,
  ])

  useEffect(() => {
    if (!signedIn || !consumerToken) {
      setChatUnreadCount(0)
      return
    }
    // While chat is open, messages are marked read — keep badge cleared.
    if (chatOpen) {
      setChatUnreadCount(0)
      return
    }

    let cancelled = false
    async function pollUnread() {
      if (!consumerToken) return
      try {
        const res = await api.getConsumerChatUnreadCount(apiBaseUrl, consumerToken)
        if (!cancelled) setChatUnreadCount(res.unreadCount)
      } catch (err: unknown) {
        if (cancelled) return
        void err
      }
    }

    void pollUnread()
    const intervalId = window.setInterval(() => {
      void pollUnread()
    }, 15_000)
    const onFocus = () => {
      void pollUnread()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [apiBaseUrl, signedIn, consumerToken, chatOpen])

  const selected = stations.find((s) => s.id === stationId) ?? null
  const hoursLabel = formatOpenHoursLabel(selected?.openTime, selected?.closeTime)
  const openNow = isOpenAt(selected?.openTime, selected?.closeTime, nowTimeInManila())
  const cartSubtotal = useMemo(
    () => cart.reduce((sum, l) => sum + l.product.price * l.qty, 0),
    [cart],
  )
  const phoneHref = selected?.phone?.trim()
    ? `tel:${selected.phone.replace(/\s+/g, '')}`
    : null

  function goChatStation() {
    if (!stationId) {
      setChatError('Select a station first')
      return
    }
    setChatError(null)
    if (!signedIn || !consumerToken) {
      requireSignIn('chat')
      return
    }
    setChatOpen(true)
  }

  function goHome() {
    setNavTab('home')
    setProfileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function goOrders() {
    setNavTab('orders')
    setProfileMenuOpen(false)
    if (!signedIn) {
      requireSignIn()
      return
    }
    setOrderUpdateCount(0)
    setOrdersModalOpen(true)
  }

  function goAddresses() {
    setNavTab('addresses')
    setProfileMenuOpen(false)
    if (!signedIn) {
      requireSignIn()
      return
    }
    setAddressesOpen(true)
  }

  function goProfile() {
    setNavTab('profile')
    if (!signedIn) {
      requireSignIn()
      return
    }
    setProfileMenuOpen((v) => !v)
  }

  function openMyProfile() {
    setProfileMenuOpen(false)
    setNavTab('profile')
    setProfileOpen(true)
  }

  function openChangePassword() {
    setProfileMenuOpen(false)
    setNavTab('profile')
    setChangePasswordOpen(true)
  }

  return (
    <div className="lp">
      <header className="lp-nav">
        <a className="lp-brand" href="#home" onClick={(e) => { e.preventDefault(); goHome() }}>
          <span className="lp-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3c-3.5 5-6 8.2-6 11a6 6 0 0 0 12 0c0-2.8-2.5-6-6-11z"
              />
            </svg>
          </span>
          <span className="lp-brand-name">
            Aqua<span>Flow</span>
          </span>
        </a>
        <nav className="lp-nav-links" aria-label="Customer">
          <button
            type="button"
            className={`lp-nav-link${navTab === 'home' ? ' active' : ''}`}
            onClick={goHome}
          >
            Home
          </button>
          <button
            type="button"
            className={`lp-nav-link${navTab === 'orders' ? ' active' : ''}`}
            onClick={goOrders}
            aria-label={
              orderUpdateCount > 0
                ? `Orders, ${orderUpdateCount} status update${orderUpdateCount === 1 ? '' : 's'}`
                : 'Orders'
            }
          >
            Orders
            {orderUpdateCount > 0 ? (
              <span className="lp-nav-badge" aria-hidden="true">
                {orderUpdateCount > 9 ? '9+' : orderUpdateCount}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            className={`lp-nav-link${navTab === 'addresses' ? ' active' : ''}`}
            onClick={goAddresses}
          >
            Addresses
          </button>
          {signedIn ? (
            <div className="lp-profile">
              <button
                type="button"
                className={`lp-nav-link lp-nav-user${navTab === 'profile' || profileMenuOpen ? ' active' : ''}`}
                onClick={goProfile}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="3.5" />
                  <path strokeLinecap="round" d="M5.5 19c1.5-3.2 3.8-4.8 6.5-4.8S17 15.8 18.5 19" />
                </svg>
                {consumerSession.consumer!.name.split(' ')[0]}
              </button>
              {profileMenuOpen ? (
                <>
                  <button
                    type="button"
                    className="lp-profile-backdrop"
                    aria-label="Close profile menu"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="lp-profile-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openMyProfile}
                    >
                      My profile
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={openChangePassword}
                    >
                      Change password
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        if (confirm('Sign out of your AquaFlow account?')) {
                          signOutConsumer()
                          setNavTab('home')
                        }
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <>
              <button
                type="button"
                className="lp-nav-link active"
                onClick={() => requireSignIn()}
              >
                Sign in
              </button>
              <button
                type="button"
                className="lp-nav-link"
                onClick={() => {
                  setAuthIntent('none')
                  setAuthMode('register')
                  setAuthOpen(true)
                }}
              >
                Register
              </button>
            </>
          )}
        </nav>
      </header>

      <section className="lp-hero" id="home">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy">
            <h2>Order refill from your local station</h2>
            <p>Choose a station, view products and track your past orders.</p>
          </div>
          <div className="lp-station-field">
            <label htmlFor="landing_station">Station</label>
            <select
              id="landing_station"
              value={stationId}
              disabled={stationsState !== 'ready' || stations.length === 0}
              onChange={(e) => setStationId(e.target.value)}
            >
              {stationsState === 'loading' ? (
                <option value="">Loading stations…</option>
              ) : stations.length === 0 ? (
                <option value="">No stations available</option>
              ) : (
                stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </section>

      <main className="lp-body">
        {error ? <p className="lp-error">{error}</p> : null}

        <div className="lp-grid">
          <section className="lp-card" aria-labelledby="lp_products_title">
            <div className="lp-card-h">
              <h3 id="lp_products_title">Popular Products</h3>
            </div>
            <div className="lp-card-b">
              {productsState === 'loading' ? (
                <p className="lp-empty">Loading products…</p>
              ) : null}
              {productsState === 'ready' && products.length === 0 ? (
                <p className="lp-empty">
                  This station has not published products and pricing yet.
                </p>
              ) : null}
              {products.map((p) => {
                const qty = getQty(p.id)
                return (
                  <div className="lp-product" key={p.id}>
                    <ProductThumb name={p.name} />
                    <div>
                      <p className="lp-product-name">{p.name}</p>
                      <div className="lp-product-price">
                        {formatMoney(p.price, currency)}
                      </div>
                    </div>
                    <div className="lp-product-actions">
                      <div className="lp-qty">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => setQty(p.id, qty - 1)}
                        >
                          −
                        </button>
                        <span>{qty}</span>
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => setQty(p.id, qty + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        className="lp-btn lp-btn-sm"
                        onClick={() => addToCart(p)}
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <div className="lp-mid">
            <section className="lp-card" aria-labelledby="lp_station_title">
              <div className="lp-card-h">
                <h3 id="lp_station_title">Station Info</h3>
              </div>
              <div className="lp-card-b">
                <div className="lp-map-wrap">
                  <StationMapView
                    key={stationId || 'none'}
                    lat={selected?.lat}
                    lng={selected?.lng}
                    stationName={selected?.name}
                    address={selected?.address}
                    compact
                  />
                </div>
                <div className="lp-info-row">
                  <span className="lp-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.5 4.5c.4-.4 1-.5 1.5-.3l2.2.9c.6.2 1 .8.9 1.4l-.4 2.2a1.2 1.2 0 0 1-.7.9l-1.3.5a11 11 0 0 0 5.2 5.2l.5-1.3c.2-.4.5-.6.9-.7l2.2-.4c.6-.1 1.2.3 1.4.9l.9 2.2c.2.5.1 1.1-.3 1.5l-1.2 1.2c-.5.5-1.2.7-1.9.5A15.5 15.5 0 0 1 5 8.6c-.2-.7 0-1.4.5-1.9l1-1.2z"
                      />
                    </svg>
                  </span>
                  <span>
                    {selected?.phone?.trim()
                      ? selected.phone
                      : 'No Contact Number Available'}
                  </span>
                </div>
                <div className="lp-info-row">
                  <span className="lp-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"
                      />
                      <circle cx="12" cy="10" r="2.5" />
                    </svg>
                  </span>
                  <span>
                    {selected?.address?.trim()
                      ? selected.address
                      : 'No address listed'}
                  </span>
                </div>
                <div className="lp-info-row">
                  <span className="lp-info-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="8" />
                      <path strokeLinecap="round" d="M12 8v4l3 2" />
                    </svg>
                  </span>
                  <span className="lp-hours">
                    <span>
                      {hoursLabel === 'Hours not set'
                        ? 'Open hours not set'
                        : `Open: ${hoursLabel}`}
                    </span>
                    {openNow === true ? (
                      <span className="lp-hours-badge lp-hours-open">Open now</span>
                    ) : openNow === false ? (
                      <span className="lp-hours-badge lp-hours-closed">Closed</span>
                    ) : null}
                  </span>
                </div>
                <div className="lp-station-actions">
                  <button
                    type="button"
                    className="lp-btn lp-btn-sm lp-chat-btn"
                    disabled={!stationId}
                    onClick={goChatStation}
                    aria-label={
                      chatUnreadCount > 0
                        ? `Chat Station, ${chatUnreadCount} unread message${chatUnreadCount === 1 ? '' : 's'}`
                        : 'Chat Station'
                    }
                  >
                    Chat Station
                    {chatUnreadCount > 0 ? (
                      <span className="lp-nav-badge" aria-hidden="true">
                        {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                      </span>
                    ) : null}
                  </button>
                  {phoneHref ? (
                    <a className="lp-btn lp-btn-sm" href={phoneHref}>
                      Call Station
                    </a>
                  ) : (
                    <button type="button" className="lp-btn lp-btn-sm" disabled>
                      Call Station
                    </button>
                  )}
                </div>
                {chatError ? (
                  <p style={{ margin: '10px 0 0', fontSize: 12.5, color: '#b42318' }}>
                    {chatError}
                  </p>
                ) : null}
              </div>
            </section>
          </div>

          <aside className="lp-card lp-cart-col" ref={cartRef} aria-labelledby="lp_cart_title">
            <div className="lp-card-h">
              <h3 id="lp_cart_title">Your Cart</h3>
            </div>
            <div className="lp-card-b" style={{ paddingTop: 14 }}>
              {cart.length === 0 ? (
                <p className="lp-empty">Your cart is empty. Add products to get started.</p>
              ) : (
                cart.map((line) => (
                  <div className="lp-cart-line" key={line.product.id}>
                    <div>
                      <b>
                        {line.product.name} x {line.qty}
                      </b>
                      <div className="lp-cart-line-actions" style={{ marginTop: 6 }}>
                        <div className="lp-qty">
                          <button
                            type="button"
                            aria-label="Decrease cart quantity"
                            onClick={() =>
                              updateCartQty(line.product.id, line.qty - 1)
                            }
                          >
                            −
                          </button>
                          <span>{line.qty}</span>
                          <button
                            type="button"
                            aria-label="Increase cart quantity"
                            onClick={() =>
                              updateCartQty(line.product.id, line.qty + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="lp-cart-remove"
                          onClick={() => removeFromCart(line.product.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <b>{formatMoney(line.product.price * line.qty, currency)}</b>
                  </div>
                ))
              )}
              <div className="lp-cart-sub">
                <span>Subtotal</span>
                <span>{formatMoney(cartSubtotal, currency)}</span>
              </div>
              <div className="lp-cart-actions">
                <button
                  type="button"
                  className="lp-btn lp-btn-block"
                  disabled={cart.length === 0}
                  onClick={() =>
                    cartRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'nearest',
                    })
                  }
                >
                  View Cart
                </button>
                <button
                  type="button"
                  className="lp-btn lp-btn-block"
                  disabled={cart.length === 0}
                  onClick={startCheckout}
                >
                  Checkout
                </button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <footer className="lp-footer">
        Station owners: <Link to="/login">Sign in to admin</Link>
      </footer>

      <ConsumerAuthModal
        open={authOpen}
        apiBaseUrl={apiBaseUrl}
        initialMode={authMode}
        onClose={() => {
          setAuthOpen(false)
          setAuthIntent('none')
        }}
        onSuccess={(token, consumer) => {
          applyConsumerSession(token, consumer)
          setAuthOpen(false)
          if (authIntent === 'checkout') {
            setCheckoutOpen(true)
          } else if (authIntent === 'chat' && stationId) {
            setChatOpen(true)
          }
          setAuthIntent('none')
        }}
      />

      {signedIn && consumerSession.consumer && consumerSession.token ? (
        <ConsumerProfileModal
          open={profileOpen}
          apiBaseUrl={apiBaseUrl}
          token={consumerSession.token}
          consumer={consumerSession.consumer}
          onClose={() => {
            setProfileOpen(false)
            setNavTab('home')
          }}
          onSaved={(consumer) => {
            applyConsumerSession(consumerSession.token!, consumer)
          }}
        />
      ) : null}

      {signedIn && consumerSession.token ? (
        <ConsumerChangePasswordModal
          open={changePasswordOpen}
          apiBaseUrl={apiBaseUrl}
          token={consumerSession.token}
          onClose={() => {
            setChangePasswordOpen(false)
            setNavTab('home')
          }}
        />
      ) : null}

      {signedIn && consumerSession.token ? (
        <ConsumerAddressesModal
          open={addressesOpen}
          apiBaseUrl={apiBaseUrl}
          token={consumerSession.token}
          onClose={() => {
            setAddressesOpen(false)
            if (!checkoutOpen) setNavTab('home')
          }}
          onChanged={() => setAddressesTick((n) => n + 1)}
        />
      ) : null}

      {signedIn && consumerSession.token ? (
        <ModalOrders
          open={ordersModalOpen}
          onClose={() => {
            setOrdersModalOpen(false)
            setUpdatedOrderIds([])
            setNavTab('home')
          }}
          apiBaseUrl={apiBaseUrl}
          token={consumerSession.token}
          refreshKey={ordersRefresh}
          updatedOrderIds={updatedOrderIds}
          onRefresh={() => setOrdersRefresh((n) => n + 1)}
        />
      ) : null}

      {signedIn && consumerSession.token && chatOpen && stationId ? (
        <ConsumerChatModal
          open
          apiBaseUrl={apiBaseUrl}
          token={consumerSession.token}
          stationId={stationId}
          stationName={selected?.name ?? 'Station'}
          onClose={() => {
            setChatOpen(false)
            if (consumerToken) {
              void api
                .getConsumerChatUnreadCount(apiBaseUrl, consumerToken)
                .then((res) => setChatUnreadCount(res.unreadCount))
                .catch(() => {
                  setChatUnreadCount(0)
                })
            }
          }}
        />
      ) : null}

      <CartCheckoutModal
        open={checkoutOpen && signedIn}
        apiBaseUrl={apiBaseUrl}
        stationId={stationId}
        stationName={selected?.name ?? 'Station'}
        currency={currency}
        paymentMethods={paymentMethods}
        lines={cart}
        consumerToken={consumerSession.token ?? ''}
        prefillName={consumerSession.consumer?.name ?? ''}
        prefillPhone={consumerSession.consumer?.phone ?? ''}
        addressesVersion={addressesTick}
        onClose={() => {
          if (addressesOpen) return
          setCheckoutOpen(false)
        }}
        onPlaced={() => setOrdersRefresh((n) => n + 1)}
        onManageAddresses={() => setAddressesOpen(true)}
        onClearCart={() => setCart([])}
      />
    </div>
  )
}

function ModalOrders({
  open,
  onClose,
  apiBaseUrl,
  token,
  refreshKey,
  updatedOrderIds,
  onRefresh,
}: {
  open: boolean
  onClose: () => void
  apiBaseUrl: string
  token: string
  refreshKey: number
  updatedOrderIds: string[]
  onRefresh: () => void
}) {
  return (
    <Modal
      title="My orders"
      open={open}
      onClose={onClose}
      cancelLabel="Close"
      elevated
      modalClassName="modal-wide"
    >
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button type="button" className="lp-btn lp-btn-ghost lp-btn-sm" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <ConsumerOrdersPanel
        apiBaseUrl={apiBaseUrl}
        token={token}
        refreshKey={refreshKey}
        updatedOrderIds={updatedOrderIds}
      />
    </Modal>
  )
}
