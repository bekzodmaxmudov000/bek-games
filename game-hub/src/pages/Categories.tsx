import CategoryGrid from '../components/CategoryGrid';

export default function Categories() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Categories</h1>
      <p className="mb-8 mt-2 text-muted">Pick a category to see its games.</p>
      <CategoryGrid />
    </div>
  );
}
