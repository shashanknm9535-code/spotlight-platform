import React, { useRef, useState } from 'react';
import { SELF_RATING_QUALIFIERS } from '../../data/eventData';
import { Badge } from '../ui/Badge';
import { Camera, Upload, X, Star, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';

export interface StepPhotoRatingProps {
  photo: File | null;
  photoPreview: string | null;
  selfRating: number;
  errors: Record<string, string>;
  onSelectPhoto: (file: File | null, previewUrl: string | null) => void;
  onChangeRating: (rating: number) => void;
}

export const StepPhotoRating: React.FC<StepPhotoRatingProps> = ({
  photo,
  photoPreview,
  selfRating,
  errors,
  onSelectPhoto,
  onChangeRating,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handleFileChange = (file: File | undefined) => {
    setPhotoError(null);
    if (!file) return;

    // Validate image type
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }

    // Validate max size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onSelectPhoto(file, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileChange(file);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <div className="text-center max-w-xl mx-auto">
        <Badge variant="gold">STEP 04</Badge>
        <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white uppercase tracking-tight mt-3 mb-2">
          PHOTO & SELF-RATING
        </h2>
        <p className="text-sm text-zinc-400 font-sans">
          Upload your stage profile picture and evaluate your performance confidence for auditorium graphics.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* PHOTO UPLOAD BOX */}
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A] mb-6">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-display font-bold text-white uppercase">
                  YOUR SPOTLIGHT PHOTO <span className="text-amber-400">*</span>
                </h3>
              </div>
              <Badge variant="dark">STAGE PROFILE</Badge>
            </div>

            <p className="text-xs font-sans text-zinc-400 mb-6">
              Upload a clear headshot or stage performance photo for live LED screen announcements. Max 5MB.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />

            {photoPreview ? (
              <div className="relative group border border-amber-400/50 bg-[#141420] p-4 text-center">
                <div className="w-36 h-36 mx-auto overflow-hidden border border-amber-400 mb-3 shadow-[0_0_25px_rgba(250,204,21,0.2)]">
                  <img
                    src={photoPreview}
                    alt="Performer Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-emerald-400 mb-4 bg-emerald-500/10 px-3 py-1 border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to upload ({photo ? (photo.size / 1024 / 1024).toFixed(2) : 0} MB)</span>
                </div>

                <div className="flex items-center justify-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Replace Photo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectPhoto(null, null)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed text-center cursor-pointer transition-all duration-200 ${
                  isDragOver
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-[#27273C] bg-[#141420] hover:border-amber-400/60 hover:bg-[#181828]'
                }`}
              >
                <div className="w-12 h-12 mx-auto bg-[#1C1C2A] border border-[#2B2B40] flex items-center justify-center text-amber-400 mb-4">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-display font-bold text-white uppercase mb-1">
                  Drag & Drop or Click to Upload
                </p>
                <p className="text-xs font-mono text-zinc-400">PNG, JPG, WebP up to 5MB</p>
              </div>
            )}

            {(photoError || errors.photo) && (
              <p className="mt-3 text-xs text-red-400 font-mono p-2 bg-red-500/10 border border-red-500/30">
                ⚠️ {photoError || errors.photo}
              </p>
            )}
          </div>
        </div>

        {/* SELF-RATING CONTROL */}
        <div className="p-6 sm:p-8 bg-[#0E0E16] border border-[#1E1E2C] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#1C1C2A] mb-6">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-display font-bold text-white uppercase">
                  SELF-RATING <span className="text-amber-400">*</span>
                </h3>
              </div>
              <Badge variant="gold">1 – 10 SCALE</Badge>
            </div>

            <p className="text-xs font-sans text-zinc-400 mb-6">
              HOW WOULD YOU RATE YOUR ACT? This self-assessment is stored for the post-event Spotlight special comparison.
            </p>

            {/* BIG DISPLAY SCORE & QUALIFIER */}
            <div className="p-6 bg-[#141420] border border-[#27273C] text-center mb-6">
              <div className="text-6xl font-display font-black text-amber-400 spotlight-text-glow mb-2">
                {selfRating}
              </div>
              <div className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                {SELF_RATING_QUALIFIERS[selfRating] || 'CONFIDENT'}
              </div>
            </div>

            {/* INTERACTIVE 1-10 BUTTONS */}
            <div className="grid grid-cols-5 gap-2 mb-6">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => onChangeRating(val)}
                  className={`py-2.5 font-mono text-sm font-bold border transition-all duration-200 ${
                    selfRating === val
                      ? 'bg-amber-400 text-black border-amber-400 shadow-[0_0_15px_rgba(250,204,21,0.4)] scale-105'
                      : 'bg-[#181826] text-zinc-400 border-[#27273C] hover:border-amber-400/50 hover:text-white'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>

            {/* SLIDER CONTROLLER */}
            <input
              type="range"
              min="1"
              max="10"
              value={selfRating}
              onChange={(e) => onChangeRating(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <p className="mt-6 text-xs font-mono text-zinc-400 pt-4 border-t border-[#1C1C2A]">
            💡 This rating is used later for the Spotlight special-award comparison vs final judges score.
          </p>
        </div>
      </div>
    </div>
  );
};
