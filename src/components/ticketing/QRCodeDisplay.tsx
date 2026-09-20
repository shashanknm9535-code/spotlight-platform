import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a standard, ISO-compliant QR Code for Spotlight tickets using qrcode.react.
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  className = '',
}) => {
  return (
    <div
      className={`inline-block p-3 bg-white border-2 border-amber-400 shadow-[0_0_25px_rgba(250,204,21,0.25)] ${className}`}
      style={{ width: size, height: size }}
    >
      <QRCodeSVG
        value={value}
        size={size - 24} // Account for padding
        level="M"
        includeMargin={false}
        fgColor="#08080C"
        bgColor="#FFFFFF"
      />
    </div>
  );
};
