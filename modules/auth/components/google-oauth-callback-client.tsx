'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type SubmitEvent } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { completeGoogleAction } from '@/modules/auth/auth-actions';
import {
    clearGoogleOAuthPending,
    parseOAuthCallbackHash,
    readGoogleOAuthPending,
    writeGoogleOAuthPending,
    type GoogleOAuthPending,
} from '@/modules/auth/google-oauth-pending';
import type { AuthLane } from '@/modules/auth/auth-ports';

type Tokens = {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
};

type Phase = 'working' | 'need-lane' | 'error';

/**
 * Client-only: Supabase puts tokens in the URL hash (not sent to the server).
 */
export function GoogleOAuthCallbackClient() {
    const router = useRouter();
    const [phase, setPhase] = useState<Phase>('working');
    const [error, setError] = useState<string | null>(null);
    const [tokens, setTokens] = useState<Tokens | null>(null);
    const [lane, setLane] = useState<AuthLane | null>(null);
    const [name, setName] = useState('');
    const [isPending, startTransition] = useTransition();

    // The OAuth hash exists only in the browser, so the whole callback result is
    // necessarily resolved after mount.
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const parsed = parseOAuthCallbackHash(window.location.hash);
        // Drop secrets from the address bar once read.
        window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);

        if (!parsed) {
            setError('Google sign-in did not return a session. Try again or use an email code.');
            setPhase('error');
            return;
        }
        if (parsed.error) {
            setError(
                parsed.errorDescription?.replace(/\+/g, ' ') || 'Google sign-in was cancelled or failed. Try again.',
            );
            setPhase('error');
            return;
        }

        const nextTokens: Tokens = {
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken,
            expiresIn: parsed.expiresIn,
        };
        setTokens(nextTokens);

        const pending = readGoogleOAuthPending();
        if (!pending) {
            setPhase('need-lane');
            return;
        }

        finish(nextTokens, pending);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
    }, []);
    /* eslint-enable react-hooks/set-state-in-effect */

    function finish(nextTokens: Tokens, pending: GoogleOAuthPending) {
        setPhase('working');
        setError(null);
        startTransition(async () => {
            const result = await completeGoogleAction({
                accessToken: nextTokens.accessToken,
                refreshToken: nextTokens.refreshToken,
                expiresIn: nextTokens.expiresIn,
                lane: pending.lane,
                name: pending.name,
            });
            clearGoogleOAuthPending();
            if (result && !result.ok) {
                if (result.code === 'LANE_REQUIRED' || result.code === 'LANE_MISMATCH') {
                    setError(result.message);
                    setPhase('need-lane');
                    return;
                }
                setError(result.message);
                setPhase('error');
                return;
            }
            router.refresh();
        });
    }

    function handleLaneSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!tokens || !lane) {
            setError('Choose whether you work at a gym or you are a member.');
            return;
        }
        const pending: GoogleOAuthPending = {
            lane,
            name: name.trim() || undefined,
        };
        writeGoogleOAuthPending(pending);
        finish(tokens, pending);
    }

    if (phase === 'need-lane') {
        return (
            <form onSubmit={handleLaneSubmit} className="space-y-4">
                <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                    <div>
                        <h1 className="text-base font-semibold text-(--color-fg)">Confirm your account type</h1>
                        <p className="mt-1 text-sm text-(--color-fg-muted)">
                            Choose Staff or Member for this Google account. This matches your first sign-in and cannot
                            change later.
                        </p>
                    </div>
                    <fieldset>
                        <legend className="sr-only">Account type</legend>
                        <RadioGroup name="lane" value={lane} onValueChange={(value) => setLane(value as AuthLane)}>
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--color-border) p-3 hover:bg-(--color-canvas)">
                                <RadioGroupItem value="STAFF" className="mt-1" />
                                <span>
                                    <span className="block text-sm font-medium text-(--color-fg)">I work at a gym</span>
                                    <span className="block text-xs text-(--color-fg-muted)">
                                        Staff / Admin — create or join a gym organization
                                    </span>
                                </span>
                            </label>
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--color-border) p-3 hover:bg-(--color-canvas)">
                                <RadioGroupItem value="CLIENT" className="mt-1" />
                                <span>
                                    <span className="block text-sm font-medium text-(--color-fg)">I’m a member</span>
                                    <span className="block text-xs text-(--color-fg-muted)">
                                        Client — membership and personal progress
                                    </span>
                                </span>
                            </label>
                        </RadioGroup>
                    </fieldset>
                    <div>
                        <label htmlFor="google-name" className="block text-sm font-medium text-(--color-fg)">
                            Display name <span className="font-normal text-(--color-fg-muted)">(optional)</span>
                        </label>
                        <Input
                            id="google-name"
                            name="name"
                            maxLength={120}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-2"
                            placeholder="Your name"
                        />
                    </div>
                    {error ? (
                        <p className="text-sm text-(--color-danger)" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={!lane || isPending}>
                        {isPending ? 'Signing in…' : 'Continue'}
                    </Button>
                    {/* Styled from the same variants as the <Button> above, so
                        the two controls in this stack cannot drift apart. */}
                    <Link href="/login" className={cn(buttonVariants({ variant: 'ghost' }), 'w-full')}>
                        Back to sign in
                    </Link>
                </div>
            </form>
        );
    }

    if (phase === 'error') {
        return (
            <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                <h1 className="text-base font-semibold text-(--color-fg)">Could not finish Google sign-in</h1>
                <p className="text-sm text-(--color-danger)" role="alert">
                    {error ?? 'Something went wrong. Please try again.'}
                </p>
                <Link href="/login" className={cn(buttonVariants(), 'w-full')}>
                    Back to sign in
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
            <h1 className="text-base font-semibold text-(--color-fg)">Finishing Google sign-in…</h1>
            <p className="text-sm text-(--color-fg-muted)">One moment while we set up your account.</p>
        </div>
    );
}
