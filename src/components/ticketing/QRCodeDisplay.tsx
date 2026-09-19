import React, { useMemo } from 'react';

export interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Generates a deterministic SVG QR-like code matrix for ticket string.
 */
export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  className = '',
}) => {
  // Generate a deterministic 21x21 matrix based on input hash
  const matrix = useMemo(() => {
    const gridSize = 21;
    const grid: boolean[][] = Array.from({ length: gridSize }, () =>
      Array(gridSize).fill(false)
    );

    // Simple hash function for seed
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }

    // Helper for seed pseudo-random
    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    let seedCounter = Math.abs(hash);

    // Fill grid pseudo-randomly
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        grid[r][c] = pseudoRandom(seedCounter++) > 0.45;
      }
    }

    // Add standard 3 corner finder patterns (7x7)
    const addFinderPattern = (startR: number, startC: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 ||
            r === 6 ||
            c === 0 ||
            c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[startR + r][startC + c] = true;
          } else {
            grid[startR + r][startC + c] = false;
          }
        }
      }
    };

    addFinderPattern(0, 0); // Top-left
    addFinderPattern(0, gridSize - 7); // Top-right
    addFinderPattern(gridSize - 7, 0); // Bottom-left

    return grid;
  }, [value]);

  const gridSize = matrix.length;
  const cellSize = size / (gridSize + 2); // padding of 1 cell around

  return (
    <div
      className={`inline-block p-3 bg-white border-2 border-amber-400 shadow-[0_0_25px_rgba(250,204,21,0.25)] ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${size} ${size}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width={size} height={size} fill="#FFFFFF" />
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            if (!cell) return null;
            const x = (c + 1) * cellSize;
            const y = (r + 1) * cellSize;
            return (
              <rect
                key={`${r}-${c}`}
                x={x}
                y={y}
                width={cellSize + 0.3}
                height={cellSize + 0.3}
                fill="#08080C"
              />
            );
          })
        )}
      </svg>
    </div>
  );
};
