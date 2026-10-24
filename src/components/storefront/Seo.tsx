import { Helmet } from 'react-helmet-async';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { SeoSettings } from '../../types';
import { API_URL, apiRequest } from '../../services/api';

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
  try {
    if (location.pathname === '/') stored = JSON.parse(localStorage.getItem('andra:seo') || '{}') as Partial<SeoSettings>;
    else if (!location.pathname.startsWith('/product/')) {
      const labels: Record<string, string> = { '/about-us': 'About Us', '/contact-us': 'Contact Us', '/privacy-policy': 'Privacy Policy', '/refund-policy': 'Refund Policy', '/terms': 'Terms of Use' };
      const all = JSON.parse(localStorage.getItem('andra:page-seo') || '{}') as Record<string, Partial<SeoSettings>>;
      stored = all[labels[location.pathname] || ''] || {};
    }
  } catch { /* Defaults below remain available if saved data is malformed. */ }
  const settings = { ...serverSeo, ...stored, ...productSeo };
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
