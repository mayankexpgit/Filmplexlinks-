"use client";

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

type LinkItem = {
  id: string;
  longUrl: string;
  shortUrl: string;
  createdAt: Timestamp | Date;
};

const LINKS_PER_PAGE = 5;

export default function LinkShortener() {
  const { user } = useAuth();
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<LinkItem[]>([]);
  const [visibleLinks, setVisibleLinks] = useState(LINKS_PER_PAGE);

  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'links'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const links: LinkItem[] = [];
        querySnapshot.forEach((doc) => {
          links.push({ id: doc.id, ...doc.data() } as LinkItem);
        });
        setRecentLinks(links);
      });
      return () => unsubscribe();
    } else {
      try {
        const localLinks = JSON.parse(localStorage.getItem('recentLinks') || '[]');
        setRecentLinks(localLinks.map((link: any) => ({...link, createdAt: new Date(link.createdAt)})));
      } catch (e) {
        setRecentLinks([]);
        localStorage.setItem('recentLinks', '[]');
      }
    }
  }, [user]);

  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!longUrl) {
      toast({
        title: 'Error',
        description: 'Please enter a URL to shorten.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setShortUrl('');

    // Simulate API call to generate short URL
    const generatedShortCode = Math.random().toString(36).substring(2, 8);
    const newShortUrl = `https://filmplexlinksadsverify.vercel.app/${generatedShortCode}`;
    const newLinkData = {
      longUrl: longUrl,
      shortUrl: newShortUrl,
      createdAt: serverTimestamp(),
    };

    if (user) {
      try {
        await addDoc(collection(db, 'links'), {
          ...newLinkData,
          userId: user.uid,
        });
      } catch (error) {
        console.error("Error adding document: ", error);
        toast({
          title: 'Error',
          description: 'Could not save link to database.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
    } else {
      const newLinkWithClientSideDate = {
          ...newLinkData,
          id: new Date().getTime().toString(),
          createdAt: new Date(),
      };
      
      const updatedLinks = [newLinkWithClientSideDate, ...recentLinks];
      setRecentLinks(updatedLinks);
      localStorage.setItem('recentLinks', JSON.stringify(updatedLinks));
    }

    setShortUrl(newShortUrl);
    setLongUrl('');
    setIsLoading(false);
  };

  const handleCopy = (shortUrlToCopy: string, id: string) => {
    navigator.clipboard.writeText(shortUrlToCopy);
    setCopiedId(id);
    toast({
      title: 'Copied!',
      description: 'Short link copied to clipboard.',
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleLoadMore = () => {
    setVisibleLinks((prev) => prev + LINKS_PER_PAGE);
  };
  
  const getDisplayDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString();
    return 'Invalid date';
  }

  return (
    <>
      <Card className="w-full border-2 border-primary/20 bg-card shadow-lg shadow-primary/5">
        <CardContent className="p-6">
          <form onSubmit={handleShorten} className="flex flex-col sm:flex-row items-center gap-4">
            <Input
              type="url"
              placeholder="https://your-super-long-link.com/goes-here"
              value={longUrl}
              onChange={(e) => setLongUrl(e.target.value)}
              className="h-14 text-base rounded-lg bg-input/50 border-border focus:border-primary transition-colors flex-grow"
              disabled={isLoading}
            />
            <Button type="submit" size="lg" className="h-14 rounded-lg w-full sm:w-auto" disabled={isLoading}>
              {isLoading ? 'Shortening...' : 'Shorten'}
            </Button>
          </form>

          {shortUrl && !isLoading && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
              <span className="text-primary font-medium truncate">{shortUrl}</span>
              <Button variant="ghost" size="icon" onClick={() => handleCopy(shortUrl, 'current')}>
                {copiedId === 'current' ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {recentLinks.length > 0 && (
        <div className="mt-12">
          <h2 className="text-3xl font-bold text-center mb-6">Recent Links</h2>
          <Card className="border-border/20">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Original URL</TableHead>
                    <TableHead>Short URL</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLinks.slice(0, visibleLinks).map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="max-w-xs truncate">
                        <a href={link.longUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {link.longUrl}
                        </a>
                      </TableCell>
                      <TableCell>
                        <span className="text-primary font-medium">{link.shortUrl}</span>
                      </TableCell>
                      <TableCell>
                        {getDisplayDate(link.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleCopy(link.shortUrl, link.id)}>
                          {copiedId === link.id ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-muted-foreground" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          {visibleLinks < recentLinks.length && (
            <div className="mt-6 text-center">
              <Button onClick={handleLoadMore}>Load More</Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
