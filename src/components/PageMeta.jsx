import { useEffect } from 'react';

export default function PageMeta({ title, description, canonical, noIndex = false }) {
  useEffect(() => {
    document.title = `${title} | Ammi Maju`;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const openGraphTitle = document.querySelector('meta[property="og:title"]');
    const openGraphDescription = document.querySelector('meta[property="og:description"]');
    let canonicalTag = document.querySelector('link[rel="canonical"]');
    if (!canonicalTag) {
      canonicalTag = document.createElement('link');
      canonicalTag.rel = 'canonical';
      document.head.append(canonicalTag);
    }
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (!robotsTag) {
      robotsTag = document.createElement('meta');
      robotsTag.name = 'robots';
      document.head.append(robotsTag);
    }
    if (descriptionTag) descriptionTag.content = description;
    if (openGraphTitle) openGraphTitle.content = `${title} | Ammi Maju`;
    if (openGraphDescription) openGraphDescription.content = description;
    if (canonicalTag) canonicalTag.href = canonical || window.location.href.split(/[?#]/)[0];
    robotsTag.content = noIndex ? 'noindex, nofollow' : 'index, follow';
  }, [title, description, canonical, noIndex]);
  return null;
}
