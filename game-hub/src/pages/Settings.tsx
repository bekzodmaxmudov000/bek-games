import { useState, type ReactNode } from 'react';
import { sfx } from '../audio/engine';
import { Segmented, SettingRow, Slider, Toggle } from '../components/Controls';
import { GhostButton, PrimaryButton } from '../components/GameKit';
import { resetSettings, updateSettings, type Motion } from '../settings/store';
import { useSettings } from '../settings/useSettings';

const MOTION_OPTIONS: { id: Motion; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Reduced' },
  { id: 'off', label: 'Off' },
];
const MOTION_HINT: Record<Motion, string> = {
  system: 'Follows your device’s reduced-motion setting.',
  full: 'All animations and transitions.',
  reduced: 'No movement or zoom effects, only gentle fades.',
  off: 'No animations or transitions at all.',
};

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass rounded-3xl px-5 py-2 md:px-7">
      <h2 className="border-b border-white/10 py-4 font-display text-lg font-semibold">{title}</h2>
      <div className="divide-y divide-white/10">{children}</div>
    </section>
  );
}

export default function Settings() {
  const s = useSettings();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="mt-2 text-muted">Saved on this device and applied to every game.</p>
      </div>

      <Card title="Sound">
        <SettingRow title="Sound effects" hint="Moves, captures, wins and other game events.">
          <Toggle checked={s.sfx} onChange={(v) => { updateSettings({ sfx: v }); if (v) sfx('click'); }} label="Sound effects" />
        </SettingRow>
        <SettingRow title="Effects volume">
          <div className="flex items-center gap-3">
            <Slider value={s.sfxVolume} onChange={(v) => updateSettings({ sfxVolume: v })} label="Sound effects volume" disabled={!s.sfx} />
          </div>
        </SettingRow>
        <SettingRow title="Test sound" hint="Plays a short sample at the current volume.">
          <GhostButton onClick={() => sfx('achievement')} disabled={!s.sfx || s.sfxVolume === 0}>Play sample</GhostButton>
        </SettingRow>
        <SettingRow title="Background music" hint="Calm ambient pads generated in your browser. No audio files.">
          <Toggle checked={s.music} onChange={(v) => updateSettings({ music: v })} label="Background music" />
        </SettingRow>
        <SettingRow title="Music volume">
          <Slider value={s.musicVolume} onChange={(v) => updateSettings({ musicVolume: v })} label="Music volume" disabled={!s.music} />
        </SettingRow>
      </Card>

      <Card title="Motion">
        <SettingRow title="Animations" hint={MOTION_HINT[s.motion]}>
          <Segmented label="Animations" value={s.motion} options={MOTION_OPTIONS} onChange={(motion) => updateSettings({ motion })} />
        </SettingRow>
      </Card>

      <Card title="Reset">
        <SettingRow title="Restore defaults" hint="Resets sound and motion settings. Your profile, XP and history stay.">
          {confirming ? (
            <div className="flex flex-wrap items-center gap-3" role="alertdialog" aria-label="Confirm reset">
              <PrimaryButton onClick={() => { resetSettings(); setConfirming(false); }}>Yes, reset</PrimaryButton>
              <GhostButton onClick={() => setConfirming(false)}>Cancel</GhostButton>
            </div>
          ) : (
            <GhostButton onClick={() => setConfirming(true)}>Reset settings</GhostButton>
          )}
        </SettingRow>
      </Card>
    </div>
  );
}
