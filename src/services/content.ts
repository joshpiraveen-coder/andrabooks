import { useEffect, useState } from 'react';
import { API_URL, apiRequest } from './api';
import { readStorageObject } from './storage';

export function savedPageContent(page: string): string {
  const value = readStorageObject('andra:pages')[page];
  return typeof value === 'string' ? value.trim() : '';
}

export function savedParagraphs(page: string): string[] {
  return savedPageContent(page).split(/\n+/).map(line => line.trim()).filter(Boolean);
}

export function useCmsPage(page: string, slug: string): string {
  const [content, setContent] = useState(() => savedPageContent(page));
  useEffect(() => {
    if (!API_URL) return;
    type CmsPage = { content?: { body?: unknown } | string; metaTitle?: string | null; metaDescription?: string | null; focusKeywords?: string | null; canonicalUrl?: string | null; ogImage?: string | null };
    void apiRequest<CmsPage>(`/pages/${slug}`).then(remote => {
      const body = typeof remote.content === 'string' ? remote.content : typeof remote.content?.body === 'string' ? remote.content.body : '';
      if (body) { const all = readStorageObject('andra:pages'); all[page] = body; localStorage.setItem('andra:pages', JSON.stringify(all)); setContent(body); }
      if (remote.metaTitle || remote.metaDescription || remote.focusKeywords || remote.canonicalUrl || remote.ogImage) {
        const all = readStorageObject('andra:page-seo');
        all[page] = { title: remote.metaTitle || '', description: remote.metaDescription || '', keywords: remote.focusKeywords || '', canonical: remote.canonicalUrl || '', ogImage: remote.ogImage || '' };
        localStorage.setItem('andra:page-seo', JSON.stringify(all));
      }
    }).catch(() => undefined);
  }, [page, slug]);
  return content;
}
