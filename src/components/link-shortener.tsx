"use client";

import { useState, useEffect } from 'react';
import { format } from "date-fns";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Check, Settings, Calendar as CalendarIcon, MoreVertical, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, onSnapshot, orderBy, serverTimestamp, Timestamp, getDoc, doc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type LinkItem = {
  id: string;
  name: string;
  longUrl: string;
  shortUrl: string;
  createdAt: Timestamp | Date;
  expiresAt?: Timestamp | Date;
};

const LINKS_PER_PAGE = 5;

async function getBaseUrl(): Promise<string> {
  try {
    const configDoc = await getDoc(doc(db, 'settings', 'config'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      if (data.baseUrl) {
        return data.baseUrl.endsWith('/') ? data.baseUrl.slice(0, -1) : data.baseUrl;
      }
    }
  } catch (error) {
    console.error("Error fetching base URL from Firestore:", error);
  }
  const fallbackUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://filmplexlinksadsverify.vercel.app';
  return fallbackUrl.endsWith('/') ? fallbackUrl.slice(0, -1) : fallbackUrl;
}

export default function LinkShortener() {
  const { user } = useAuth();
  const [longUrl, setLongUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentLinks, setRecentLinks] = useState<LinkItem[]>([]);
  const [visibleLinks, setVisibleLinks] = useState(LINKS_PER_PAGE);
  const [baseUrl, setBaseUrl] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);
  const [expiryOption, setExpiryOption] = useState<'none' | 'date'>('none');

  const { toast } = useToast();
  
  useEffect(() => {
    const fetchBaseUrl = async () => {
      const url = await getBaseUrl();
      setBaseUrl(url);
    };
    fetchBaseUrl();
  }, []);

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
        setRecentLinks(localLinks.map((link: any) => ({
          ...link, 
          createdAt: new Date(link.createdAt),
          expiresAt: link.expiresAt ? new Date(link.expiresAt) : undefined
        })));
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
    if (!baseUrl) {
      toast({
        title: 'Error',
        description: 'Base URL not configured. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setShortUrl('');

    const generatedShortCode = Math.random().toString(36).substring(2, 8);
    const newShortUrl = `${baseUrl}/${generatedShortCode}`;
    
    const newLinkData: any = {
      name: linkName || longUrl,
      longUrl: longUrl,
      shortUrl: newShortUrl,
      createdAt: serverTimestamp(),
    };

    if (expiryOption === 'date' && expiryDate) {
      const endOfDay = new Date(expiryDate);
      endOfDay.setHours(23, 59, 59, 999);
      newLinkData.expiresAt = Timestamp.fromDate(endOfDay);
    }

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
          createdAt: new Date().toISOString(),
          expiresAt: newLinkData.expiresAt ? newLinkData.expiresAt.toDate().toISOString() : undefined,
      };
      
      const updatedLinks = [newLinkWithClientSideDate, ...recentLinks];
      setRecentLinks(updatedLinks);
      localStorage.setItem('recentLinks', JSON.stringify(updatedLinks));
    }

    setShortUrl(newShortUrl);
    setLongUrl('');
    setLinkName('');
    setExpiryDate(undefined);
    setExpiryOption('none');
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
    if (!timestamp) return 'N/A';
    let date: Date;
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      return 'Invalid date';
    }
    return format(date, "PPP");
  };

  const getExpiryDisplayDate = (timestamp: any) => {
    if (!timestamp) return 'Never';
    return getDisplayDate(timestamp);
  }

  return (
    <>
      <Card className="w-full border-2 border-primary/20 bg-card shadow-lg shadow-primary/5">
        <CardContent className="p-6">
          <form onSubmit={handleShorten} className="flex flex-col gap-4">
             <Input
              type="text"
              placeholder="Name"
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              className="h-14 text-base rounded-lg bg-input/50 border-border focus:border-primary transition-colors"
              disabled={isLoading || !baseUrl}
            />
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Input
                type="url"
                placeholder="https://your-super-long-link.com/goes-here"
                value={longUrl}
                onChange={(e) => setLongUrl(e.target.value)}
                className="h-14 text-base rounded-lg bg-input/50 border-border focus:border-primary transition-colors flex-grow"
                disabled={isLoading || !baseUrl}
              />
              <div className="flex gap-2 w-full sm:w-auto">
                <Button type="submit" size="lg" className="h-14 rounded-lg w-full" disabled={isLoading || !baseUrl}>
                  {isLoading ? 'Shortening...' : 'Shorten'}
                </Button>
                 <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="lg" className="h-14 w-14 p-0 rounded-lg">
                        <Settings className="h-6 w-6" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                      <div className="space-y-4">
                        <h4 className="font-medium leading-none">Link Expiration</h4>
                        <RadioGroup value={expiryOption} onValueChange={(value: 'none' | 'date') => {
                          setExpiryOption(value);
                          if(value === 'none') {
                             setExpiryDate(undefined);
                          }
                        }}>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="none" id="r1" />
                            <Label htmlFor="r1">No expiration</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="date" id="r2" />
                            <Label htmlFor="r2">Set expiration date</Label>
                          </div>
                        </RadioGroup>
                        {expiryOption === 'date' && (
                          <div>
                             <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-[240px] justify-start text-left font-normal",
                                      !expiryDate && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={expiryDate}
                                    onSelect={setExpiryDate}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
              </div>
            </div>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Short URL</TableHead>
                    <TableHead>Expires At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLinks.slice(0, visibleLinks).map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="max-w-xs truncate font-medium">
                        {link.name || link.longUrl}
                      </TableCell>
                      <TableCell>
                        <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">
                          {link.shortUrl.replace(/^https?:\/\//, '')}
                        </a>
                      </TableCell>
                       <TableCell>
                        {getExpiryDisplayDate(link.expiresAt)}
                      </TableCell>
                      <TableCell className="text-right">
                         <Dialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-5 w-5 text-muted-foreground" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopy(link.shortUrl, link.id)}>
                                {copiedId === link.id ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                                <span>Copy Link</span>
                              </DropdownMenuItem>
                               <DialogTrigger asChild>
                                <DropdownMenuItem>
                                  <span>View Details</span>
                                </DropdownMenuItem>
                              </DialogTrigger>
                            </DropdownMenuContent>
                          </DropdownMenu>
                           <DialogContent>
                              <DialogHeader>
                                <DialogTitle className="truncate">{link.name || 'Link Details'}</DialogTitle>
                                <DialogDescription>
                                  Detailed information about your shortened link.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 text-sm text-muted-foreground">
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">Original URL</p>
                                    <a href={link.longUrl} target="_blank" rel="noopener noreferrer" className="text-primary break-all hover:underline line-clamp-3">
                                        {link.longUrl}
                                    </a>
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">Short URL</p>
                                    <a href={link.shortUrl} target="_blank" rel="noopener noreferrer" className="text-primary break-all hover:underline">
                                        {link.shortUrl}
                                    </a>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-1">
                                        <p className="font-medium text-foreground">Created At</p>
                                        <p>{getDisplayDate(link.createdAt)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-medium text-foreground">Expires At</p>
                                        <p>{getExpiryDisplayDate(link.expiresAt)}</p>
                                    </div>
                                </div>
                              </div>
                            </DialogContent>
                        </Dialog>
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
