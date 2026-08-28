export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div
        className="w-8 h-8 rounded-full border-2 border-brand/25 border-t-brand animate-spin"
        aria-label="Carregando"
      />
    </div>
  );
}
