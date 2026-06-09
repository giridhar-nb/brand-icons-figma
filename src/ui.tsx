import '!./ui.css'

import {
  Container,
  Divider,
  Bold,
  render,
  Text,
  Muted,
  VerticalSpace,
  SearchTextbox,
  DropdownOption,
  Dropdown,
  Columns,
  Checkbox,
} from "@create-figma-plugin/ui";
import { emit, on } from '@create-figma-plugin/utilities'
import { h, JSX, Fragment } from 'preact'
import { useState, useEffect, useMemo } from 'preact/hooks'
import useSearch, { Icon } from './use-search'

// ── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function cleanSvg(raw: string) {
  return raw.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/on\w+="[^"]*"/g, '').trim()
}

// ── Icon button ───────────────────────────────────────────────────────────────

function IconButton({
  icon,
  stroke,
  outlineStroke,
  onContextMenu,
}: {
  icon: Icon
  stroke: string
  outlineStroke: boolean
  onContextMenu: (icon: Icon, x: number, y: number) => void
}) {
  const svg = icon.svg.replace('stroke-width="2"', `stroke-width="${stroke}"`)

  function handleDragStart(e: DragEvent) {
    if (!e.dataTransfer) return
    e.dataTransfer.setData('text/plain', JSON.stringify({
      __customIcon: true,
      name: icon.name,
      svg,
      outlineStroke,
    }))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      key={icon.id}
      aria-label={icon.name}
      title={`${icon.name}\nClick to insert · Drag to canvas · Right-click for options`}
      onClick={() => emit("SUBMIT", { name: icon.name, svg, outlineStroke })}
      onContextMenu={(e: MouseEvent) => { e.preventDefault(); onContextMenu(icon, e.clientX, e.clientY) }}
      onDragStart={handleDragStart}
      draggable
      class="icon-button"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ── Bulk SVG import ───────────────────────────────────────────────────────────

function BulkImportForm({
  existingCategories,
  onSave,
  onCancel,
}: {
  existingCategories: string[]
  onSave: (icons: Icon[]) => void
  onCancel: () => void
}) {
  const [category, setCategory] = useState('')
  const [previews, setPreviews] = useState<{ name: string; svg: string }[]>([])
  const [error, setError] = useState('')

  function handleFiles(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? [])
    const svgFiles = files.filter(f => f.name.endsWith('.svg'))
    if (svgFiles.length === 0) { setError('No SVG files selected'); return }
    setError('')

    Promise.all(
      svgFiles.map(f =>
        f.text().then(text => ({
          name: f.name.replace(/\.svg$/i, '').toLowerCase().replace(/\s+/g, '-'),
          svg: cleanSvg(text),
        }))
      )
    ).then(setPreviews)
  }

  function handleImport() {
    if (previews.length === 0) { setError('No SVG files loaded'); return }
    onSave(previews.map(p => ({
      id: uid(),
      name: p.name,
      svg: p.svg,
      category: category.trim(),
      tags: [],
    })))
  }

  return (
    <div class="add-form">
      <div class="add-form__header">
        <span class="add-form__title">Import SVG Files</span>
        <button class="add-form__close" onClick={onCancel}>✕</button>
      </div>

      <label class="field-label">Category (applied to all)</label>
      <input
        class="field-input"
        list="cat-list-bulk"
        value={category}
        onInput={(e: any) => setCategory(e.target.value)}
        placeholder="e.g. Brand"
      />
      <datalist id="cat-list-bulk">
        {existingCategories.map(c => <option value={c} />)}
      </datalist>

      <label class="field-label">Select SVG files</label>
      <label class="file-drop">
        <input
          type="file"
          accept=".svg"
          multiple
          style={{ display: 'none' }}
          onChange={handleFiles}
        />
        <span class="file-drop__icon">↑</span>
        <span>Click to choose SVG files</span>
        <span class="file-drop__hint">Multiple files supported</span>
      </label>

      {previews.length > 0 && (
        <div class="bulk-preview">
          <p class="bulk-preview__count">{previews.length} icon{previews.length !== 1 ? 's' : ''} ready to import</p>
          <div class="bulk-preview__grid">
            {previews.map(p => (
              <div key={p.name} class="bulk-preview__item" title={p.name}>
                <span class="bulk-preview__svg" dangerouslySetInnerHTML={{ __html: p.svg }} />
                <span class="bulk-preview__name">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <p class="field-error">{error}</p>}

      <div class="add-form__actions">
        <button class="btn-primary" onClick={handleImport} disabled={previews.length === 0}>
          Import {previews.length > 0 ? `${previews.length} icons` : ''}
        </button>
        <button class="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Add icon form ─────────────────────────────────────────────────────────────

function AddIconForm({
  initial,
  existingCategories,
  onSave,
  onCancel,
}: {
  initial?: Icon
  existingCategories: string[]
  onSave: (icon: Icon) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [svg, setSvg] = useState(initial?.svg ?? '')
  const [error, setError] = useState('')

  function handleSave() {
    if (!name.trim()) { setError('Name is required'); return }
    if (!svg.trim()) { setError('SVG is required'); return }
    const cleaned = cleanSvg(svg)
    if (!cleaned.includes('<svg')) { setError('Must be a valid SVG string'); return }
    onSave({
      id: initial?.id ?? uid(),
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      category: category.trim(),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      svg: cleaned,
    })
  }

  return (
    <div class="add-form">
      <div class="add-form__header">
        <span class="add-form__title">{initial ? 'Edit Icon' : 'Add Icon'}</span>
        <button class="add-form__close" onClick={onCancel}>✕</button>
      </div>

      <label class="field-label">Name</label>
      <input
        class="field-input"
        value={name}
        onInput={(e: any) => setName(e.target.value)}
        placeholder="e.g. my-logo"
      />

      <label class="field-label">Category</label>
      <input
        class="field-input"
        list="cat-list"
        value={category}
        onInput={(e: any) => setCategory(e.target.value)}
        placeholder="e.g. Brand"
      />
      <datalist id="cat-list">
        {existingCategories.map(c => <option value={c} />)}
      </datalist>

      <label class="field-label">Tags (comma-separated)</label>
      <input
        class="field-input"
        value={tags}
        onInput={(e: any) => setTags(e.target.value)}
        placeholder="logo, social, brand"
      />

      <label class="field-label">SVG</label>
      <textarea
        class="field-textarea"
        value={svg}
        onInput={(e: any) => setSvg(e.target.value)}
        placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">…</svg>'
        rows={5}
      />

      {error && <p class="field-error">{error}</p>}

      <div class="add-form__actions">
        <button class="btn-primary" onClick={handleSave}>{initial ? 'Update' : 'Add Icon'}</button>
        <button class="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Context menu ──────────────────────────────────────────────────────────────

function ContextMenu({
  icon,
  x, y,
  onInsert,
  onEdit,
  onDelete,
  onClose,
}: {
  icon: Icon
  x: number
  y: number
  onInsert: () => void
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div class="ctx-overlay" onClick={onClose}>
      <ul class="ctx-menu" style={{ left: x, top: y }} onClick={(e: MouseEvent) => e.stopPropagation()}>
        <li class="ctx-item" onClick={() => { onInsert(); onClose() }}>Insert to canvas</li>
        <li class="ctx-item" onClick={() => { onEdit(); onClose() }}>Edit</li>
        <li class="ctx-item ctx-item--danger" onClick={() => { onDelete(); onClose() }}>Delete</li>
      </ul>
    </div>
  )
}

// ── Main plugin ───────────────────────────────────────────────────────────────

function Plugin() {
  const [icons, setIcons] = useState<Icon[]>([])
  const [loaded, setLoaded] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [stroke, setStroke] = useState('2')
  const [outlineStroke, setOutlineStroke] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [editIcon, setEditIcon] = useState<Icon | null>(null)
  const [ctxMenu, setCtxMenu] = useState<{ icon: Icon; x: number; y: number } | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // Apply theme class to body — must target body so @create-figma-plugin/ui components inherit vars
  useEffect(() => {
    document.body.classList.remove('theme--dark', 'theme--light')
    document.body.classList.add(`theme--${theme}`)
  }, [theme])

  useEffect(() => {
    on("ICONS_LOADED", (stored: Icon[], savedTheme: string) => {
      setIcons(stored ?? [])
      setTheme((savedTheme === 'light' ? 'light' : 'dark'))
      setLoaded(true)
    })
    emit("LOAD_ICONS")
  }, [])

  function saveIcons(next: Icon[]) {
    setIcons(next)
    emit("SAVE_ICONS", next)
  }

  function toggleTheme() {
    const next: 'dark' | 'light' = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    emit("SAVE_THEME", next)
  }

  function handleSaveIcon(icon: Icon) {
    const next = icons.find(i => i.id === icon.id)
      ? icons.map(i => i.id === icon.id ? icon : i)
      : [...icons, icon]
    saveIcons(next)
    setShowAdd(false)
    setEditIcon(null)
  }

  function handleBulkImport(imported: Icon[]) {
    saveIcons([...icons, ...imported])
    setShowBulk(false)
  }

  function handleDelete(id: string) {
    saveIcons(icons.filter(i => i.id !== id))
  }

  const existingCategories = useMemo(() =>
    Array.from(new Set(icons.map(i => i.category).filter(Boolean))).sort()
  , [icons])

  const results = useSearch(icons, search, category)
  const limit = 102

  const categories: DropdownOption[] = [
    { value: '', text: 'All categories' },
    ...existingCategories.map(c => ({ value: c, text: c }))
  ]

  const strokes: DropdownOption[] = [
    { value: '1', text: 'Thin' },
    { value: '1.5', text: 'Light' },
    { value: '2', text: 'Normal' },
  ]

  if (!loaded) return <div class="loading">Loading…</div>

  if (showBulk) {
    return (
      <BulkImportForm
        existingCategories={existingCategories}
        onSave={handleBulkImport}
        onCancel={() => setShowBulk(false)}
      />
    )
  }

  if (showAdd || editIcon) {
    return (
      <AddIconForm
        initial={editIcon ?? undefined}
        existingCategories={existingCategories}
        onSave={handleSaveIcon}
        onCancel={() => { setShowAdd(false); setEditIcon(null) }}
      />
    )
  }

  return (
    <Fragment>
      {ctxMenu && (
        <ContextMenu
          icon={ctxMenu.icon}
          x={ctxMenu.x}
          y={ctxMenu.y}
          onInsert={() => emit("SUBMIT", { name: ctxMenu.icon.name, svg: ctxMenu.icon.svg, outlineStroke })}
          onEdit={() => setEditIcon(ctxMenu.icon)}
          onDelete={() => handleDelete(ctxMenu.icon.id)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      <div class="search">
        <SearchTextbox
          onInput={(e: JSX.TargetedEvent<HTMLInputElement>) => setSearch(e.currentTarget.value)}
          placeholder={`Search ${icons.length} icons`}
          value={search}
        />
        <Divider />
        <Container space="extraSmall">
          <VerticalSpace space="extraSmall" />
          <Columns space="small">
            <Dropdown onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => setCategory(e.currentTarget.value)} options={categories} value={category} />
            <Dropdown onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => setStroke(e.currentTarget.value)} options={strokes} value={stroke} />
          </Columns>
          <VerticalSpace space="extraSmall" />
        </Container>
        <Divider />
      </div>

      <Container space="small">
        <VerticalSpace space="small" />
        {(search || category) && (
          <div>
            <Text>
              <Bold>
                Icons
                {search && ` matched "${search}"`}
                {category && ` in category "${category}"`}:
              </Bold>
            </Text>
            <VerticalSpace space="small" />
          </div>
        )}
      </Container>

      <Container space="small">
        <div class="grid">
          {results.slice(0, limit).map(icon => (
            <IconButton
              key={icon.id}
              icon={icon}
              stroke={stroke}
              outlineStroke={outlineStroke}
              onContextMenu={(icon, x, y) => setCtxMenu({ icon, x, y })}
            />
          ))}
        </div>

        {results.length === 0 && icons.length > 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center"><Muted>No icons match your search.</Muted></Text>
            <VerticalSpace space="large" />
          </div>
        )}

        {icons.length === 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center"><Muted>No icons yet. Click "+ Add Icon" below.</Muted></Text>
            <VerticalSpace space="large" />
          </div>
        )}

        {results.length - limit > 0 && (
          <div>
            <VerticalSpace space="medium" />
            <Text align="center">
              <Muted>…and {results.length - limit} more. Use search to find them.</Muted>
            </Text>
          </div>
        )}
        <VerticalSpace space="extraLarge" />
        <VerticalSpace space="extraLarge" />
        <VerticalSpace space="extraLarge" />
      </Container>

      <div class="footer">
        <Divider />
        <Container space="medium">
          <VerticalSpace space="small" />
          <Columns style={{ alignItems: 'center' }}>
            <Checkbox onChange={(e: JSX.TargetedEvent<HTMLInputElement>) => setOutlineStroke(e.currentTarget.checked)} value={outlineStroke}>
              <Text>Paste as outline</Text>
            </Checkbox>
            <div style={{ textAlign: 'right', display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
              <button class="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              <button class="add-btn" onClick={() => setShowBulk(true)}>↑ Import SVGs</button>
              <button class="add-btn" onClick={() => setShowAdd(true)}>+ Add Icon</button>
            </div>
          </Columns>
          <VerticalSpace space="small" />
        </Container>
      </div>
    </Fragment>
  )
}

export default render(Plugin)
