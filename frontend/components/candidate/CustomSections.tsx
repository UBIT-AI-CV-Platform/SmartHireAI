'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Item = { title: string; description?: string }
type Sec = { id: number; heading: string; items: Item[] }

export default function CustomSections({ profileId }: { profileId: string | null }) {
  const supabase = createClient()
  const [sections, setSections] = useState<Sec[]>([])

  // add-section form
  const [showAdd, setShowAdd] = useState(false)
  const [heading, setHeading] = useState('')

  // add-item form (per section)
  const [openItemFor, setOpenItemFor] = useState<number | null>(null)
  const [itemTitle, setItemTitle] = useState('')
  const [itemDesc, setItemDesc] = useState('')

  useEffect(() => {
    if (!profileId) return
    supabase
      .from('custom_sections')
      .select('*')
      .eq('profile_id', profileId)
      .order('id')
      .then(({ data }) => {
        setSections((data ?? []).map((d) => ({ id: d.id as number, heading: d.heading as string, items: ((d.items as Item[]) ?? []) })))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  const addSection = async () => {
    if (!heading.trim() || !profileId) return
    const { data } = await supabase
      .from('custom_sections')
      .insert({ profile_id: profileId, heading: heading.trim(), items: [] })
      .select()
      .single()
    if (data) setSections([...sections, { id: data.id as number, heading: data.heading as string, items: [] }])
    setHeading('')
    setShowAdd(false)
  }

  const deleteSection = async (id: number) => {
    const { error } = await supabase.from('custom_sections').delete().eq('id', id)
    if (error) { console.error('deleteSection failed:', error.message); return }
    setSections(sections.filter((s) => s.id !== id))
  }

  const openAddItem = (id: number) => {
    setOpenItemFor(id)
    setItemTitle('')
    setItemDesc('')
  }

  const addItem = async (sec: Sec) => {
    if (!itemTitle.trim()) return
    const newItems = [...sec.items, { title: itemTitle.trim(), description: itemDesc.trim() || undefined }]
    const { error } = await supabase.from('custom_sections').update({ items: newItems }).eq('id', sec.id)
    if (error) { console.error('addItem failed:', error.message); return }
    setSections(sections.map((s) => (s.id === sec.id ? { ...s, items: newItems } : s)))
    setItemTitle('')
    setItemDesc('')
    setOpenItemFor(null)
  }

  const removeItem = async (sec: Sec, idx: number) => {
    const newItems = sec.items.filter((_, i) => i !== idx)
    const { error } = await supabase.from('custom_sections').update({ items: newItems }).eq('id', sec.id)
    if (error) { console.error('removeItem failed:', error.message); return }
    setSections(sections.map((s) => (s.id === sec.id ? { ...s, items: newItems } : s)))
  }

  const inputCls = 'w-full bg-white dark:bg-[#2c2c2e] border border-outline-variant/30 rounded-xl px-4 py-2.5 text-sm text-on-surface focus:ring-2 focus:ring-primary transition-all outline-none'

  return (
    <div className="w-full bg-surface-container-lowest p-6 md:p-8 rounded-[1.5rem] shadow-[0_12px_40px_-12px_rgba(25,28,30,0.08)]">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <span className="material-symbols-outlined text-primary">dashboard_customize</span>
          <h2 className="text-lg md:text-xl font-bold">Custom Sections</h2>
        </div>
        <button onClick={() => { setShowAdd(true); setHeading('') }} className="text-primary font-bold text-xs md:text-sm flex items-center gap-1 hover:bg-primary/5 px-2 md:px-3 py-1 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-sm">add</span>
          <span>Add Section</span>
        </button>
      </div>

      {/* Existing sections */}
      <div className="space-y-4">
        {sections.map((sec) => (
          <div key={sec.id} className="p-4 bg-surface-container border border-outline-variant/30 rounded-xl">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-on-surface">{sec.heading}</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => openAddItem(sec.id)} className="text-primary text-xs font-bold flex items-center gap-0.5 hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-sm">add</span>Item
                </button>
                <button onClick={() => deleteSection(sec.id)} className="text-on-surface-variant hover:text-red-500 dark:hover:text-red-300 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/15" title="Delete section">
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {sec.items.map((it, idx) => (
                <div key={idx} className="flex items-start justify-between gap-3 bg-surface-container-lowest rounded-lg px-3 py-2 group">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface">{it.title}</p>
                    {it.description && <p className="text-xs text-on-surface-variant mt-0.5">{it.description}</p>}
                  </div>
                  <button onClick={() => removeItem(sec, idx)} className="text-on-surface-variant hover:text-red-500 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0" title="Remove">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
              {sec.items.length === 0 && openItemFor !== sec.id && (
                <p className="text-xs text-on-surface-variant/70">No entries yet — click “Item” to add one.</p>
              )}
            </div>

            {/* Add-item form */}
            {openItemFor === sec.id && (
              <div className="mt-3 grid grid-cols-1 gap-2 bg-surface-container-low p-3 rounded-xl">
                <input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} className={inputCls} placeholder="Title (e.g. Volunteer Tutor)" type="text" autoFocus />
                <textarea value={itemDesc} onChange={(e) => setItemDesc(e.target.value)} rows={2} className={`${inputCls} resize-none`} placeholder="Description (optional)"></textarea>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setOpenItemFor(null)} className="px-4 py-1.5 border border-outline-variant/30 text-on-surface-variant text-xs font-bold rounded-lg hover:bg-surface-variant transition-colors">Cancel</button>
                  <button onClick={() => addItem(sec)} className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-opacity">Save Item</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add-section form */}
      {showAdd && (
        <div className="flex flex-col sm:flex-row gap-2 mt-4 bg-surface-container-low p-4 rounded-xl">
          <input value={heading} onChange={(e) => setHeading(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSection()} className={`${inputCls} flex-1`} placeholder="Section heading (e.g. Volunteer Work, Publications)" type="text" autoFocus />
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-5 py-2.5 border border-outline-variant/30 text-on-surface-variant text-sm font-bold rounded-xl hover:bg-surface-variant transition-colors">Cancel</button>
            <button onClick={addSection} className="px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl shadow-md hover:opacity-90 transition-opacity">Add</button>
          </div>
        </div>
      )}

      {sections.length === 0 && !showAdd && (
        <div className="flex flex-col items-center text-center py-6">
          <p className="text-on-surface-variant font-medium text-sm">No custom sections yet</p>
          <p className="text-xs text-on-surface-variant/70 mt-1">Add your own headings like Volunteer Work, Publications, or Achievements.</p>
        </div>
      )}
    </div>
  )
}
