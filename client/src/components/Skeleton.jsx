/**
 * Reusable Skeleton placeholder component for simulating content loading states,
 * supporting text lines, avatars/circles, rectangles, and card skeletons.
 */
export default function Skeleton({
  variant = "text",
  width,
  height,
  count = 1,
  animated = true,
  className = "",
  style = {},
  ...rest
}) {
  const variantClass = `skeleton-${variant}`;
  const animatedClass = animated ? "skeleton-animated" : "";

  const customStyle = {
    ...(width !== undefined
      ? { width: typeof width === "number" ? `${width}px` : width }
      : {}),
    ...(height !== undefined
      ? { height: typeof height === "number" ? `${height}px` : height }
      : {}),
    ...style,
  };

  if (variant === "card") {
    return (
      <div
        className={`skeleton-card ${animatedClass} ${className}`.trim()}
        style={customStyle}
        aria-hidden="true"
        {...rest}
      >
        <div className="skeleton skeleton-rectangular skeleton-card-image" />
        <div className="skeleton-card-content">
          <div className="skeleton skeleton-text skeleton-card-title" />
          <div className="skeleton skeleton-text skeleton-card-line" />
          <div className="skeleton skeleton-text skeleton-card-subline" />
        </div>
      </div>
    );
  }

  if (count > 1) {
    return (
      <div className="skeleton-group" aria-hidden="true" {...rest}>
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`skeleton ${variantClass} ${animatedClass} ${className}`.trim()}
            style={{
              ...customStyle,
              // Slightly vary width of the last line for natural text appearance
              ...(variant === "text" && index === count - 1 && !width
                ? { width: "70%" }
                : {}),
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`skeleton ${variantClass} ${animatedClass} ${className}`.trim()}
      style={customStyle}
      aria-hidden="true"
      {...rest}
    />
  );
}
