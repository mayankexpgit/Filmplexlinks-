import LinkShortener from '@/components/link-shortener';
import Header from '@/components/layout/header';

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center pt-24 pb-12">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-primary">
              Shorten Your Links
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              A simple, fast, and reliable link shortener. Paste your long URL below to create a short link in seconds.
            </p>
          </div>

          <div className="w-full max-w-2xl mt-10">
            <LinkShortener />
          </div>
        </div>
      </main>
    </div>
  );
}
