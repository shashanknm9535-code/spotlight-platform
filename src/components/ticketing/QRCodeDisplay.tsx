import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a standard, ISO-compliant QR Code for Spotlight tickets using qrcode.react.
 * Includes quiet zone (margin) and high contrast colors for optical scanner detection.
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 200,
  className = '',
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center p-4 bg-white border-2 border-amber-400 shadow-[0_0_25px_rgba(250,204,21,0.25)] rounded-sm ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        includeMargin={true}
        fgColor="#000000"
        bgColor="#FFFFFF"
      />
    </div>
  );
};
