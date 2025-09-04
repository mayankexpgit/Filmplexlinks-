'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import NotFound from '../not-found';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

type Props = {
  params: {
    shortCode: string;
  };
};

type LinkData = {
  longUrl: string;
  shortUrl: string;
};

async function getLink(shortCode: string): Promise<LinkData | null> {
  const shortUrl = `https://filmplexlinksadsverify.vercel.app/${shortCode}`;
  const linksRef = collection(db, 'links');
  const q = query(linksRef, where('shortUrl', '==', shortUrl), limit(1));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const linkDoc = querySnapshot.docs[0];
  return linkDoc.data() as LinkData;
}

const INITIAL_TIMER_DURATION = 10;
const AD_DURATION = 30;

export default function ShortLinkPage({ params }: Props) {
  const { shortCode } = params;
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [step, setStep] = useState(1); // 1: Initial Timer, 2: Get Link, 3: Ad Timer, 4: Generate Link
  const [countdown, setCountdown] = useState(INITIAL_TIMER_DURATION);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const data = await getLink(shortCode);
        if (data && data.longUrl) {
          setLinkData(data);
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchLink();
  }, [shortCode]);

  useEffect(() => {
    if (step === 1 || step === 3) {
      if (countdown > 0) {
        const timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
      } else {
        setStep((prev) => prev + 1);
      }
    }
  }, [step, countdown]);

  const handleGetLinkClick = () => {
    setStep(3);
    setCountdown(AD_DURATION);
  };
  
  const handleGenerateLinkClick = () => {
    if(linkData) {
      window.location.href = linkData.longUrl;
    }
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
  
  const getProgressPercentage = () => {
    if (step === 1) return ((INITIAL_TIMER_DURATION - countdown) / INITIAL_TIMER_DURATION) * 100;
    if (step === 3) return ((AD_DURATION - countdown) / AD_DURATION) * 100;
    return 100;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Please Wait</CardTitle>
           <p className="text-muted-foreground pt-2">
            You will be redirected to your destination link shortly.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {(step === 1 || step === 3) && (
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">
                {step === 3 ? 'Your Ad Will Be Displayed Here' : 'Preparing your link...'}
              </p>
            </div>
          )}

          <div className='space-y-3'>
            {(step === 1 || step === 3) && (
              <>
                <Progress value={getProgressPercentage()} className="w-full" />
                <p className="text-sm text-muted-foreground">
                  Please wait for {countdown} second{countdown !== 1 ? 's' : ''}...
                </p>
              </>
            )}

            {step === 2 && (
              <Button onClick={handleGetLinkClick} size="lg" className="w-full">
                Get Link
              </Button>
            )}

            {step === 4 && (
              <Button onClick={handleGenerateLinkClick} size="lg" className="w-full">
                Generate Link &amp; Continue
              </Button>
            )}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
