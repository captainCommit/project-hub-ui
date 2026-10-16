// Row brand mark (public/row-logo.jpeg, also the browser tab icon).
export default function BrandLogo({ className = 'w-11 h-11' }) {
  return <img src="/row-logo.jpeg" alt="Row logo" className={`${className} object-contain`} draggable={false} />;
}
