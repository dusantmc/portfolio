import type * as THREE from 'three';

interface ExportButtonProps {
  glRef: React.RefObject<THREE.WebGLRenderer | null>;
}

/**
 * Downloads the current canvas frame as a transparent PNG.
 *
 * Requires the Canvas to have been created with:
 *   gl={{ preserveDrawingBuffer: true, alpha: true }}
 *
 * toDataURL() captures the last rendered frame without needing
 * an extra render call — preserveDrawingBuffer keeps it in the GPU buffer.
 */
export default function ExportButton({ glRef }: ExportButtonProps) {
  const handleExport = () => {
    const renderer = glRef.current;
    if (!renderer) return;

    const dataURL = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'badge.png';
    a.click();
  };

  return (
    <button
      onClick={handleExport}
      style={{
        position: 'absolute',
        bottom: '32px',
        right: '32px',
        padding: '10px 20px',
        background: 'rgba(255, 255, 255, 0.12)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '999px',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        transition: 'background 0.2s ease',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255, 255, 255, 0.22)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background =
          'rgba(255, 255, 255, 0.12)';
      }}
    >
      Export PNG
    </button>
  );
}
