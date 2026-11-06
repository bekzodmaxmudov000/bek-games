import { memo } from 'react';
import { motion } from 'framer-motion';
import { gameRoute } from '../games/registry';
import type { GameModule } from '../games/types';
import FavButton from './FavButton';

function GameCard({ game }: { game: GameModule }) {
  const { Icon } = game;
  return (
    <motion.div whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="glass group relative overflow-hidden rounded-3xl transition-shadow duration-300 hover:border-neon/50 hover:shadow-neon-lg">
      <a href={gameRoute(game)} className="flex h-full flex-col">
        <div className="relative grid h-40 place-items-center overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${game.hue[0]}cc, ${game.hue[1]}88)` }}>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
          <Icon className="relative h-20 w-20 text-white drop-shadow-[0_0_18px_rgba(255,255,255,.35)] transition-transform duration-300 group-hover:scale-110" />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-5">
          <div>
            <h3 className="font-display text-lg font-semibold">{game.title}</h3>
            <p className="mt-1 text-sm text-muted">{game.tagline}</p>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {game.categories.map((c) => <span key={c} className="pill">{c}</span>)}
          </div>
        </div>
      </a>
      <FavButton id={game.id} className="absolute right-3 top-3" />
    </motion.div>
  );
}

export default memo(GameCard);
