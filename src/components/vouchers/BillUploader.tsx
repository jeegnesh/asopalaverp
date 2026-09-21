import React, { useState } from 'react';
import { uploadToR2, deleteFromR2 } from '@/lib/r2';
import { useUIStore } from '@/store/uiStore';
import { UploadCloud, X, Loader2, Eye, Camera, Plus, Image as ImageIcon } from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';
import { showToast } from '@/components/ui/ToastContainer';

interface BillUploaderProps {
  photoUrls: string[];
  onChange: (urls: string[]) => void;
  maxPhotos?: number;
}

export const BillUploader: React.FC<BillUploaderProps> = ({
  photoUrls,
  onChange,
  maxPhotos = 4,
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { openLightbox } = useUIStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError(null);

    if (photoUrls.length + files.length > maxPhotos) {
      const msg = `Maximum of ${maxPhotos} photos allowed.`;
      setUploadError(msg);
      showToast({
        type: 'error',
        title: 'Limit Exceeded',
        message: msg,
      });
      return;
    }

    const toastId = `bill-upload-${Date.now()}`;
    setUploading(true);
    triggerHaptic('light');
    showToast({
      id: toastId,
      type: 'loading',
      title: 'Uploading Attachment',
      message: `Uploading ${files.length} receipt photo(s)...`,
      durationMs: 6000,
    });
    try {
      const uploadPromises = Array.from(files).map((file) =>
        uploadToR2(file, 'receipts', file.name)
      );
      const results = await Promise.all(uploadPromises);
      const validUrls = results.filter((u) => Boolean(u && u.trim()));
      if (validUrls.length > 0) {
        onChange([...photoUrls, ...validUrls]);
        triggerHaptic('success');
        showToast({
          id: toastId,
          type: 'success',
          title: 'Bill Uploaded',
          message: `Added ${validUrls.length} receipt image(s) to bill.`,
        });
      } else {
        const errMsg = 'Cloudflare R2 upload failed. Please verify your R2 Access Key & Secret Key.';
        setUploadError(errMsg);
        triggerHaptic('error');
        showToast({
          id: toastId,
          type: 'error',
          title: 'Upload Failed',
          message: errMsg,
        });
      }
    } catch (err: any) {
      console.error('Upload processing error:', err);
      const errMsg = 'Failed to upload receipt: ' + (err.message || 'Unknown error');
      setUploadError(errMsg);
      triggerHaptic('error');
      showToast({
        id: toastId,
        type: 'error',
        title: 'Upload Failed',
        message: errMsg,
      });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = async (index: number) => {
    triggerHaptic('light');
    const urlToRemove = photoUrls[index];
    onChange(photoUrls.filter((_, idx) => idx !== index));

    showToast({
      type: 'info',
      title: 'Photo Removed',
      message: 'Receipt photo removed and deleted from cloud storage.',
    });

    if (urlToRemove) {
      try {
        await deleteFromR2(urlToRemove);
      } catch (e) {
        console.warn('Background R2 delete notice:', e);
      }
    }
  };

  return (
    <div className="space-y-3 font-sans">
      {uploadError && (
        <p className="p-2.5 rounded-[6px] bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium font-sans">
          {uploadError}
        </p>
      )}

      {/* Thumbnails Grid */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {photoUrls.map((url, idx) => (
            <div
              key={idx}
              className="relative group rounded-[6px] overflow-hidden bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#2e2e2e] h-28 flex items-center justify-center shadow-xs"
            >
              <img
                src={url}
                alt={`Receipt #${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => openLightbox(url)}
                  className="p-1.5 rounded-[4px] bg-white dark:bg-[#242424] text-slate-900 dark:text-white border border-slate-300 dark:border-[#383838] hover:border-[#3ecf8e] cursor-pointer"
                  title="View Full Size"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1.5 rounded-[4px] bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashed Dropzone Box */}
      {photoUrls.length < maxPhotos && (
        <div className="rounded-[8px] border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] hover:border-slate-300 dark:hover:border-[#404040] bg-slate-50/50 dark:bg-[#161616] p-6 text-center transition-colors">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#3ecf8e] flex items-center justify-center border border-emerald-500/20">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>

            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                Upload Bill / Photo #{photoUrls.length + 1}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Drag &amp; drop receipt file or choose an upload option below (WebP, JPG, PNG up to 10MB)
              </p>
            </div>

            {/* Upload Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-slate-300 dark:border-[#2e2e2e] bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] text-slate-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
                <Camera className="w-3.5 h-3.5 text-emerald-600 dark:text-[#3ecf8e]" />
                <span>Snap Camera</span>
              </label>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-slate-300 dark:border-[#2e2e2e] bg-white dark:bg-[#202020] hover:bg-slate-50 dark:hover:bg-[#282828] text-slate-800 dark:text-zinc-200 text-xs font-medium cursor-pointer transition-colors shadow-2xs">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="sr-only"
                />
                <ImageIcon className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
                <span>Browse Files</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="flex items-center justify-center gap-2 py-2 text-xs font-mono text-emerald-700 dark:text-[#3ecf8e] font-medium">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Uploading bill proof to cloud storage...</span>
        </div>
      )}
    </div>
  );
};
