"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-serif text-4xl">Something went wrong.</h1>
      <p className="mt-3 text-sm text-bark">Try the page again. If it keeps failing, the database may be unavailable.</p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex min-h-12 items-center rounded-full bg-pine px-5 font-semibold text-foam"
      >
        Try again
      </button>
    </div>
  );
}
