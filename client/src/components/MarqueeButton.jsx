export default function MarqueeButton({ as: Component = 'button', className = '', children, ...props }) {
  return (
    <Component className={`marquee-btn ${className}`} {...props}>
      <span className="marquee-btn__label">{children}</span>
    </Component>
  );
}
