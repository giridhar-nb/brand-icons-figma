import Fuse from 'fuse.js'
import { useState, useEffect } from 'preact/hooks'

export type Icon = {
  id: string
  name: string
  svg: string
  category: string
  tags: string[]
}

function useSearch(icons: Icon[], query: string, category: string) {
  const [results, setResults] = useState<Icon[]>(icons)

  useEffect(() => {
    const fuse = new Fuse(icons, {
      threshold: 0.2,
      keys: ['name', 'tags', 'category']
    })

    if (query.trim()) {
      const found = fuse.search(query.trim()).map(r => r.item)
      setResults(category ? found.filter(i => i.category === category) : found)
    } else {
      setResults(category ? icons.filter(i => i.category === category) : icons)
    }
  }, [query, category, icons])

  return results
}

export default useSearch
