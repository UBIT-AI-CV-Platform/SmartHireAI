'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Field = { key: string; label: string; placeholder?: string; type?: 'text' | 'textarea'; full?: boolean }
export type CardRow = { id: number; [key: string]: unknown }

type ProfileTable = 'skills' | 'languages' | 'education' | 'certifications' | 'courses' | 'awards' | 'projects' | 'custom_sections'

interface ProfileCardSectionProps {
  title: string
  icon: string
  addLabel: string
  table: ProfileTable
  profileId: string | null
  fields: Field[]
  requiredKeys: string[]
  items: CardRow[]
  setItems: (rows: CardRow[]) => void
  renderItem: (item: CardRow) => React.ReactNode
  emptyTitle: string
  emptyHint: string
}

export default function ProfileCardSection({
  title, icon, addLabel, table, profileId, fields, requiredKeys, items, setItems, renderItem, emptyTitle, emptyHint,
}: ProfileCardSectionProps) {
  const supabase = createClient()
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, ''])) as Record<string, string>

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [data, setData] = useState<Record<string, string>>(blank())
  const [busy, setBusy] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const openAdd = () => { setEditingId(null); setData(blank()); setShowForm(true) }
  const openEdit = (item: CardRow) => {
    setEditingId(item.id)
    setData(Object.fromEntries(fields.map((f) => [f.key, (item[f.key] as string) ?? ''])))
    setShowForm(true)
  }
  const close = () => { setShowForm(false); setEditingId(null); setData(blank()) }

  const canSave = requiredKeys.every((k) => (data[k] || '').trim().length > 0)

  const save = async () => {
    if (!canSave || !profileId) return
    setBusy(true); setSaveError(null)
    const payload: Record<string, unknown> = {}
    fields.forEach((f) => { payload[f.key] = (data[f.key] || '').trim() || null })

    if (editingId) {
      const { data: updated, error } = await supabase.from(table).update(payload as never).eq('id', editingId).select().single()
      if (error) { setBusy(false); setSaveError('Could not save. Please try again.'); return }
      if (updated) setItems(items.map((it) => (it.id === editingId ? (updated as CardRow) : it)))
    } else {
      const { data: inserted, error } = await supabase.from(table).insert({ profile_id: profileId, ...payload } as never).select().single()
      if (error) { setBusy(false); setSaveError('Could not save. Please try again.'); return }
      if (inserted) setItems([...items, inserted as CardRow])
    }
    setBusy(false)
    close()
  }

  const remove = async (id: number) => {
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) { console.error('Delete failed:', error.message); return }
    setItems(items.filter((it) => it.id !== id))
  }

  return (
    <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary">{icon}</span>
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        </div>
        <button onClick={openAdd} className="text-primary font-bold text-xs md:text-sm flex items-center gap-1 hover:bg-primary/5 px-2 md:px-3 py-1 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          <span>{addLabel}</span>
        </button>
      </div>

      <div className="flex flex-col space-y-4">
        {items.map((item) => (
          <div key={item.id} className="p-4 bg-surface-container border border-outline-variant/30 rounded-xl flex justify-between items-start gap-3 group hover:bg-surface-container-high transition-colors">
            <div className="flex-1 min-w-0">{renderItem(item)}</div>
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
              <button onClick={() => openEdit(item)} className="text-on-surface-variant hover:text-primary p-1.5 rounded-lg hover:bg-primary/5" title="Edit">
                <span className="material-symbols-outlined text-base md:text-lg">edit</span>
              </button>
              <button onClick={() => remove(item.id)} className="text-on-surface-variant hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50" title="Delete">
                <span className="material-symbols-outlined text-base md:text-lg">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="flex flex-col gap-6 mt-4 p-4 md:p-6 bg-surface-container-low rounded-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.full || f.type === 'textarea' ? 'col-span-full' : ''}>
                <label className="text-[10px] font-bold text-on-surface-variant mb-1 block uppercase">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea value={data[f.key]} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} rows={3} placeholder={f.placeholder} className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all outline-none resize-none" />
                ) : (
                  <input value={data[f.key]} onChange={(e) => setData({ ...data, [f.key]: e.target.value })} placeholder={f.placeholder} type="text" className="w-full bg-white border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all outline-none" />
                )}
              </div>
            ))}
          </div>
          {saveError && <p className="text-xs font-semibold text-red-600">{saveError}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={close} className="px-4 md:px-6 py-2 border border-outline-variant/30 bg-surface-container-low text-on-surface-variant text-xs md:text-sm font-bold rounded-xl hover:bg-surface-variant transition-colors">Cancel</button>
            <button onClick={save} disabled={!canSave || busy} className="px-4 md:px-6 py-2 bg-primary text-white text-xs md:text-sm font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity disabled:opacity-50">
              {busy ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 && !showForm && (
        <div className="flex flex-col items-center text-center py-6">
          <p className="text-on-surface-variant font-medium text-sm">{emptyTitle}</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">{emptyHint}</p>
        </div>
      )}
    </div>
  )
}
