import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  Camera,
  MapPin,
  Sparkles,
  Send,
  Radio,
  FileImage,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { analyzeFloodImage } from '../../services/geminiVisionService';
import { submitReport } from '../../services/api';
import { dispatchFloodIncidentReportAlert } from '../../services/telegramService';
import { AiVerificationResult, CitizenReport } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function ReportModal({ isOpen, onClose }: Props) {
  const { addReport, selectedLocation } = useApp();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('Monsoon Drain Overflowing into Residential Road');
  const [location, setLocation] = useState(selectedLocation || 'Kampung Baru, Kuala Lumpur');
  const [depthCm, setDepthCm] = useState(38);
  const [selectedImage, setSelectedImage] = useState('/banjir_drain.jpg');
  const [customFileName, setCustomFileName] = useState<string | null>('banjir_drain_overflow.jpg');
  const [isDragging, setIsDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AiVerificationResult | null>(null);

  if (!isOpen) return null;

  // Real File Upload Handler (File Input & Drag & Drop)
  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string);
        setCustomFileName(file.name);
        setAiResult(null); // Reset analysis on new image
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleRunAiVerification = async () => {
    setAnalyzing(true);
    const result = await analyzeFloodImage({
      imageUrl: selectedImage,
      userDescription: title,
      reportedDepthCm: depthCm,
    });
    setAiResult(result);
    setAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only claim what actually happened: a report is AI-assessed only if the check ran and judged it flooding.
    const aiAssessed = Boolean(aiResult?.ran && aiResult.verified);

    const authorName = user?.name || 'Citizen Responder';

    setSubmitting(true);
    const local: CitizenReport = {
      id: `rep-${Date.now()}`,
      title: title || 'Water Rising Rapidly on Roadside',
      location,
      lat: 3.1642,
      lon: 101.7031,
      waterDepthCm: depthCm,
      status: aiAssessed ? 'AI_VERIFIED' : 'UNDER_REVIEW',
      verifiedBy: aiAssessed ? 'AI assessment (not an official verification)' : 'Not yet reviewed',
      timestampStr: 'Just now',
      author: authorName,
      upvotes: 1,
      imageUrl: selectedImage,
      description: `Reported flood incident. Depth reported by the user: ${depthCm} cm.${aiAssessed ? ' A visual AI assessment judged the photo to show flooding.' : ' No AI check was completed.'}`,
      aiVerification: aiResult ?? undefined,
    };
    // Keep the reporter's own photo on screen; the server copy has none.
    const saved = await submitReport(local);
    addReport(saved ? { ...saved, imageUrl: selectedImage, aiVerification: local.aiVerification } : local);
    setSubmitting(false);

    // Immediately broadcast ground-truth flood incident alert to community via Telegram Bot
    dispatchFloodIncidentReportAlert({
      title: title || 'Water Rising Rapidly on Roadside',
      location,
      waterDepthCm: depthCm,
      author: authorName,
      hasPhotoEvidence: !!selectedImage,
    });

    if (!saved) {
      setSaveNote('Saved on this device only: the server did not accept it.');
      setTimeout(onClose, 2500);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-[#071426] to-[#0B1E38] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center text-red-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-red-400 uppercase tracking-widest block">
                Citizen Ground-Truth Alert
              </span>
              <h3 className="font-heading font-bold text-base md:text-lg text-white">
                Report Flood Hazard & Photo Evidence
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Incident Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Incident Headline
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Water Overflowing Curbside into Residential Porch"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs md:text-sm focus:outline-none focus:border-[#1677FF]"
            />
          </div>

          {/* Location with Auto-Capture Indicator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Location (GPS Auto-Captured)
              </label>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Geotagged</span>
              </span>
            </div>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs md:text-sm focus:outline-none focus:border-[#1677FF]"
            />
          </div>

          {/* Water Depth Slider */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider">
                Estimated Water Depth:
              </span>
              <span className="font-mono text-sm font-black text-[#1677FF]">
                {depthCm} cm
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              value={depthCm}
              onChange={(e) => setDepthCm(Number(e.target.value))}
              className="w-full accent-[#1677FF] cursor-pointer"
            />
            <div className="flex justify-between text-xs text-slate-400 font-mono">
              <span>5cm (Puddle)</span>
              <span>35cm (Curb)</span>
              <span>75cm (Waist)</span>
              <span>150cm (Deep)</span>
            </div>
          </div>

          {/* REAL IMAGE UPLOAD DROPZONE */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Upload Flood Photo (Evidence)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[#1677FF] bg-blue-50/50'
                  : 'border-slate-300 hover:border-[#1677FF] hover:bg-slate-50'
              }`}
            >
              {selectedImage ? (
                <div className="flex items-center gap-3 text-left">
                  <img
                    src={selectedImage}
                    alt="Preview"
                    className="w-20 h-20 rounded-xl object-cover border border-slate-200 shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-xs text-slate-900 block truncate">
                      {customFileName || 'Flood Incident Photo'}
                    </span>
                    <span className="text-xs text-slate-400 block mt-0.5">
                      Ready for automated visual verification
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="mt-2 text-xs font-bold text-[#1677FF] hover:underline flex items-center gap-1"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Choose Different Photo</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-4 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1677FF] flex items-center justify-center mx-auto">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Click to upload photo or drag & drop
                    </span>
                    <span className="text-xs text-slate-400">
                      Supports JPG, PNG, WebP up to 10MB
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick preset options */}
            <div className="mt-2 space-y-1.5">
              <span className="text-xs text-slate-400 font-semibold block">Or select real incident photo sample:</span>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage('/banjir_drain.jpg');
                    setCustomFileName('banjir_drain_overflow.jpg');
                    setTitle('Monsoon Drain Overflowing into Residential Road');
                    setLocation('Seksyen 13, Shah Alam');
                    setDepthCm(38);
                    setAiResult(null);
                  }}
                  className={`text-xs p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                    selectedImage === '/banjir_drain.jpg'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">1. Drain Overflow</span>
                  <span className="text-xs text-slate-400">Seksyen 13 · 38cm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage('/banjir_underpass.jpg');
                    setCustomFileName('banjir_rasau_underpass.jpg');
                    setTitle('Sungai Rasau Underpass Water Accumulation');
                    setLocation('Sungai Rasau, Klang');
                    setDepthCm(42);
                    setAiResult(null);
                  }}
                  className={`text-xs p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                    selectedImage === '/banjir_underpass.jpg'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">2. Underpass Flood</span>
                  <span className="text-xs text-slate-400">Sg Rasau · 42cm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage('/banjir2.jpg');
                    setCustomFileName('banjir_kampung_baru.jpg');
                    setTitle('Jalan Raja Muda Musa Water Spillover');
                    setLocation('Kampung Baru, Kuala Lumpur');
                    setDepthCm(35);
                    setAiResult(null);
                  }}
                  className={`text-xs p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                    selectedImage === '/banjir2.jpg'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">3. Road Spillover</span>
                  <span className="text-xs text-slate-400">Kg Baru · 35cm</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage('/banjir3.jfif');
                    setCustomFileName('banjir_sri_muda.jpg');
                    setTitle('Submerged Drain & Road Clogged at Seksyen 25');
                    setLocation('Taman Sri Muda, Seksyen 25');
                    setDepthCm(50);
                    setAiResult(null);
                  }}
                  className={`text-xs p-1.5 rounded-lg border text-left font-medium transition-all cursor-pointer ${
                    selectedImage === '/banjir3.jfif'
                      ? 'bg-blue-50 border-blue-400 text-blue-800 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="block truncate">4. Submerged Road</span>
                  <span className="text-xs text-slate-400">Sri Muda · 50cm</span>
                </button>
              </div>
            </div>
          </div>

          {/* Automated Visual AI Verification Section */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <ShieldCheck className="w-4 h-4 text-[#1677FF]" />
                <span>Automated Visual Verification</span>
              </div>
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-[#1677FF] border border-blue-200">
                AI Active
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-snug">
              Multimodal vision analyzes water inundation, vehicle hydrolock hazard, and depth thresholds.
            </p>

            <button
              type="button"
              onClick={handleRunAiVerification}
              disabled={analyzing}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {analyzing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Analyzing Photo for Flood Inundation...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Run Visual AI Assessment</span>
                </>
              )}
            </button>

            {aiResult && (
              <div role="status" className={`p-3 rounded-2xl border text-xs space-y-2 ${aiResult.ran ? 'bg-sky-50/90 border-sky-300 text-sky-950' : 'bg-slate-50 border-slate-300 text-slate-800'}`}>
                {aiResult.ran ? (
                  <>
                    <div className="flex items-center justify-between gap-2 font-bold">
                      <span className="flex items-center gap-1.5 text-sky-900">
                        <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>{aiResult.verified ? 'AI assessment: looks like flooding' : 'AI assessment: could not confirm flooding'} ({Math.round(aiResult.confidenceScore * 100)}% model certainty)</span>
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sky-200/80 text-sky-900 font-bold shrink-0">~{aiResult.estimatedDepthCm} cm</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white/80 border border-sky-200 text-xs space-y-1">
                      <div className="text-slate-700">
                        <b>Photo authenticity:</b> {aiResult.appearsAuthentic === true ? 'looks genuine' : aiResult.appearsAuthentic === false ? 'looks suspicious' : 'model could not tell'}. This is an opinion, not proof.
                      </div>
                      {aiResult.detectedHazards.length > 0 && <div className="text-slate-700"><b>Hazards seen:</b> {aiResult.detectedHazards.join(', ')}</div>}
                      <p className="text-slate-600 italic">"{aiResult.notes}"</p>
                    </div>
                  </>
                ) : (
                  <div className="flex items-start gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" aria-hidden="true" />
                    <span>AI check not run. {aiResult.notes}</span>
                  </div>
                )}
                <div className="text-xs text-slate-600 text-right font-medium">{aiResult.engine}</div>
              </div>
            )}
          </div>

          {/* Submission Info Notice */}
          <div className="text-xs text-slate-500 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#1677FF] shrink-0 mt-0.5" />
            <span>
              <b>Workflow:</b> The report is saved as <b>unverified</b>. It is marked <b>AI assessed</b> only if you run the AI check above and it judges the photo to show flooding. No agency reviews it in this demo.
            </span>
          </div>

          {saveNote && <p role="status" className="text-xs font-semibold text-amber-700">{saveNote}</p>}

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit for Verification</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
