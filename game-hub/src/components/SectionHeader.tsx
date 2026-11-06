export default function SectionHeader({ title, href, link = 'View all games' }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-display text-xl font-semibold md:text-2xl">{title}</h2>
      {href && <a href={href} className="text-sm text-neon hover:text-fg">{link}</a>}
    </div>
  );
}
