import { useState, useRef, useEffect } from 'react';
import '../styles/TagPicker.css';

export default function TagPicker({ value = [], onChange, placeholder = 'Search tags…' }) {
  const [query, setQuery]       = useState('');
  const [options, setOptions]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef = useRef(null);
  const wrapRef     = useRef(null);

  useEffect(() => {
    const handler = e => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchTags = async (q) => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/tags/search?q=${encodeURIComponent(q)}&limit=6`, { credentials: 'include' });
      const data = await res.json();
      setOptions({ tags: data.tags || [], canCreate: data.canCreate });
      setOpen(true);
    } catch {
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = e => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchTags(q), 220);
  };

  const addTag = tag => {
    if (value.find(t => t.slug === tag.slug)) { setOpen(false); return; }
    onChange([...value, tag]);
    setQuery('');
    setOpen(false);
  };

  const removeTag = slug => onChange(value.filter(t => t.slug !== slug));

  const handleCreateTag = async () => {
    const res  = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName: query }),
    });
    const data = await res.json();
    if (data.tag) addTag(data.tag);
  };

  const filtered = (options.tags || []).filter(t => !value.find(v => v.slug === t.slug));

  return (
    <div className="tag-picker" ref={wrapRef}>
      {/* Pills */}
      <div className="tag-pills">
        {value.map(tag => (
          <span key={tag.slug} className="tag-pill">
            {tag.displayName}
            <button type="button" className="tag-pill__remove" onClick={() => removeTag(tag.slug)}>×</button>
          </span>
        ))}
      </div>

      {/* Input */}
      <div className="tag-picker__input-wrap">
        <input
          className="tag-picker__input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleInput}
          onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
        />

        {/* Dropdown */}
        {open && (
          <div className="tag-picker__dropdown tag-picker__dropdown--open">
            {loading && <div className="tag-picker__loading">Searching…</div>}
            {!loading && filtered.map(tag => (
              <div
                key={tag.slug}
                className="tag-picker__option"
                onMouseDown={e => { e.preventDefault(); addTag(tag); }}
              >
                {tag.displayName}
              </div>
            ))}
            {!loading && options.canCreate && (
              <div
                className="tag-picker__option tag-picker__option--create"
                onMouseDown={e => { e.preventDefault(); handleCreateTag(); }}
              >
                Add <strong>"{query}"</strong> as new tag
              </div>
            )}
            {!loading && filtered.length === 0 && !options.canCreate && (
              <div className="tag-picker__loading">No matches found.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
