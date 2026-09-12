'use client';

import { ArrowLeft, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type ReactElement, type ReactNode, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
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

/*
 * Each step returns a <form> in the same position, so React would reuse the
 * node and let `transition-all` morph the previous step's button colours into
 * the next one's. Keying per step remounts instead — no cross-step smear.
 */

/** Auth runs at a looser density than ops screens — comfortable thumb targets on mobile. */
const CONTROL_CLASS = 'h-11 w-full';
const FIELD_LABEL_CLASS = 'block text-sm font-medium text-(--color-fg)';

export function LoginForm(): ReactElement {
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
            <form key="google-lane" onSubmit={handleGoogleLaneContinue} className="space-y-3">
                <AuthStepBody>
                    <AuthStepHeader
                        title="Confirm your account type"
                        description="Choose Staff or Member before continuing with Google. Returning users must pick the same type as before."
                    />
                    <LaneChooser lane={lane} onChange={setLane} />
                    <OptionalNameField name={name} onChange={setName} />
                    <AuthFormError message={error} />
                    <Button type="submit" className={cn(CONTROL_CLASS, 'gap-2.5')} disabled={!lane}>
                        <GoogleMark />
                        Continue with Google
                    </Button>
                </AuthStepBody>
                <AuthBackButton label="Back" onClick={resetToEmail} />
            </form>
        );
    }

    if (step === 'lane') {
        return (
            <form key="lane" onSubmit={handleLaneContinue} className="space-y-3">
                <AuthStepBody>
                    <AuthStepHeader
                        title="Confirm your account type"
                        description={`New account for ${email}. This choice is permanent for this email.`}
                    />
                    <LaneChooser lane={lane} onChange={setLane} />
                    <OptionalNameField name={name} onChange={setName} />
                    <AuthFormError message={error} />
                    <Button type="submit" className={CONTROL_CLASS} disabled={!lane}>
                        Continue to code
                    </Button>
                </AuthStepBody>
                <AuthBackButton label="Use a different email" onClick={resetToEmail} />
            </form>
        );
    }

    if (step === 'otp') {
        return (
            <form key="otp" onSubmit={handleVerifyOtp} className="space-y-3">
                <AuthStepBody>
                    <div className="space-y-1.5">
                        <h2 className="text-base font-semibold text-(--color-fg)">Check your inbox</h2>
                        {/* One element: E2E asserts on the whole "We sent a code to …" sentence. */}
                        <p className="text-sm text-(--color-fg-muted)">
                            We sent a code to {email}
                            {isNewUser && lane
                                ? ` · ${lane === 'STAFF' ? 'Staff' : 'Member'}`
                                : isNewUser
                                  ? ''
                                  : ' · welcome back'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="otp" className={FIELD_LABEL_CLASS}>
                            Email code
                        </label>
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
                            // Trailing letter-spacing offsets centred text; the left pad puts it back.
                            className="h-14 w-full pl-[0.35em] text-center text-xl font-semibold tracking-[0.35em] md:text-xl"
                            placeholder="000000"
                        />
                    </div>

                    <AuthFormError message={error} />
                    <Button type="submit" disabled={isPending || otp.length < 6} className={CONTROL_CLASS}>
                        {isPending ? 'Signing in…' : 'Continue'}
                    </Button>
                </AuthStepBody>
                <AuthBackButton label="Use a different email" onClick={resetToEmail} disabled={isPending} />
            </form>
        );
    }

    return (
        <form key="email" onSubmit={handleRequestOtp} className="space-y-3">
            <AuthStepBody>
                <div className="space-y-2">
                    <label htmlFor="email" className={FIELD_LABEL_CLASS}>
                        Email
                    </label>
                    <div className="relative">
                        <Mail
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-(--color-fg-muted)"
                            aria-hidden
                        />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={cn(CONTROL_CLASS, 'pl-9')}
                            placeholder="you@gym.com"
                        />
                    </div>
                    <p className="text-xs text-(--color-fg-muted)">
                        We’ll email a 6-digit code. Nothing to remember, nothing to reset.
                    </p>
                </div>

                <AuthFormError message={error} />
                <Button type="submit" disabled={isPending || !email.includes('@')} className={CONTROL_CLASS}>
                    {isPending ? 'Sending code…' : 'Send code'}
                </Button>

                <AuthDivider />

                <Button
                    type="button"
                    variant="outline"
                    className={cn(CONTROL_CLASS, 'gap-2.5')}
                    disabled={isPending}
                    onClick={handleStartGoogle}
                >
                    <GoogleMark />
                    Continue with Google
                </Button>
            </AuthStepBody>
        </form>
    );
}

/**
 * The form column is already a surface, so the step body carries no card
 * chrome — a panel here would only stack flat-on-flat.
 */
function AuthStepBody({ children }: { children: ReactNode }): ReactElement {
    return <div className="space-y-5">{children}</div>;
}

function AuthStepHeader({ title, description }: { title: string; description: string }): ReactElement {
    return (
        <div className="space-y-1.5">
            <h2 className="text-base font-semibold text-(--color-fg)">{title}</h2>
            <p className="text-sm leading-relaxed text-(--color-fg-muted)">{description}</p>
        </div>
    );
}

function AuthFormError({ message }: { message: string | null }): ReactElement | null {
    if (!message) {
        return null;
    }
    return (
        <p
            className="rounded-(--radius-control) border border-(--color-danger)/20 bg-(--color-danger)/10 px-3 py-2 text-sm text-(--color-danger)"
            role="alert"
        >
            {message}
        </p>
    );
}

function AuthDivider(): ReactElement {
    return (
        <div className="relative py-0.5">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-(--color-border)" />
            </div>
            <div className="relative flex justify-center text-xs">
                <span className="bg-(--color-surface) px-2 text-(--color-fg-muted)">or</span>
            </div>
        </div>
    );
}

function AuthBackButton(props: { label: string; onClick: () => void; disabled?: boolean }): ReactElement {
    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mx-auto flex h-9 gap-1.5 px-3 text-(--color-fg-muted)"
            disabled={props.disabled}
            onClick={props.onClick}
        >
            <ArrowLeft className="size-3.5" aria-hidden />
            {props.label}
        </Button>
    );
}

function LaneChooser(props: { lane: AuthLane | null; onChange: (lane: AuthLane) => void }): ReactElement {
    const { lane, onChange } = props;
    return (
        <fieldset>
            <legend className="sr-only">Account type</legend>
            {/*
             * Base UI latches controlled-vs-uncontrolled on the first render off
             * `value !== undefined`, so `lane ?? undefined` starts the group
             * uncontrolled and picking a lane flips it to controlled — the React
             * warning, plus a group that then ignores the `value` prop, leaving
             * `setLane(null)` resets unable to clear the selection. `null` is Base
             * UI's own "nothing selected" value, so pass it straight through.
             */}
            <RadioGroup
                name="lane"
                className="gap-2.5"
                value={lane}
                onValueChange={(value) => onChange(value as AuthLane)}
            >
                <LaneOption
                    value="STAFF"
                    isSelected={lane === 'STAFF'}
                    title="I work at a gym"
                    description="Staff / Admin — create or join a gym organization"
                />
                <LaneOption
                    value="CLIENT"
                    isSelected={lane === 'CLIENT'}
                    title="I’m a member"
                    description="Client — membership and personal progress"
                />
            </RadioGroup>
        </fieldset>
    );
}

function LaneOption(props: { value: AuthLane; isSelected: boolean; title: string; description: string }): ReactElement {
    return (
        <label
            className={cn(
                'flex cursor-pointer items-start gap-3 rounded-(--radius-control) border p-3.5 transition-colors',
                props.isSelected
                    ? 'border-(--color-accent) bg-(--color-canvas-accent)'
                    : 'border-(--color-border) hover:bg-(--color-canvas)',
            )}
        >
            <RadioGroupItem value={props.value} className="mt-0.5" />
            <span className="min-w-0">
                <span className="block text-sm font-medium text-(--color-fg)">{props.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-(--color-fg-muted)">
                    {props.description}
                </span>
            </span>
        </label>
    );
}

function OptionalNameField(props: { name: string; onChange: (value: string) => void }): ReactElement {
    return (
        <div className="space-y-2">
            <label htmlFor="name" className={FIELD_LABEL_CLASS}>
                Display name <span className="font-normal text-(--color-fg-muted)">(optional)</span>
            </label>
            <Input
                id="name"
                name="name"
                maxLength={120}
                value={props.name}
                onChange={(e) => props.onChange(e.target.value)}
                className={CONTROL_CLASS}
                placeholder="Your name"
            />
        </div>
    );
}

/**
 * Google's mark keeps its brand hexes on purpose — a third-party logo is not
 * part of this app's themeable palette and must not shift with `data-theme`.
 */
function GoogleMark(): ReactElement {
    return (
        <svg viewBox="0 0 18 18" className="size-4" aria-hidden focusable="false">
            <path
                fill="#4285F4"
                d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
            />
            <path
                fill="#34A853"
                d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
            <path
                fill="#EA4335"
                d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
            />
        </svg>
    );
}
