import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { SeoSettings } from '../../types';
import { API_URL, apiRequest } from '../../services/api';
import { readStorageObject } from '../../services/storage';

export function Seo({ title, description, canonical, structuredData, productSeo }: { title: string; description: string; canonical?: string; structuredData?: object; productSeo?: Partial<SeoSettings> }) {
  const location = useLocation();
  const [serverSeo, setServerSeo] = useState<Partial<SeoSettings>>({});
  useEffect(() => {
    if (!API_URL || location.pathname.startsWith('/product/')) return;
    const slugs: Record<string, string> = { '/': 'home', '/about-us': 'about-us', '/contact-us': 'contact-us', '/privacy-policy': 'privacy-policy', '/refund-policy': 'refund-policy', '/terms': 'terms-of-use' };
    const slug = slugs[location.pathname];
    if (!slug) { setServerSeo({}); return; }
    let current = true;
    type PageMeta = { metaTitle?: string | null; metaDescription?: string | null; focusKeywords?: string | null; canonicalUrl?: string | null; ogImage?: string | null };
    void apiRequest<PageMeta>(`/pages/${slug}`).then(remote => {
      if (current) setServerSeo({ title: remote.metaTitle || undefined, description: remote.metaDescription || undefined, keywords: remote.focusKeywords || undefined, canonical: remote.canonicalUrl || undefined, ogImage: remote.ogImage || undefined });
    }).catch(() => { if (current) setServerSeo({}); });
    return () => { current = false; };
  }, [location.pathname]);
  let stored: Partial<SeoSettings> = {};
  if (location.pathname === '/') stored = readStorageObject('andra:seo') as Partial<SeoSettings>;
  else if (!location.pathname.startsWith('/product/')) {
    const labels: Record<string, string> = { '/about-us': 'About Us', '/contact-us': 'Contact Us', '/privacy-policy': 'Privacy Policy', '/refund-policy': 'Refund Policy', '/terms': 'Terms of Use' };
    const candidate = readStorageObject('andra:page-seo')[labels[location.pathname] || ''];
    stored = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate as Partial<SeoSettings> : {};
  }
  const safeStored = Object.fromEntries(Object.entries(stored).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) as Partial<SeoSettings>;
  const settings = { ...serverSeo, ...safeStored, ...productSeo };
  const pageTitle = settings.title || title;
  const pageDescription = settings.description || description;
  const pageCanonical = settings.canonical || canonical;
  const fullTitle = `${pageTitle} | Andra Books`;
  return <Helmet>
    <title>{fullTitle}</title><meta name="description" content={pageDescription}/>
    {settings.keywords && <meta name="keywords" content={settings.keywords}/>}
    {pageCanonical && <link rel="canonical" href={pageCanonical}/>}
    <meta property="og:title" content={pageTitle}/><meta property="og:description" content={pageDescription}/>
    {(settings.ogImage || productSeo?.ogImage) && <meta property="og:image" content={settings.ogImage || productSeo?.ogImage}/>}<meta property="og:type" content="website"/>
    {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
  </Helmet>;
}
