import React, { useEffect, useRef, useState } from 'react';
import type { Html5Qrcode as Html5QrcodeType } from 'html5-qrcode';
import { Camera, CameraOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface QRScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  isPaused?: boolean;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  onScanSuccess,
  isPaused = false,
}) => {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isPermissionDenied, setIsPermissionDenied] = useState<boolean>(false);
  const scannerRef = useRef<Html5QrcodeType | null>(null);
  const containerId = 'qr-reader-viewport';
  const isPausedRef = useRef(isPaused);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const startScanner = async () => {
    setIsInitializing(true);
    setCameraError(null);
    setIsPermissionDenied(false);

    try {
      // Dynamic import of html5-qrcode library so it is only loaded on camera start
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      // Clean up existing instance if present
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      const html5Qrcode = new Html5Qrcode(containerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5Qrcode;

      const qrConfig = {
        fps: 10,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minEdge * 0.75);
          return { width: Math.max(size, 200), height: Math.max(size, 200) };
        },
        aspectRatio: 1.0,
      };

      const onScan = (decodedText: string) => {
        if (isPausedRef.current) return;
        onScanSuccess(decodedText);
      };

      // Try facingMode: "environment" (rear camera on mobile)
      await html5Qrcode.start(
        { facingMode: 'environment' },
        qrConfig,
        onScan,
        () => {} // Ignore scan failure callbacks for frame-by-frame decoding
      );

      setIsInitializing(false);
    } catch (err: any) {
      console.warn('[QRScannerView] Failed with facingMode environment, trying user/fallback:', err);

      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        // Fallback to any available video input
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const cameraId = devices[0].id;
          if (scannerRef.current) {
            await scannerRef.current.start(
              cameraId,
              {
                fps: 10,
                qrbox: { width: 220, height: 220 },
              },
              (decodedText: string) => {
                if (isPausedRef.current) return;
                onScanSuccess(decodedText);
              },
              () => {}
            );
            setIsInitializing(false);
            return;
          }
        }
      } catch (fallbackErr: any) {
        console.error('[QRScannerView] Camera access failed completely:', fallbackErr);
      }

      setIsInitializing(false);
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('notallowederror')) {
        setIsPermissionDenied(true);
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (errMsg.toLowerCase().includes('notfounderror') || errMsg.toLowerCase().includes('no media')) {
        setCameraError('No camera device found on this system.');
      } else {
        setCameraError(errMsg || 'Failed to initialize camera.');
      }
    }
  };

  useEffect(() => {
    let mounted = true;

    // Small delay to ensure DOM container element is ready
    const timer = setTimeout(() => {
      if (mounted) {
        startScanner();
      }
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((e) => console.warn('Error stopping scanner:', e));
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full overflow-hidden bg-[#0A0A10] border border-[#1E1E2C] rounded-lg">
      {/* CAMERA VIEWPORT CONTAINER */}
      <div className="relative min-h-[300px] sm:min-h-[380px] w-full flex items-center justify-center bg-black">
        <div id={containerId} className="w-full max-w-md mx-auto" />

        {/* INITIALIZING OVERLAY */}
        {isInitializing && (
          <div className="absolute inset-0 z-20 bg-[#08080C] flex flex-col items-center justify-center p-6 space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
            <p className="text-xs font-mono text-zinc-400 tracking-wider">REQUESTING CAMERA PERMISSION...</p>
          </div>
        )}

        {/* ERROR OVERLAY */}
        {cameraError && !isInitializing && (
          <div className="absolute inset-0 z-20 bg-[#08080C]/95 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/40 text-red-400 flex items-center justify-center rounded-full">
              {isPermissionDenied ? <CameraOff className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
            <div>
              <h4 className="text-sm font-display font-bold text-white uppercase tracking-wide">
                {isPermissionDenied ? 'CAMERA PERMISSION DENIED' : 'CAMERA UNAVAILABLE'}
              </h4>
              <p className="text-xs font-mono text-zinc-400 mt-2 max-w-xs leading-relaxed">
                {cameraError}
              </p>
            </div>
            <Button
              type="button"
              onClick={startScanner}
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Retry Camera Access
            </Button>
          </div>
        )}

        {/* SCANNER OVERLAY / TARGET FRAME (when active) */}
        {!isInitializing && !cameraError && (
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between p-4">
            {/* Top instruction badge */}
            <div className="px-3 py-1.5 bg-black/70 backdrop-blur-md border border-amber-400/30 text-amber-400 text-[11px] font-mono uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-3.5 h-3.5 animate-pulse" />
              <span>POINT CAMERA AT TICKET QR</span>
            </div>

            {/* Scanning viewfinder square guides */}
            <div className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 border-amber-400/40 my-auto">
              {/* Corner target highlights */}
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-amber-400" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-amber-400" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-amber-400" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-amber-400" />

              {/* Animated scanning laser line */}
              {!isPaused && (
                <div className="absolute inset-x-2 top-2 h-0.5 bg-amber-400 shadow-[0_0_12px_#FACC15] animate-bounce" />
              )}
            </div>

            {/* Bottom status text */}
            <div className="px-3 py-1 bg-black/70 backdrop-blur-md text-zinc-400 text-[10px] font-mono uppercase">
              {isPaused ? 'PROCESSING SCAN...' : 'LIVE SCANNER ACTIVE'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
