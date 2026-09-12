'use client';

import { useState, type SubmitEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useMyProfile, useUpdateMyProfile } from '@/modules/profile/profile-hooks';
import { profileGenderLabel } from '@/modules/profile/profile-labels';
import type { ProfileGender } from '@/modules/profile/profile-ports';

const GENDER_OPTIONS: ProfileGender[] = ['MALE', 'FEMALE', 'OTHER'];

export function ClientProfilePanel() {
    const { data: profile, error: listQueryError, isPending: isListPending } = useMyProfile();
    const updateProfile = useUpdateMyProfile();

    const [heightCm, setHeightCm] = useState<string | null>(null);
    const [weightKg, setWeightKg] = useState<string | null>(null);
    const [dob, setDob] = useState<string | null>(null);
    const [gender, setGender] = useState<string | null>(null);
    const [medicalNotes, setMedicalNotes] = useState<string | null>(null);

    const heightValue = heightCm ?? (profile?.heightCm == null ? '' : String(profile.heightCm));
    const weightValue = weightKg ?? (profile?.weightKg == null ? '' : String(profile.weightKg));
    const dobValue = dob ?? profile?.dob ?? '';
    const genderValue = gender ?? profile?.gender ?? '';
    const notesValue = medicalNotes ?? profile?.medicalNotes ?? '';

    const isPending = isListPending || updateProfile.isPending;
    const error = updateProfile.error?.message ?? listQueryError?.message ?? null;
    const success = updateProfile.isSuccess ? 'Profile saved.' : null;

    function handleSave(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        updateProfile.mutate({
            heightCm: heightValue,
            weightKg: weightValue,
            dob: dobValue,
            gender: genderValue,
            medicalNotes: notesValue,
        });
    }

    return (
        <section
            className="space-y-4 rounded-(--radius-panel) border border-(--color-border) bg-(--color-surface) p-5 shadow-(--shadow-panel)"
            aria-labelledby="client-profile-heading"
        >
            <div>
                <h2 id="client-profile-heading" className="text-lg font-semibold tracking-tight text-(--color-fg)">
                    Your details
                </h2>
                <p className="mt-1 text-sm text-(--color-fg-muted)">
                    Height, weight, date of birth, gender, and medical notes. Changing weight also logs today&apos;s
                    progress. BMI is {profile?.bmi ?? '—'}.
                </p>
            </div>

            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : null}
            {success ? (
                <p role="status" className="text-sm text-(--color-fg)">
                    {success}
                </p>
            ) : null}

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSave}>
                <label className="block text-sm">
                    <span className="font-medium text-(--color-fg)">Height (cm)</span>
                    <Input
                        className="mt-1"
                        inputMode="decimal"
                        value={heightValue}
                        onChange={(event) => setHeightCm(event.target.value)}
                        disabled={isPending}
                    />
                </label>
                <label className="block text-sm">
                    <span className="font-medium text-(--color-fg)">Weight (kg)</span>
                    <Input
                        className="mt-1"
                        inputMode="decimal"
                        value={weightValue}
                        onChange={(event) => setWeightKg(event.target.value)}
                        disabled={isPending}
                    />
                </label>
                <label className="block text-sm">
                    <span className="font-medium text-(--color-fg)">Date of birth</span>
                    <Input
                        className="mt-1"
                        type="date"
                        value={dobValue}
                        onChange={(event) => setDob(event.target.value)}
                        disabled={isPending}
                    />
                </label>
                <label className="block text-sm">
                    <span className="font-medium text-(--color-fg)">Gender</span>
                    <Select
                        value={genderValue || 'none'}
                        onValueChange={(value) => setGender(!value || value === 'none' ? '' : value)}
                        disabled={isPending}
                    >
                        <SelectTrigger className="mt-1 w-full" aria-label="Gender">
                            <SelectValue>
                                {(value: string) =>
                                    !value || value === 'none' ? 'Not set' : profileGenderLabel(value as ProfileGender)
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Not set</SelectItem>
                            {GENDER_OPTIONS.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {profileGenderLabel(option)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </label>
                <label className="block text-sm md:col-span-2">
                    <span className="font-medium text-(--color-fg)">Medical notes</span>
                    <Textarea
                        className="mt-1"
                        value={notesValue}
                        onChange={(event) => setMedicalNotes(event.target.value)}
                        disabled={isPending}
                        rows={3}
                    />
                </label>
                <div>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Saving…' : 'Save profile'}
                    </Button>
                </div>
            </form>
        </section>
    );
}
