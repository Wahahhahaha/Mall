import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Crop } from 'lucide-react';

interface ImageCropModalProps {
  imageUrl: string;
  fileName?: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const MIN = 0.05;
const MAX_OUTPUT = 2000;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/**
 * The canvas always emits raster bytes, so the previous extension is meaningless:
 * keeping a `.svg`/`.ico` name would make the server send the wrong Content-Type and
 * the browser would refuse to render the freshly saved file.
 */
const outputName = (fileName: string, mime: string) => {
  const base = fileName.replace(/\.[^.]+$/, '') || 'image';
  const ext = EXT_BY_MIME[mime] ?? 'png';
  return `${base}.${ext}`;
};

function ImageCropModal({ imageUrl, fileName = 'image', onCancel, onApply }: ImageCropModalProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ mode: DragMode; startX: number; startY: number; rect: CropRect } | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
  const [dragging, setDragging] = useState<DragMode | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onCancel]);

  const boxSize = () => {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { w: r.width, h: r.height };
  };

  const handleLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) {
      setError(true);
      return;
    }
    setNatural({ w, h });
    setCrop({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 });
    setError(false);
  };

  const onPointerDown = (e: React.PointerEvent, mode: DragMode) => {
    e.preventDefault();
    const box = boxSize();
    if (!box) return;
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, rect: { ...crop } };
    setDragging(mode);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const box = boxSize();
    if (!box) return;
    const dx = (e.clientX - d.startX) / box.w;
    const dy = (e.clientY - d.startY) / box.h;
    const r = { ...d.rect };

    const setX = (v: number) => {
      r.x = clamp(v, 0, 1 - MIN);
    };
    const setY = (v: number) => {
      r.y = clamp(v, 0, 1 - MIN);
    };

    switch (d.mode) {
      case 'nw':
        setX(r.x + dx);
        setY(r.y + dy);
        r.w = d.rect.w - (r.x - d.rect.x);
        r.h = d.rect.h - (r.y - d.rect.y);
        break;
      case 'n':
        setY(r.y + dy);
        r.h = d.rect.h - (r.y - d.rect.y);
        break;
      case 'ne':
        r.h = clamp(d.rect.h - dy, MIN, 1 - d.rect.y);
        r.w = clamp(d.rect.w + dx, MIN, 1 - d.rect.x);
        r.y = d.rect.y;
        r.h = Math.min(r.h, 1 - r.y);
        break;
      case 'e':
        r.w = clamp(d.rect.w + dx, MIN, 1 - d.rect.x);
        break;
      case 'se':
        r.w = clamp(d.rect.w + dx, MIN, 1 - d.rect.x);
        r.h = clamp(d.rect.h + dy, MIN, 1 - d.rect.y);
        break;
      case 's':
        r.h = clamp(d.rect.h + dy, MIN, 1 - d.rect.y);
        break;
      case 'sw':
        r.h = clamp(d.rect.h + dy, MIN, 1 - d.rect.y);
        setX(r.x + dx);
        r.w = d.rect.w - (r.x - d.rect.x);
        break;
      case 'w':
        setX(r.x + dx);
        r.w = d.rect.w - (r.x - d.rect.x);
        break;
      case 'move':
        r.x = clamp(d.rect.x + dx, 0, 1 - d.rect.w);
        r.y = clamp(d.rect.y + dy, 0, 1 - d.rect.h);
        break;
    }
    if (r.w < MIN) return;
    if (r.h < MIN) return;
    setCrop(r);
  };

  const onPointerUp = () => {
    dragRef.current = null;
    setDragging(null);
  };

  const handleApply = () => {
    const img = imgRef.current;
    if (!img || !natural) return;
    const sx = clamp(Math.round(crop.x * natural.w), 0, natural.w - 1);
    const sy = clamp(Math.round(crop.y * natural.h), 0, natural.h - 1);
    const cw = Math.min(Math.max(1, Math.round(crop.w * natural.w)), natural.w - sx);
    const ch = Math.min(Math.max(1, Math.round(crop.h * natural.h)), natural.h - sy);
    const scale = Math.min(1, MAX_OUTPUT / Math.max(cw, ch));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(cw * scale));
    canvas.height = Math.max(1, Math.round(ch * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, canvas.width, canvas.height);
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    let mime = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mime = 'image/jpeg';
    else if (ext === 'webp') mime = 'image/webp';
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onApply(new File([blob], outputName(fileName, blob.type), { type: blob.type }));
      },
      mime,
      0.92
    );
  };

  const pct = (v: number) => `${v * 100}%`;

  return createPortal(
    <div className="modal-overlay" onClick={onCancel}>
      <div className="crop-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Crop size={17} /> Crop Image
          </h3>
          <button className="modal-close" onClick={onCancel} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {error ? (
          <p className="welcome-text">Could not load image. Please choose a valid image file.</p>
        ) : (
          <>
            <div
              ref={stageRef}
              className="crop-stage"
              style={{ cursor: dragging === 'move' ? 'grabbing' : dragging ? 'crosshair' : undefined }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              <img ref={imgRef} src={imageUrl} alt="Crop" onLoad={handleLoad} draggable={false} />
              {natural && (
                <>
                  <div
                    className="crop-frame"
                    style={{ left: pct(crop.x), top: pct(crop.y), width: pct(crop.w), height: pct(crop.h), cursor: dragging === 'move' ? 'grabbing' : 'move' }}
                    onPointerDown={(e) => {
                      if ((e.target as HTMLElement).classList.contains('crop-handle')) return;
                      onPointerDown(e, 'move');
                    }}
                  >
                    <div className="crop-handle nw" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'nw'); }} />
                    <div className="crop-handle n" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'n'); }} />
                    <div className="crop-handle ne" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'ne'); }} />
                    <div className="crop-handle e" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'e'); }} />
                    <div className="crop-handle se" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'se'); }} />
                    <div className="crop-handle s" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 's'); }} />
                    <div className="crop-handle sw" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'sw'); }} />
                    <div className="crop-handle w" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, 'w'); }} />
                  </div>
                </>
              )}
            </div>
            <p className="form-hint" style={{ textAlign: 'center' }}>
              Drag the frame or its corner points to choose the crop area.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={onCancel}>
                Cancel
              </button>
              <button type="button" className="btn-secondary" onClick={handleApply}>
                <Check size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /> Apply Crop
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ImageCropModal;