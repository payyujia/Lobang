import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TagPicker from '../components/TagPicker';
import '../styles/ListingForm.css';

const CATEGORIES = [
  'Food & Beverages','Electronics','Books & Media','Clothing & Accessories',
  'Furniture & Home','Sports & Outdoors','Toys & Hobbies','Automotive',
  'Services','Other',
];

export default function ListingForm() {
  const navigate         = useNavigate();
  const [params]         = useSearchParams();
  const editId           = params.get('id');

  const [listing, setListing]   = useState(null);
  const [loading, setLoading]   = useState(!!editId);
  const [error, setError]       = useState(null);
  const [submitting, setSub]    = useState(false);

  // Form fields
  const [title, setTitle]             = useState('');
  const [description, setDesc]        = useState('');
  const [category, setCategory]       = useState('');
  const [descTags, setDescTags]       = useState([]);
  const [desiredItems, setDesired]    = useState([]);

  const [keptImages, setKept]         = useState([]);   // existing filenames to keep
  const [newFiles, setNewFiles]       = useState([]);   // new File objects
  const [previewUrls, setPreviewUrls] = useState([]);   // object URLs for previews of new files
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [fileError, setFileError]     = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editId) return;
    fetch(`/api/listings/${editId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const l = d.listing;
        setListing(l);
        setTitle(l.title || '');
        setDesc(l.description || '');
        setCategory(l.category || '');
        setDescTags(l.descTags?.map(s => ({ slug: s, displayName: s.replace(/-/g, ' ') })) || []);
        setDesired(l.desiredItems?.map(s => ({ slug: s, displayName: s.replace(/-/g, ' ') })) || []);
        setKept(l.images || []);
      })
      .catch(() => setError('Could not load listing'))
      .finally(() => setLoading(false));
  }, [editId]);

  const allSlides = [
    ...keptImages.map(f  => ({ type: 'existing', src: `/uploads/${f}`, name: f })),
    ...previewUrls.map((url, i) => ({ type: 'new', src: url, name: newFiles[i]?.name })),
  ];

  useEffect(() => {
    if (carouselIdx >= allSlides.length && allSlides.length > 0) {
      setCarouselIdx(allSlides.length - 1);
    }
  }, [allSlides.length, carouselIdx]);

  const removeExisting = useCallback((filename) => {
    setKept(prev => prev.filter(f => f !== filename));
  }, []);

  const removeNew = useCallback((index) => {
    URL.revokeObjectURL(previewUrls[index]);
    setNewFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, [previewUrls]);

  const handleFileChange = e => {
    const files = Array.from(e.target.files);
    const totalAfter = keptImages.length + newFiles.length + files.length;
    if (totalAfter > 5) {
      setFileError(`Max 5 images. You have ${keptImages.length + newFiles.length} — can add ${5 - keptImages.length - newFiles.length} more.`);
      e.target.value = '';
      return;
    }
    setFileError('');
    const urls = files.map(f => URL.createObjectURL(f));
    setNewFiles(prev => [...prev, ...files]);
    setPreviewUrls(prev => [...prev, ...urls]);
    e.target.value = '';
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSub(true);
    setError(null);

    const fd = new FormData();
    if (editId) fd.append('id', editId);
    fd.append('title', title);
    fd.append('description', description);
    fd.append('category', category);
    fd.append('descTags', descTags.map(t => t.slug).join(','));
    fd.append('desiredItems', desiredItems.map(t => t.slug).join(','));

    keptImages.forEach(f => fd.append('keptImages', f));
    newFiles.forEach(f => fd.append('images', f));

    const url    = editId ? '/api/listings/update' : '/api/listings/create';
    const method = 'POST';

    try {
      const res = await fetch(url, { method, body: fd, credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Something went wrong');
      }
      navigate('/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setSub(false);
    }
  };

  if (loading) return <div className="page"><p>Loading…</p></div>;

  const showPlaceholder = allSlides.length === 0;

  return (
    <div className="page">
      <form onSubmit={handleSubmit} encType="multipart/form-data" className="lf-wrap">

        {/* LEFT — Image panel */}
        <div className="img-panel">
          {/* Carousel */}
          <div className="carousel-main">
            {showPlaceholder ? (
              <div className="carousel__placeholder">
                <span>🖼️</span>
                <p>Upload images below</p>
              </div>
            ) : (
              <img
                src={allSlides[carouselIdx]?.src}
                alt=""
                className="carousel__img"
              />
            )}
            {allSlides.length > 1 && (
              <>
                <button
                  type="button"
                  className="carousel-ctrl prev"
                  onClick={() => setCarouselIdx(i => Math.max(0, i - 1))}
                  disabled={carouselIdx === 0}
                >‹</button>
                <button
                  type="button"
                  className="carousel-ctrl next"
                  onClick={() => setCarouselIdx(i => Math.min(allSlides.length - 1, i + 1))}
                  disabled={carouselIdx === allSlides.length - 1}
                >›</button>
                <div className="carousel-dots">
                  {allSlides.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`dot${i === carouselIdx ? ' dot--active' : ''}`}
                      onClick={() => setCarouselIdx(i)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Image management */}
          <div className="img-url-area">
            {/* Thumbnails strip */}
            {allSlides.length > 0 && (
              <div className="thumb-strip">
                {allSlides.map((slide, i) => (
                  <div
                    key={`${slide.type}-${slide.name}-${i}`}
                    className={`thumb-item${i === carouselIdx ? ' thumb-item--active' : ''}`}
                    onClick={() => setCarouselIdx(i)}
                  >
                    <img src={slide.src} alt="" />
                    <button
                      type="button"
                      className="thumb-remove"
                      onClick={ev => {
                        ev.stopPropagation();
                        if (slide.type === 'existing') {
                          removeExisting(slide.name);
                        } else {
                          const newIdx = i - keptImages.length;
                          removeNew(newIdx);
                        }
                      }}
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            <label>
              Add images <span style={{ color: 'var(--text-2)', fontWeight: 400 }}>(up to 5 total)</span>
            </label>
            <input
              ref={inputRef}
              type="file"
              id="imageInput"
              name="images"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
            {fileError && <div className="alert alert--error mt-1">{fileError}</div>}
          </div>
        </div>

        {/* RIGHT — Form fields */}
        <div className="form-panel">
          <h1 className="form-title">{editId ? 'Edit Listing' : 'New Listing'}</h1>

          {error && <div className="alert alert--error">{error}</div>}

          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title" name="title" type="text"
              placeholder="e.g. A warm meal"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description" name="description"
              placeholder="Describe your item or service, condition, any quirks…"
              value={description}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category" name="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">— Pick a category —</option>
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Add tags to boost your listing</label>
            <TagPicker
              name="descTags"
              value={descTags}
              onChange={setDescTags}
              placeholder="e.g. cajun food"
            />
          </div>

          <div className="field">
            <label>What do you want in return?</label>
            <TagPicker
              name="desiredItems"
              value={desiredItems}
              onChange={setDesired}
              placeholder="e.g. road bike"
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              className="btn btn--primary btn--full"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Saving…' : editId ? 'Save Changes' : 'Create Listing'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => navigate(editId ? `/listings/${editId}` : '/home')}
            >
              Cancel
            </button>
          </div>
        </div>

      </form>
    </div>
  );
}
