interface OutcomeToggleProps {
  side: 'yes' | 'no';
  onChange: (side: 'yes' | 'no') => void;
}

export function OutcomeToggle({ side, onChange }: OutcomeToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => onChange('yes')}
        className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
          side === 'yes'
            ? 'bg-green-600 text-white'
            : 'bg-[#24243a] text-gray-400 hover:text-white'
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
          side === 'no'
            ? 'bg-red-600 text-white'
            : 'bg-[#24243a] text-gray-400 hover:text-white'
        }`}
      >
        No
      </button>
    </div>
  );
}
