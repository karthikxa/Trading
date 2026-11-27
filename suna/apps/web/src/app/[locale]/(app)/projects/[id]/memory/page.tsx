'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@kortix/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@kortix/ui/card';
import { Input } from '@kortix/ui/input';
import { Trash } from '@phosphor-icons/react';

type MemoryItem = {
  id: string;
  key: string;
  value: string;
  source: string;
  agent_id?: string;
  updated_at: string;
};

export default function TradingMemoryPage() {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [retentionDays, setRetentionDays] = useState(365);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await fetch(`/v1/trading/memory${query}`, { cache: 'no-store' });
    const data = await response.json();
    setMemories(Array.isArray(data.memories) ? data.memories : []);
    setRetentionDays(Number(data.policy?.retention_days || 365));
    setLoading(false);
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  const remove = async (id: string) => {
    await fetch(`/v1/trading/memory?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await load();
  };

  const savePolicy = async () => {
    await fetch('/v1/trading/memory/policy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retention_days: retentionDays }),
    });
    await load();
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Trading desk memory</h1>
        <p className="text-muted-foreground mt-1 text-sm">Review, search, retain, or remove what your teammates remember.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Memory audit</CardTitle>
          <CardDescription>Search is applied server-side across workspace and agent memory.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex gap-2">
            <Input aria-label="Search memory" placeholder="Search memory" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button variant="outline" onClick={() => void load()}>Refresh</Button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="retention-days">Retention days</label>
            <Input id="retention-days" className="w-28" type="number" min={1} value={retentionDays} onChange={(event) => setRetentionDays(Number(event.target.value))} />
            <Button variant="outline" onClick={() => void savePolicy()}>Save policy</Button>
          </div>
          {loading ? <p className="text-muted-foreground text-sm">Loading memory…</p> : memories.length === 0 ? <p className="text-muted-foreground text-sm">No memory items found.</p> : (
            <div className="divide-y rounded-md border">
              {memories.map((memory) => (
                <div key={memory.id} className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{memory.key}</p>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm">{memory.value}</p>
                    <p className="text-muted-foreground mt-1 text-xs">{memory.source}{memory.agent_id ? ` · ${memory.agent_id}` : ''} · {new Date(memory.updated_at).toLocaleString()}</p>
                  </div>
                  <Button aria-label={`Delete ${memory.key}`} variant="ghost" size="icon" onClick={() => void remove(memory.id)}><Trash /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
