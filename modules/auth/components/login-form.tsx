'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { requestOtpAction, verifyOtpAction } from '@/modules/auth/auth-actions';
import { writeGoogleOAuthPending } from '@/modules/auth/google-oauth-pending';
import { buildGoogleOAuthStartUrl } from '@/modules/auth/google-oauth-start';
import type { AuthLane } from '@/modules/auth/auth-ports';

/**
 * Auth UX per client-auth.md:
 * - Email OTP: email → (lane if isNewUser) → OTP
 * - Google: lane (+ optional name) → /auth/google/start → callback → complete
 */
type Step = 'email' | 'lane' | 'otp' | 'google-lane';

export function LoginForm() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [isNewUser, setIsNewUser] = useState(false);
    const [lane, setLane] = useState<AuthLane | null>(null);
    const [name, setName] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function resetToEmail() {
        setStep('email');
        setOtp('');
        setLane(null);
        setIsNewUser(false);
        setName('');
        setError(null);
    }

    function handleRequestOtp(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await requestOtpAction({ email });
            if (!result.ok) {
                setError(result.message);
                return;
            }
            const nextIsNew = Boolean(result.isNewUser);
            setIsNewUser(nextIsNew);
            setLane(null);
            setName('');
            setOtp('');
            setStep(nextIsNew ? 'lane' : 'otp');
        });
    }

    function handleLaneContinue(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (!lane) {
            setError('Choose whether you work at a gym or you are a member.');
            return;
        }
        setStep('otp');
    }

    function handleStartGoogle() {
        setError(null);
        setLane(null);
        setName('');
        setStep('google-lane');
    }

    function handleGoogleLaneContinue(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        if (!lane) {
            setError('Choose whether you work at a gym or you are a member.');
            return;
        }
        writeGoogleOAuthPending({
            lane,
            name: name.trim() || undefined,
        });
        window.location.assign(buildGoogleOAuthStartUrl(window.location.origin));
    }

    function handleVerifyOtp(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
            const result = await verifyOtpAction({
                email,
                token: otp,
                lane: isNewUser ? (lane ?? undefined) : undefined,
                name: isNewUser && name.trim() ? name.trim() : undefined,
            });
            if (result && !result.ok) {
                setError(result.message);
                return;
            }
            router.refresh();
        });
    }

    if (step === 'google-lane') {
        return (
            <form onSubmit={handleGoogleLaneContinue} className="space-y-4">
                <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                    <div>
                        <h2 className="text-base font-semibold text-(--color-fg)">Confirm your account type</h2>
                        <p className="mt-1 text-sm text-(--color-fg-muted)">
                            Choose Staff or Member before continuing with Google. Returning users must pick the same
                            type as before.
                        </p>
                    </div>
                    <LaneChooser lane={lane} onChange={setLane} />
                    <OptionalNameField name={name} onChange={setName} />
                    {error ? (
                        <p className="text-sm text-(--color-danger)" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={!lane}>
                        Continue with Google
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={resetToEmail}>
                        Back
                    </Button>
                </div>
            </form>
        );
    }

    if (step === 'lane') {
        return (
            <form onSubmit={handleLaneContinue} className="space-y-4">
                <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                    <div>
                        <h2 className="text-base font-semibold text-(--color-fg)">Confirm your account type</h2>
                        <p className="mt-1 text-sm text-(--color-fg-muted)">
                            New account for {email}. This choice is permanent for this email.
                        </p>
                    </div>
                    <LaneChooser lane={lane} onChange={setLane} />
                    <OptionalNameField name={name} onChange={setName} />
                    {error ? (
                        <p className="text-sm text-(--color-danger)" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <Button type="submit" className="w-full" disabled={!lane}>
                        Continue to code
                    </Button>
                    <Button type="button" variant="ghost" className="w-full" onClick={resetToEmail}>
                        Use a different email
                    </Button>
                </div>
            </form>
        );
    }

    if (step === 'otp') {
        return (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                    <div>
                        <label htmlFor="otp" className="block text-sm font-medium text-(--color-fg)">
                            Email code
                        </label>
                        <p className="mt-1 text-xs text-(--color-fg-muted)">
                            We sent a code to {email}
                            {isNewUser && lane
                                ? ` · ${lane === 'STAFF' ? 'Staff' : 'Member'}`
                                : isNewUser
                                  ? ''
                                  : ' · welcome back'}
                        </p>
                        <Input
                            id="otp"
                            name="otp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={12}
                            required
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="mt-2 tracking-widest"
                            placeholder="6-digit code"
                        />
                    </div>
                    {error ? (
                        <p className="text-sm text-(--color-danger)" role="alert">
                            {error}
                        </p>
                    ) : null}
                    <Button type="submit" disabled={isPending || otp.length < 6} className="w-full">
                        {isPending ? 'Signing in…' : 'Continue'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        className="w-full"
                        disabled={isPending}
                        onClick={resetToEmail}
                    >
                        Use a different email
                    </Button>
                </div>
            </form>
        );
    }

    return (
        <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-panel)">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-(--color-fg)">
                        Email
                    </label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2"
                        placeholder="you@gym.com"
                    />
                </div>
                {error ? (
                    <p className="text-sm text-(--color-danger)" role="alert">
                        {error}
                    </p>
                ) : null}
                <Button type="submit" disabled={isPending || !email.includes('@')} className="w-full">
                    {isPending ? 'Sending code…' : 'Send code'}
                </Button>
                <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                        <div className="w-full border-t border-(--color-border)" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                        <span className="bg-(--color-surface) px-2 text-(--color-fg-muted)">or</span>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={isPending}
                    onClick={handleStartGoogle}
                >
                    Continue with Google
                </Button>
            </div>
        </form>
    );
}

function LaneChooser(props: { lane: AuthLane | null; onChange: (lane: AuthLane) => void }) {
    const { lane, onChange } = props;
    return (
        <fieldset>
            <legend className="sr-only">Account type</legend>
            <RadioGroup name="lane" value={lane} onValueChange={(value) => onChange(value as AuthLane)}>
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
    );
}

function OptionalNameField(props: { name: string; onChange: (value: string) => void }) {
    return (
        <div>
            <label htmlFor="name" className="block text-sm font-medium text-(--color-fg)">
                Display name <span className="font-normal text-(--color-fg-muted)">(optional)</span>
            </label>
            <Input
                id="name"
                name="name"
                maxLength={120}
                value={props.name}
                onChange={(e) => props.onChange(e.target.value)}
                className="mt-2"
                placeholder="Your name"
            />
        </div>
    );
}
