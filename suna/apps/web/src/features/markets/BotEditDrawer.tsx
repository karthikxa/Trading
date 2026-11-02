'use client';

import React, { useState, useEffect, type FormEvent } from 'react';
import { BotAvatar, type BotShape, type BotExpression } from './BotAvatar';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel } from '@/components/ui/field';
import { Form } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@kortix/ui/lib/utils';

export interface TradingAgentDef {
  id: string;
  name: string;
  role: string;
  group: 'Analysts' | 'Researchers' | 'Management' | 'Risk Management' | 'Execution';
  shape: BotShape;
  color: string;
  expression: BotExpression;
  lastAction: string;
  time: string;
  description: string;
  directives?: string;
  isAdmin?: boolean;
  isPinned?: boolean;
}

interface BotEditDrawerProps {
  isOpen: boolean;
  agent: TradingAgentDef | null;
  onClose: () => void;
  onSave: (updated: TradingAgentDef) => void;
}

const SHAPES: { id: BotShape; label: string }[] = [
  { id: 'circle', label: 'Circle' },
  { id: 'pebble', label: 'Pebble' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'capsule', label: 'Capsule' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'hexagon', label: 'Hexagon' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'droplet', label: 'Droplet' },
];

const EXPRESSIONS: { id: BotExpression; label: string }[] = [
  { id: 'neutral', label: 'Neutral' },
  { id: 'attentive', label: 'Attentive' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'excited', label: 'Excited' },
  { id: 'happy', label: 'Happy' },
  { id: 'laughing', label: 'Laughing' },
  { id: 'angry', label: 'Angry' },
  { id: 'sad', label: 'Sad' },
  { id: 'scared', label: 'Scared' },
  { id: 'suspicious', label: 'Suspicious' },
  { id: 'confused', label: 'Confused' },
  { id: 'curious', label: 'Curious' },
  { id: 'proud', label: 'Proud' },
  { id: 'shy', label: 'Shy' },
  { id: 'unimpressed', label: 'Unimpressed' },
  { id: 'sleepy', label: 'Sleepy' },
];

const COLORS = [
  '#09090B', // Black
  '#795548', // Brown
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Gold
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate / Grey
  '#F5F5F4', // Light
];

export default function BotEditDrawer({ isOpen, agent, onClose, onSave }: BotEditDrawerProps) {
  const [name, setName] = useState(agent?.name || '');
  const [role, setRole] = useState(agent?.role || '');
  const [shape, setShape] = useState<BotShape>(agent?.shape || 'circle');
  const [expression, setExpression] = useState<BotExpression>(agent?.expression || 'attentive');
  const [color, setColor] = useState(agent?.color || '#3B82F6');
  const [directives, setDirectives] = useState(agent?.directives || agent?.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setRole(agent.role);
      setShape(agent.shape);
      setExpression(agent.expression);
      setColor(agent.color);
      setDirectives(agent.directives || agent.description || '');
    }
  }, [agent]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agent) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400));

    const updated: TradingAgentDef = {
      ...agent,
      name: name.trim() || agent.name,
      role: role.trim() || agent.role,
      shape,
      expression,
      color,
      directives: directives.trim(),
      description: directives.trim() || agent.description,
    };

    onSave(updated);
    setLoading(false);
    onClose();
  };

  const exportAsPng = () => {
    if (!agent) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 400, 400);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(200, 200, 160, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(150, 150, 26, 60, 13);
    ctx.roundRect(224, 150, 26, 60, 13);
    ctx.fill();

    const link = document.createElement('a');
    link.download = `${name.toLowerCase().replace(/\s+/g, '_')}_avatar.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetPopup className="sm:max-w-md w-full bg-white border-l border-zinc-200/90 shadow-2xl outline-none focus:outline-none ring-0">
        <SheetHeader>
          <SheetTitle>Edit Bot Identity</SheetTitle>
          <SheetDescription>
            Customize your bot name, specialized role, avatar physics, shape, and trading directives.
          </SheetDescription>
        </SheetHeader>

        <Form className="contents" onSubmit={handleSubmit}>
          <SheetPanel className="grid gap-4">
            {/* Live Moving Avatar Preview */}
            <div className="flex flex-col items-center justify-center p-5 bg-zinc-50/80 rounded-2xl border border-zinc-200/70 gap-3 select-none">
              <BotAvatar
                shape={shape}
                color={color}
                expression={expression}
                size={110}
                isAnimated={true}
              />
              <button
                type="button"
                onClick={exportAsPng}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer outline-none focus:outline-none"
              >
                <Download className="size-3.5" />
                <span>Export as PNG</span>
              </button>
            </div>

            {/* Name Field */}
            <Field name="name">
              <FieldLabel>Bot Name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chief of Staff"
                required
              />
            </Field>

            {/* Specialized Role Field */}
            <Field name="role">
              <FieldLabel>Specialized Role</FieldLabel>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Technicals & Price Momentum"
                required
              />
            </Field>

            {/* Directives Textarea */}
            <Field name="directives">
              <FieldLabel>Directives & System Instructions</FieldLabel>
              <Textarea
                value={directives}
                onChange={(e) => setDirectives(e.target.value)}
                placeholder="Type your trading directives and strategy rules here..."
                rows={3}
              />
            </Field>

            {/* Shape Selector */}
            <Field name="shape">
              <FieldLabel>Shape</FieldLabel>
              <div className="grid grid-cols-4 gap-2 pt-0.5">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShape(s.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl border text-[11px] font-medium transition-all cursor-pointer outline-none focus:outline-none',
                      shape === s.id
                        ? 'border-zinc-400 bg-zinc-100/90 text-zinc-950 font-semibold shadow-2xs'
                        : 'border-zinc-200/80 text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50',
                    )}
                  >
                    <BotAvatar shape={s.id} color={color} size={28} isAnimated={false} />
                    <span className="truncate">{s.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            {/* Expression Selector */}
            <Field name="expression">
              <FieldLabel>Expression</FieldLabel>
              <div className="grid grid-cols-4 gap-2 pt-0.5 max-h-44 overflow-y-auto [scrollbar-width:thin] p-1 border border-zinc-100 rounded-xl bg-zinc-50/50">
                {EXPRESSIONS.map((expr) => (
                  <button
                    key={expr.id}
                    type="button"
                    onClick={() => setExpression(expr.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-1.5 rounded-xl border text-[10px] font-medium transition-all cursor-pointer outline-none focus:outline-none',
                      expression === expr.id
                        ? 'border-zinc-400 bg-white text-zinc-950 font-semibold shadow-2xs'
                        : 'border-transparent text-zinc-500 hover:border-zinc-200 hover:bg-white/80',
                    )}
                  >
                    <BotAvatar shape={shape} color={color} expression={expr.id} size={24} isAnimated={false} />
                    <span className="truncate">{expr.label}</span>
                  </button>
                ))}
              </div>
            </Field>

            {/* Color Palette */}
            <Field name="color">
              <FieldLabel>Colour</FieldLabel>
              <div className="flex items-center gap-2 flex-wrap pt-0.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={cn(
                      'size-7 rounded-full transition-transform cursor-pointer outline-none focus:outline-none',
                      color === c
                        ? 'ring-2 ring-zinc-400 ring-offset-2 scale-110 shadow-xs'
                        : 'hover:scale-105 border border-black/10',
                    )}
                    title={c}
                  />
                ))}
              </div>
            </Field>
          </SheetPanel>

          <SheetFooter>
            <SheetClose render={<Button variant="ghost" />}>
              Cancel
            </SheetClose>
            <Button disabled={loading} type="submit">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </SheetFooter>
        </Form>
      </SheetPopup>
    </Sheet>
  );
}
