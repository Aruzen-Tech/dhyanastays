interface Props {
  message: string;
  onRetry: () => void;
}

export default function ExperienceErrorState({ message, onRetry }: Props) {
  return (
    <div className="py-24 px-6 text-center" role="alert">
      <span className="mb-5 inline-flex h-16 w-16 items-center justify-center rounded-full bg-error/10 text-2xl text-error">
        ⚠️
      </span>
      <h3 className="mb-2 text-xl font-semibold text-gray-900">Unable to load experiences</h3>
      <p className="mx-auto max-w-sm text-sm leading-relaxed text-gray-500">{message}</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-6">
        Try again
      </button>
    </div>
  );
}
