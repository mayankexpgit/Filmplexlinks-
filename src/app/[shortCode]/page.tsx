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
  const shortUrl = `https://filmplexlinksverify.xo.je/${shortCode}`;
  const linksRef = collection(db, 'links');
  const q = query(linksRef, where('shortUrl', '==', shortUrl), limit(1));

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const linkDoc = querySnapshot.docs[0];
  return linkDoc.data() as LinkData;
}

const AD_DURATION = 30; // 30 seconds

export default function ShortLinkPage({ params }: Props) {
  const { shortCode } = params;
  const [linkData, setLinkData] = useState<LinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [countdown, setCountdown] = useState(AD_DURATION);

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
    if (linkData) {
      if (countdown > 0) {
        const timer = setInterval(() => {
          setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
      } else {
        window.location.href = linkData.longUrl;
      }
    }
  }, [linkData, countdown]);

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
  
  const progressPercentage = ((AD_DURATION - countdown) / AD_DURATION) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
      <Card className="w-full max-w-2xl text-center">
        <CardHeader>
          <CardTitle className="text-2xl">Advertisement</CardTitle>
          <p className="text-muted-foreground pt-2">
            You will be redirected to your destination link after the ad.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 
            ============================================================
            AD NETWORK INTEGRATION
            ============================================================
            Yahan par aap apne ad network (jaise Google AdSense) ka code
            snippet paste karein. Ye div ad ke liye placeholder hai.
            Aap iski styling ko apne ad ke size ke hisaab se adjust
            kar sakte hain.
            ============================================================
          */}
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <p className="text-muted-foreground">Your Ad Will Be Displayed Here</p>
          </div>
          
          <div className='space-y-3'>
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          </div>

          <Button onClick={() => (window.location.href = linkData.longUrl)} size="lg" className="w-full" disabled={countdown > 0}>
             {countdown > 0 ? 'Please wait...' : 'Continue to Link'}
          </Button>

        </CardContent>
      </Card>
    </div>
  );
}
