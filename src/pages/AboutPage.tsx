import { useState } from 'react';
import { BookOpen, Heart, Sparkles } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Seo } from '../components/storefront/Seo';
import { useCmsPage } from '../services/content';

function AboutShopImage({ imageUrl }: { imageUrl?: string }) {
  const fallback = '/images/andra-storefront.jpg';
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = imageUrl && imageUrl !== failedUrl ? imageUrl : fallback;
  return <img className="about-shop-photo" src={source} alt={source === fallback ? "Illustration of a colorful children's bookstore" : 'Andra Books storefront'} onError={() => { if (source !== fallback) setFailedUrl(source); }}/>
}

export function AboutPage() {
  const { settings } = useStore();
  const customCopy = useCmsPage('About Us', 'about-us').split(/\n+/).map(line => line.trim()).filter(Boolean);
  return <main className="about-page"><Seo title="About Andra Books" description="Learn about Andra Books, our love of reading and our curated collection of Tamil and English children's books."/>
    <section className="about-intro"><div className="container about-intro-grid"><div><span className="eyebrow">SOME WORDS ABOUT US</span><h1>Bringing stories,<br/>culture, and colors<br/>to your family</h1></div><div className="about-pillar"><BookOpen/><h2>Passion for Reading</h2><p>We believe every child deserves to find joy in a good book, whether they are coloring their first masterpiece or sounding out their very first words.</p></div><div className="about-pillar"><Sparkles/><h2>Carefully Curated</h2><p>We handpick high-quality printed coloring books and engaging stories in both Tamil and English to spark imagination and celebrate culture.</p></div></div></section>
    <section className="container about-story"><AboutShopImage imageUrl={settings.aboutImageUrl}/><div><span className="eyebrow">YOUR FAMILY BOOKSTORE</span><h2>About our online store</h2>{customCopy.length ? customCopy.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <><p>Welcome to Andra Books! We are a dedicated online bookstore passionate about bringing physical, printed books back into the hands of readers. From vibrant children's coloring books to captivating stories, we have something to inspire every growing mind.</p><p>We proudly specialize in a diverse collection of Tamil and English books. Whether you are looking to connect your children with their cultural heritage, support bilingual learning, or simply get lost in a wonderful English tale, our carefully selected shelves have you covered.</p><p>Our mission is to make reading and creativity an exciting daily habit. We believe that turning a physical page and coloring outside the lines are experiences that screens just can't replace. Browse our latest collections and find your family's next favorite book today.</p></>}<div className="about-heartline"><Heart fill="currentColor"/> Read together. Grow together.</div></div></section>
  </main>;
}
