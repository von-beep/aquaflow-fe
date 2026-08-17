import { useState } from 'react'
import { ActionIcon } from '@/components/ActionIcon'
import { Modal } from '@/components/Modal'
import { uid } from '@/domain/dates'
import { formatMoney } from '@/domain/money'
import type { Product } from '@/domain/types'
import { useAquaFlow } from '@/store/AquaFlowContext'

export function InventoryPage() {
  const { state, flash, session, removeProduct } = useAquaFlow()
  const [refillOpen, setRefillOpen] = useState(false)
  const [adjOpen, setAdjOpen] = useState(false)
  const [prodEdit, setProdEdit] = useState<Product | 'new' | null>(null)
  const currency = state.settings.currency || '₱'
  const inv = state.inventory
  const total = inv.full + inv.empty
  const out = state.customers.reduce((a, c) => a + (Number(c.gallonsOut) || 0), 0)

  return (
    <>
      <div className="pagehead">
        <div>
          <h2>Gallon Inventory</h2>
          <div className="sub">Station stock + gallons na hawak ng customers</div>
        </div>
        <div className="headbtns">
          <button type="button" className="btn btn-blue" onClick={() => setRefillOpen(true)}>
            Refill Empties → Full
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setAdjOpen(true)}>
            <ActionIcon name="edit" /> Adjust Counts
          </button>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi kb">
          <div className="lbl">Total Gallons (Station)</div>
          <div className="val">{total.toLocaleString()}</div>
          <div className="note">
            {inv.full} Full · {inv.empty} Empty
          </div>
        </div>
        <div className="kpi kg">
          <div className="lbl">Full / Ready to Deliver</div>
          <div className="val">{inv.full}</div>
        </div>
        <div className="kpi ko">
          <div className="lbl">Empty / For Refill</div>
          <div className="val">{inv.empty}</div>
        </div>
        <div className="kpi kp">
          <div className="lbl">Gallons w/ Customers</div>
          <div className="val">{out}</div>
          <div className="note">
            across {state.customers.filter((c) => c.gallonsOut > 0).length} customers
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 15 }}>
        <div className="card-h">
          <h3>Stock Split</h3>
        </div>
        <div className="card-b">
          <div className="legend">
            <span>
              <i style={{ background: 'var(--blue)' }} />
              Full ({total ? Math.round((inv.full / total) * 100) : 0}%)
            </span>
            <span>
              <i style={{ background: 'var(--orange)' }} />
              Empty ({total ? Math.round((inv.empty / total) * 100) : 0}%)
            </span>
          </div>
          <div className="gallonbar">
            <div
              className="gfull"
              style={{ width: `${total ? (inv.full / total) * 100 : 0}%` }}
            />
            <div
              className="gempty"
              style={{ width: `${total ? (inv.empty / total) * 100 : 0}%` }}
            />
          </div>
          {inv.full < 50 ? (
            <div style={{ marginTop: 12 }}>
              <span className="chip c-red">LOW FULL STOCK — mag-refill na!</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid2b">
        <div className="card">
          <div className="card-h">
            <h3>Products &amp; Pricing</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setProdEdit('new')}>
              <ActionIcon name="plus" /> Add
            </button>
          </div>
          <div className="card-b" style={{ padding: '6px 18px 10px' }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="num">Price</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.products.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty">
                        <b>No products yet</b>
                        {session.token
                          ? 'Use Add, or wait a moment if products are loading from the server.'
                          : 'Use Add to create products, or sign in to load station products.'}
                      </div>
                    </td>
                  </tr>
                ) : (
                  state.products.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {formatMoney(p.price, currency)}
                      </td>
                      <td>
                        <div className="rowact">
                          <button
                            type="button"
                            className="iconbtn"
                            onClick={() => setProdEdit(p)}
                          >
                            <ActionIcon name="edit" />
                          </button>
                          <button
                            type="button"
                            className="iconbtn del"
                            onClick={() => {
                              if (!confirm('Delete product?')) return
                              void removeProduct(p.id)
                            }}
                          >
                            <ActionIcon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Gallons per Customer</h3>
          </div>
          <div
            className="card-b"
            style={{ padding: '6px 18px 10px', maxHeight: 320, overflowY: 'auto' }}
          >
            <table className="tbl">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th className="num">On Hand</th>
                </tr>
              </thead>
              <tbody>
                {state.customers.length === 0 ? (
                  <tr>
                    <td colSpan={2}>
                      <div className="empty">
                        <b>No customers</b>
                      </div>
                    </td>
                  </tr>
                ) : (
                  [...state.customers]
                    .sort((a, b) => (b.gallonsOut || 0) - (a.gallonsOut || 0))
                    .map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td className="num" style={{ fontWeight: 700 }}>
                          {c.gallonsOut || 0}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RefillModal open={refillOpen} onClose={() => setRefillOpen(false)} flash={flash} />
      <AdjustModal open={adjOpen} onClose={() => setAdjOpen(false)} />
      <ProductModal
        editing={prodEdit}
        onClose={() => setProdEdit(null)}
        flash={flash}
      />
    </>
  )
}

function RefillModal({
  open,
  onClose,
  flash,
}: {
  open: boolean
  onClose: () => void
  flash: (m: string) => void
}) {
  const { state, refillInventory } = useAquaFlow()
  const [qty, setQty] = useState('')
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setQty('')
  }

  return (
    <Modal
      title="Refill Empties → Full"
      open={open}
      onClose={onClose}
      onSave={async () => {
        const q = Number(qty) || 0
        if (q <= 0) {
          flash('Ilan?')
          return false
        }
        if (q > state.inventory.empty) {
          flash(`Sobra sa empty stock (${state.inventory.empty})`)
          return false
        }
        await refillInventory(q)
        return true
      }}
    >
      <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 13 }}>
        Empty gallons available: <b className="mono">{state.inventory.empty}</b>
      </div>
      <div className="field">
        <label htmlFor="f_q">Ilang gallons ang nirefill?</label>
        <input
          id="f_q"
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          autoFocus
        />
      </div>
    </Modal>
  )
}

function AdjustModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, setInventoryCounts } = useAquaFlow()
  const [full, setFull] = useState(String(state.inventory.full))
  const [empty, setEmpty] = useState(String(state.inventory.empty))
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setFull(String(state.inventory.full))
      setEmpty(String(state.inventory.empty))
    }
  }

  return (
    <Modal
      title="Adjust Inventory Counts"
      open={open}
      onClose={onClose}
      onSave={async () => {
        await setInventoryCounts(Number(full) || 0, Number(empty) || 0)
        return true
      }}
    >
      <div className="frow">
        <div className="field">
          <label htmlFor="f_f">Full Gallons</label>
          <input
            id="f_f"
            type="number"
            inputMode="numeric"
            value={full}
            onChange={(e) => setFull(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="f_e">Empty Gallons</label>
          <input
            id="f_e"
            type="number"
            inputMode="numeric"
            value={empty}
            onChange={(e) => setEmpty(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}

function ProductModal({
  editing,
  onClose,
  flash,
}: {
  editing: Product | 'new' | null
  onClose: () => void
  flash: (m: string) => void
}) {
  const { state, saveProduct } = useAquaFlow()
  const currency = state.settings.currency || '₱'
  const blank = { name: '', price: 0 }
  const source = editing && editing !== 'new' ? editing : blank
  const [name, setName] = useState(source.name)
  const [price, setPrice] = useState(String(source.price || ''))
  const key = editing === 'new' ? 'new' : editing?.id ?? ''
  const [synced, setSynced] = useState(key)
  if (key !== synced && editing) {
    setSynced(key)
    setName(source.name)
    setPrice(String(source.price || ''))
  }

  return (
    <Modal
      title={editing && editing !== 'new' ? 'Edit Product' : 'Add Product'}
      open={editing !== null}
      onClose={onClose}
      onSave={async () => {
        if (!name.trim()) {
          flash('Product name muna')
          return false
        }
        const productId =
          editing && editing !== 'new' ? editing.id : uid()
        await saveProduct({
          id: productId,
          name: name.trim(),
          price: Number(price) || 0,
        })
        return true
      }}
    >
      <div className="field">
        <label htmlFor="f_n">Product Name</label>
        <input
          id="f_n"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Slim Gallon Refill (5gal)"
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="f_p">Price {currency}</label>
        <input
          id="f_p"
          type="number"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </div>
    </Modal>
  )
}
