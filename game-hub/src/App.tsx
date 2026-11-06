import { Suspense, lazy, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { initAudio } from './audio/engine';
import { useRoute } from './lib/router';
import BottomNav from './components/BottomNav';
import Footer from './components/Footer';
import LoadingState from './components/LoadingState';
import MotionProvider from './components/MotionProvider';
import RewardToast from './components/RewardToast';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Categories from './pages/Categories';
import Explore from './pages/Explore';
import Favorites from './pages/Favorites';
import Home from './pages/Home';
import Play from './pages/Play';

const Online = lazy(() => import('./pages/Online'));
const History = lazy(() => import('./pages/History'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));

export default function App() {
  const route = useRoute();
  const [query, setQuery] = useState('');
  const active = route.name === 'play' ? 'explore' : route.name;
  useEffect(initAudio, []);
  const key = route.name === 'play' ? `play-${route.id}` : route.name;

  return (
    <MotionProvider>
      <Sidebar active={active} />
      <div className="pb-24 md:pb-0 md:pl-20 lg:pl-64">
        <TopBar query={query} onQuery={setQuery} showSearch={route.name !== 'explore'} />
        <AnimatePresence mode="wait">
          <motion.main key={key} className="mx-auto max-w-6xl px-5 py-6 md:px-8"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <Suspense fallback={<LoadingState />}>
            {route.name === 'home' && <Home />}
            {route.name === 'categories' && <Categories />}
            {route.name === 'explore' && <Explore categorySlugParam={route.category} query={query} onQuery={setQuery} />}
            {route.name === 'play' && <Play id={route.id} />}
            {route.name === 'favorites' && <Favorites />}
            {route.name === 'history' && <History />}
            {route.name === 'leaderboard' && <Leaderboard />}
            {route.name === 'profile' && <Profile />}
            {route.name === 'settings' && <Settings />}
            {route.name === 'online' && <Online code={route.code} />}
            </Suspense>
          </motion.main>
        </AnimatePresence>
        <Footer />
      </div>
      <BottomNav active={active} />
      <RewardToast />
    </MotionProvider>
  );
}
