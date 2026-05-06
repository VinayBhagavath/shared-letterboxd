import { Film } from './Icons.jsx';

export default function EmptyState({ title, body, hint }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center p-10 sm:p-14 animate-fade-in">
      <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-orange/15 text-accent-orange">
        <Film size={26} />
      </span>
      <h2 className="mt-4 font-display text-xl font-bold">{title}</h2>
      {body && <p className="mt-1 max-w-md text-ink-300">{body}</p>}
      {hint && <p className="mt-4 text-sm text-ink-400">{hint}</p>}
    </div>
  );
}
