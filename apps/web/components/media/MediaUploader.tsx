'use client';

import Cropper, { type Area } from 'react-easy-crop';
import { useCallback, useRef, useState } from 'react';
import { storageApi } from '../../lib/api';
import { getCroppedBlob } from '../../lib/cropImage';

export interface UploaderMedia {
  id: string;
  url: string;
  mediaType: string;
  sortOrder?: number;
}

export const isVideoType = (t: string) => t.startsWith('video');
export const isImageType = (t: string) => t.startsWith('image');

/** Count images vs videos in a media list — shared with parents for validation. */
export function countMedia(items: UploaderMedia[]) {
  let images = 0;
  let videos = 0;
  for (const m of items) {
    if (isVideoType(m.mediaType)) videos += 1;
    else images += 1;
  }
  return { images, videos };
}

interface Props {
  items: UploaderMedia[];
  /** Storage folder for presigned uploads, e.g. `listings/<id>` or `advertisements`. */
  folder: string;
  /** Persist a new media record (surface-specific); returns the created row. */
  onAdd: (m: { url: string; mediaType: string; sortOrder: number }) => Promise<UploaderMedia>;
  onDelete: (id: string) => Promise<void>;
  minImages?: number;
  minVideos?: number;
  /** Crop aspect ratio (width/height). Default 4/3. */
  aspect?: number;
  maxVideoMB?: number;
  label?: string;
  hint?: string;
}

export default function MediaUploader({
  items,
  folder,
  onAdd,
  onDelete,
  minImages = 5,
  minVideos = 1,
  aspect = 4 / 3,
  maxVideoMB = 100,
  label = 'Photos & video',
  hint,
}: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState<'' | 'image' | 'video'>('');
  const [error, setError] = useState('');

  // Crop queue — images selected but not yet cropped+uploaded.
  const [queue, setQueue] = useState<File[]>([]);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);

  const { images, videos } = countMedia(items);

  const resetTransform = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setCroppedArea(null);
  };

  const openImage = (file: File) => {
    setCropSrc(URL.createObjectURL(file));
    resetTransform();
  };

  const onPickImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith('image'));
    e.target.value = '';
    if (files.length === 0) return;
    setError('');
    setQueue(files);
    openImage(files[0]);
  };

  const advanceQueue = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const rest = queue.slice(1);
    if (rest.length > 0) {
      setQueue(rest);
      openImage(rest[0]);
    } else {
      setQueue([]);
      setCropSrc(null);
    }
  };

  const uploadBlob = useCallback(
    async (blob: Blob | File, filename: string, mimeType: string): Promise<string> => {
      const { uploadUrl, publicUrl } = await storageApi.getPresignedUrl(folder, filename, mimeType);
      const res = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: blob,
      });
      if (!res.ok) throw new Error('Upload failed');
      return publicUrl;
    },
    [folder],
  );

  const confirmCrop = async () => {
    if (!cropSrc || !croppedArea) return;
    setBusy('image');
    setError('');
    try {
      const blob = await getCroppedBlob(cropSrc, croppedArea, rotation);
      const url = await uploadBlob(blob, `photo-${Date.now()}.jpg`, 'image/jpeg');
      await onAdd({ url, mediaType: 'image/jpeg', sortOrder: items.length });
      advanceQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo');
    } finally {
      setBusy('');
    }
  };

  const cancelCrop = () => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setQueue([]);
    setCropSrc(null);
  };

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    if (!file.type.startsWith('video')) {
      setError('Please choose a video file.');
      return;
    }
    if (file.size > maxVideoMB * 1024 * 1024) {
      setError(`Video is too large (max ${maxVideoMB}MB).`);
      return;
    }
    setBusy('video');
    try {
      const url = await uploadBlob(file, file.name, file.type);
      await onAdd({ url, mediaType: file.type, sortOrder: items.length });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload video');
    } finally {
      setBusy('');
    }
  };

  const removeItem = async (id: string) => {
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove media');
    }
  };

  const imagesOk = images >= minImages;
  const videosOk = videos >= minVideos;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">{label}</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-secondary text-sm py-1.5"
            disabled={busy !== ''}
            onClick={() => imageInputRef.current?.click()}
          >
            {busy === 'image' ? 'Uploading…' : '+ Add photos'}
          </button>
          <button
            type="button"
            className="btn-secondary text-sm py-1.5"
            disabled={busy !== ''}
            onClick={() => videoInputRef.current?.click()}
          >
            {busy === 'video' ? 'Uploading…' : '+ Add video'}
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onPickImages}
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onPickVideo}
        />
      </div>

      {/* Count / requirement status */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {minImages > 0 ? (
          <span className={imagesOk ? 'text-green-600' : 'text-amber-600'}>
            {imagesOk ? '✓' : '•'} Photos {images}/{minImages}
          </span>
        ) : (
          <span className="text-muted">Photos: {images}</span>
        )}
        {minVideos > 0 ? (
          <span className={videosOk ? 'text-green-600' : 'text-amber-600'}>
            {videosOk ? '✓' : '•'} Video {videos}/{minVideos}
          </span>
        ) : (
          <span className="text-muted">Video: {videos}</span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>

      {error && <div className="alert-error mt-3 text-sm">{error}</div>}

      {/* Grid */}
      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 py-8 text-center text-sm text-muted">
          {minImages > 0 || minVideos > 0
            ? `No media yet. Add at least ${minImages} photos and ${minVideos} video.`
            : 'No media yet. Add photos or a video (optional).'}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((m, i) => {
            const isVid = isVideoType(m.mediaType);
            const isCover = !isVid && items.filter((x) => isImageType(x.mediaType))[0]?.id === m.id;
            return (
              <div
                key={m.id}
                className="group relative h-28 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800"
              >
                {isVid ? (
                  <>
                    <video src={m.url} className="h-full w-full object-cover" muted playsInline />
                    <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      ▶ Video
                    </span>
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                )}
                {isCover && (
                  <span className="absolute bottom-1.5 left-1.5 rounded bg-brand-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(m.id)}
                  aria-label="Remove"
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Crop / rotate modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-black/80 p-4">
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-2xl bg-gray-900">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold text-white">
                Crop &amp; rotate {queue.length > 1 ? `(${queue.length} left)` : ''}
              </p>
              <button type="button" onClick={cancelCrop} className="text-sm text-gray-300 hover:text-white">
                Cancel
              </button>
            </div>

            <div className="relative flex-1 bg-black" style={{ minHeight: 280 }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={(_area, pixels) => setCroppedArea(pixels)}
              />
            </div>

            <div className="space-y-3 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-14 text-xs text-gray-300">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-14 text-xs text-gray-300">Rotate</span>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                  className="rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                >
                  ⟲ 90°
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="rounded bg-white/10 px-3 py-1 text-sm text-white hover:bg-white/20"
                >
                  ⟳ 90°
                </button>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className="flex-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                {queue.length > 1 && (
                  <button
                    type="button"
                    onClick={advanceQueue}
                    disabled={busy !== ''}
                    className="btn-ghost text-sm"
                  >
                    Skip
                  </button>
                )}
                <button
                  type="button"
                  onClick={confirmCrop}
                  disabled={busy !== '' || !croppedArea}
                  className="btn-primary text-sm"
                >
                  {busy === 'image' ? 'Uploading…' : 'Use photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
