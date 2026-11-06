import { updateSettings } from '../settings/store';
import { useSettings } from '../settings/useSettings';
import { SpeakerIcon, SpeakerOffIcon } from './Icons';

/** Quick mute for sound effects (full controls live on the Settings page). */
export default function SoundToggle() {
  const { sfx } = useSettings();
  const Icon = sfx ? SpeakerIcon : SpeakerOffIcon;
  return (
    <button type="button" aria-pressed={sfx} aria-label={sfx ? 'Mute sound effects' : 'Unmute sound effects'} onClick={() => updateSettings({ sfx: !sfx })}
      className={`glass grid h-10 w-10 place-items-center rounded-full transition-colors hover:border-neon/50 ${sfx ? 'text-fg' : 'text-muted'}`}>
      <Icon width={20} height={20} />
    </button>
  );
}
