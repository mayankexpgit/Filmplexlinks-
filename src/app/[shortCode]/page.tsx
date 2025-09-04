'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit, Timestamp } from 'firebase/firestore';
import NotFound from '../not-found';
import { Button } from '@/components/ui/button';
import { Loader2, Server, PlayCircle, Link as LinkIcon, Link2, ShieldCheck, CheckCircle, Instagram, Send } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import AdPlayer from '@/components/ad-player';

type LinkData = {
  longUrl: string;
  shortUrl: string;
  expiresAt?: Timestamp;
};

// This function now also checks for expiration
async function getLink(shortCode: string): Promise<LinkData | null> {
  const linksRef = collection(db, 'links');
  
  // This query is more efficient as it looks for the unique short code
  const q = query(linksRef, where('shortUrl', 'like', `%/${shortCode}`), limit(1));
  const querySnapshot = await getDocs(q);

  let foundData: LinkData | null = null;

  if (!querySnapshot.empty) {
     const doc = querySnapshot.docs[0];
     const data = doc.data() as LinkData;
     // Final verification to ensure it's an exact match
     if (data.shortUrl.endsWith(`/${shortCode}`)) {
        foundData = data;
     }
  }

  // Check for expiration
  if (foundData && foundData.expiresAt) {
    const now = Timestamp.now();
    if (foundData.expiresAt < now) {
      console.log("Link has expired.");
      return null; // Treat expired link as not found
    }
  }
  
  return foundData;
}


const INITIAL_TIMER_DURATION = 10;

function FeatureCard({ icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
  const Icon = icon;
  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className="flex items-center justify-center w-16 h-16 mb-4 bg-primary/10 text-primary rounded-full">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function CircularProgressButton({ progress, countdown, onClick, disabled }: { progress: number, countdown: number, onClick: () => void, disabled: boolean }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-32 h-32 transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth="8"
          fill="transparent"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="hsl(var(--primary))"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <Button
        onClick={onClick}
        disabled={disabled}
        size="lg"
        variant={disabled ? "secondary": "default"}
        className="absolute w-24 h-24 rounded-full text-lg font-bold flex flex-col transition-colors disabled:opacity-100 disabled:bg-transparent"
      >
        {disabled ? (
           <>
             <span className="text-2xl font-bold text-foreground">{countdown}</span>
             <span className="text-xs font-normal text-muted-foreground">seconds</span>
           </>
        ) : "Get Link"}
      </Button>
    </div>
  );
}


export default function ShortLinkPage() {
  const params = useParams();
  const shortCode = Array.isArray(params.shortCode) ? params.shortCode[0] : params.shortCode;
  
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(1); // 1: Initial Timer, 2: Get Link, 3: Ad, 4: Generate Link
  const [countdown, setCountdown] = useState(INITIAL_TIMER_DURATION);
  const [adProgress, setAdProgress] = useState(0);
  const [verificationText, setVerificationText] = useState('Verification');

  useEffect(() => {
    let animationTimer: NodeJS.Timeout;
    if (step === 1) {
      animationTimer = setInterval(() => {
        setVerificationText(prev => {
          if (prev.endsWith('...')) {
            return 'Verification.';
          }
          if (prev.endsWith('..')) {
            return 'Verification...';
          }
          if (prev.endsWith('.')) {
            return 'Verification..';
          }
          return 'Verification.';
        });
      }, 500);
    }
    return () => clearInterval(animationTimer);
  }, [step]);

  useEffect(() => {
    if (shortCode === 'preview' || shortCode === 'preview.html') {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      setLinkData({
        longUrl: 'https://google.com', // Dummy destination for preview
        shortUrl: `${baseUrl}/preview`,
      });
      setLoading(false);
      return;
    }

    const fetchLink = async () => {
      if (!shortCode) return;
      try {
        const data = await getLink(shortCode);
        if (data && data.longUrl) {
          setLinkData(data);
        } else {
          setError(true);
        }
      } catch (e) {
        console.error("Error fetching link:", e);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [shortCode]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 1 && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (step === 1 && countdown === 0) {
      setStep(2);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleGetLinkClick = () => {
     if (countdown === 0) {
        setStep(3);
     }
  };
  
  const handleGenerateLinkClick = () => {
    if(linkData) {
      window.location.href = linkData.longUrl;
    }
  };

  const onAdComplete = () => {
    setStep((currentStep) => currentStep === 3 ? 4 : currentStep);
  };

  const handleAdProgress = (progress: { played: number }) => {
    setAdProgress(progress.played * 100);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying link...</p>
      </div>
    );
  }

  if (error || !linkData) {
    return <NotFound />;
  }

  const timerProgress = ((INITIAL_TIMER_DURATION - countdown) / INITIAL_TIMER_DURATION) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-background/95">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
           <div className="flex items-center gap-2 text-2xl font-bold text-primary">
              <Link2 className="h-6 w-6" />
              <span>FilmplexLinks</span>
            </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="w-full max-w-3xl mx-auto text-center">

            {step === 1 && (
                <p className="text-lg md:text-xl text-foreground mb-6 h-8">
                    {verificationText}
                </p>
            )}
            {step === 2 && (
                <div className="flex items-center justify-center gap-2 text-lg md:text-xl text-green-500 mb-6 h-8">
                    <CheckCircle className="h-6 w-6" />
                    <span>Verified</span>
                </div>
            )}
            
             <div className="mb-8 flex items-center justify-center">
              {(step === 1 || step === 2) && (
                 <CircularProgressButton 
                    progress={timerProgress}
                    countdown={countdown}
                    onClick={handleGetLinkClick}
                    disabled={countdown > 0}
                 />
              )}

              {step === 3 && (
                 <div className="space-y-4 w-full">
                    <div className="aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden">
                      <AdPlayer onAdComplete={onAdComplete} onAdProgress={handleAdProgress} />
                    </div>
                    <Progress value={adProgress} className="w-full h-2" />
                    <p className="text-sm text-muted-foreground">Please watch the ad to unlock the link.</p>
                 </div>
              )}

              {step === 4 && (
                <div className='space-y-4 w-full'>
                    <div className="flex flex-col items-center justify-center p-8">
                        <ShieldCheck className="w-16 h-16 text-green-500 mb-4" />
                        <h2 className="text-2xl font-bold text-foreground">Link Unlocked!</h2>
                        <p className="text-muted-foreground mt-2">You can now proceed to your destination.</p>
                    </div>
                    <Button onClick={handleGenerateLinkClick} size="lg" className="w-full bg-green-600 hover:bg-green-700">
                        Go to your link
                    </Button>
                </div>
              )}
            </div>
          
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 my-12">
              <FeatureCard icon={Server} title="Fast Servers" description="Our links are served via the fastest CDNs for quick access."/>
              <FeatureCard icon={PlayCircle} title="Ad-Supported" description="We use minimal ads to keep the service free for everyone." />
              <FeatureCard icon={LinkIcon} title="Reliable Links" description="Your links are stored securely and are always available." />
            </div>

            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Follow us on social page</p>
              <div className="flex justify-center items-center gap-6">
                <a 
                  href="https://www.instagram.com/filmplex.space" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 hover:text-primary/80 transition-colors p-2 rounded-lg text-foreground"
                >
                  <Instagram className="h-7 w-7 text-primary" />
                  <span className="font-semibold text-lg">filmplex.space</span>
                </a>
                 <a 
                  href="https://t.me/Filmplex_space" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 hover:text-primary/80 transition-colors p-2 rounded-lg text-foreground"
                >
                  <Send className="h-7 w-7 text-primary" />
                  <span className="font-semibold text-lg">Filmplex_space</span>
                </a>
              </div>
            </div>
        </div>
      </main>

      <footer className="py-6 border-t border-border/40 bg-background/95">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} FilmplexLinks. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}
