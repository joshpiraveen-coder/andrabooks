import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/storefront/ProductCard';
import { Seo } from '../components/storefront/Seo';
import { useCmsPage } from '../services/content';

export function WishlistPage() {
  const { products, wishlist } = useStore();
  const items = products.filter(p => wishlist.includes(p.id));
  return <main className="container collection-page"><Seo title="Wishlist" description="Your saved books at Andra Books."/><h1 className="page-heading">My wishlist</h1>{items.length ? <div className="home-product-grid">{items.map(p => <ProductCard key={p.id} product={p}/>)}</div> : <div className="no-results"><h2>Your wishlist is waiting for a good book.</h2><p>Save a book you love and find it here later.</p><Link to="/shop" className="pill-button">EXPLORE BOOKS</Link></div>}</main>;
}

export function ComparePage() {
  const { products, compare, toggleCompare, addToCart } = useStore();
  const items = products.filter(p => compare.includes(p.id));
  return <main className="container collection-page"><Seo title="Compare books" description="Compare the details of books at Andra Books."/><h1 className="page-heading">Compare books</h1>{items.length ? <div className="compare-grid">{items.map(p => <article className="compare-card" key={p.id}><button className="remove-button compare-remove" aria-label={`Remove ${p.name} from compare`} onClick={() => toggleCompare(p.id)}>×</button><div className="mini-cover large" style={{ background: p.accent }}>{p.name.slice(0, 1)}</div><h2>{p.name}</h2><span>{p.category}</span><strong>Rs.{p.price.toFixed(2)}</strong><span>{p.stock ? 'In stock' : 'Out of stock'}</span><button className="add-cart-button" onClick={() => addToCart(p.id)}>ADD TO CART</button></article>)}</div> : <div className="no-results"><h2>No books to compare yet.</h2><p>Add up to four titles using the compare icon on any book.</p><Link to="/shop" className="pill-button">BROWSE BOOKS</Link></div>}</main>;
}

export function StaticPage({ page }: { page: string }) {
  const titles: Record<string, string> = { 'privacy-policy': 'Privacy Policy', 'refund-policy': 'Refund and Returns Policy', terms: 'Terms of use', faqs: 'Frequently Asked Questions', 'track-order': 'Track My Order' };
  const title = titles[page] || 'Andra Books';
  const pageLabel: Record<string, string> = { 'privacy-policy': 'Privacy Policy', 'refund-policy': 'Refund Policy', terms: 'Terms of Use' };
  const pageContent = useCmsPage(pageLabel[page] || '', page === 'terms' ? 'terms-of-use' : page);
  const customCopy = pageContent.split(/\n+/).map(line => line.trim()).filter(Boolean);
  return <main className="container static-page"><Seo title={title} description={`${title} for Andra Books customers.`}/><span className="eyebrow">ANDRA BOOKS</span><h1>{title}</h1>{page === 'faqs' ? <div className="faq-list"><details><summary>Where do you deliver?</summary><p>We deliver across Sri Lanka. Delivery times and charges are confirmed when our team contacts you about your order.</p></details><details><summary>How can I pay?</summary><p>Choose Cash on Delivery at checkout, or request an online payment link when we confirm your order.</p></details><details><summary>Can I return a book?</summary><p>Please contact our team within 7 days of delivery if a book is damaged or you have a concern.</p></details></div> : page === 'track-order' ? <p>To check an order, contact us with your order number at <a href="tel:+94776622981">+94 77 662 2981</a> or use the <Link to="/contact-us">contact form</Link>.</p> : customCopy.length ? customCopy.map((paragraph, index) => <p key={index}>{paragraph}</p>) : <><p>At Andra Books, we care about the trust you place in us. We use the information you share to process orders, arrange delivery, respond to your questions and improve your shopping experience.</p><p>We collect only the information needed to provide our services. We do not sell your personal information. You can contact our team if you have questions about your details, an order, or our store policies.</p><p>For help, please reach us through our <Link to="/contact-us">Contact Us</Link> page.</p></>}</main>;
}
