import Image from "next/image";

interface CineNovaIconProps {
  size?: number;
  className?: string;
}

/**
 * CineNova Modern Icon combining:
 * - "C": Cinematic filmstrip arc (in electric blue and gold with film perforations)
 * - "N": 3D geometric ribbon with Nova shining star flare
 */
export function CineNovaIcon({ size = 42, className }: CineNovaIconProps) {
  const borderRadius = Math.round(size * 0.28);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${borderRadius}px`,
        overflow: "hidden",
        boxShadow: "0 0 20px rgba(56, 189, 248, 0.4), 0 0 12px rgba(245, 158, 11, 0.3)",
        border: "1px solid rgba(255, 255, 255, 0.16)",
        background: "#0c1322",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Image
        src="/cinenova-logo.png"
        alt="CineNova CN Filmstrip Logo"
        width={Math.round(size * 1.3)}
        height={Math.round(size * 1.3)}
        priority
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scale(1.24)",
        }}
      />
    </div>
  );
}
