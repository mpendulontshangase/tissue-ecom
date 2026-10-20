import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20">
      <h1 className="font-serif text-4xl">That page is not on the shelf.</h1>
      <Link href="/" className="mt-6 inline-flex min-h-12 items-center font-semibold text-pine">
        Back to Softmill
      </Link>
    </div>
  );
}
