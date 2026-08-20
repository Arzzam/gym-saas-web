'use client';

import { useState } from 'react';

import { WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGymTrainers } from '@/modules/gym-orgs/gym-orgs-hooks';
import { useAssignTrainer } from '@/modules/roster/roster-hooks';
import type { RosterMember } from '@/modules/roster/roster-ports';

/**
 * Who coaches this member.
 *
 * `assignedTrainerId` has been parsed through the roster adapter since the
 * module landed and was rendered nowhere — the roster carried the answer and no
 * screen asked. It holds a **`trainerProfileId`**, not a `userId`, which is why
 * the picker keys on `trainerProfileId` throughout.
 *
 * Assigning requires an in-date TRAINER_COACHING add-on; the API answers 422
 * `COACHING_ADDON_REQUIRED` otherwise. Rather than guess at the member's
 * add-ons client-side — the API owns that rule, and this app never re-derives
 * entitlement — the control stays enabled and shows the API's answer. The hint
 * below it says the rule up front so a refusal is not a surprise.
 *
 * There is no unassign: the contract has no such request, and inventing one is
 * how a UI ends up promising something the backend never agreed to.
 */
export function MemberCoachSection({ member, disabled }: { member: RosterMember; disabled: boolean }) {
    const { data: trainers = [], isPending: trainersLoading } = useGymTrainers();
    const assignTrainer = useAssignTrainer();

    // Remounted per member by the rail's key, so this starts from their coach.
    const [selected, setSelected] = useState(member.assignedTrainerId ?? '');

    const assignedName = trainers.find((t) => t.trainerProfileId === member.assignedTrainerId)?.name ?? null;
    const changed = selected !== '' && selected !== (member.assignedTrainerId ?? '');
    const error = assignTrainer.error?.message ?? null;

    return (
        <WorkQueueRailSection title="Coach">
            <p className="text-sm text-(--color-fg)">
                {member.assignedTrainerId
                    ? // A coach whose profile is no longer in the list still has an
                      // id — say that rather than rendering "no coach".
                      (assignedName ?? 'Assigned to a trainer who is no longer listed')
                    : 'No coach assigned'}
            </p>

            {trainersLoading ? (
                <div className="h-8 animate-pulse rounded-(--radius-control) bg-(--color-border)" aria-hidden />
            ) : trainers.length === 0 ? (
                <p className="text-xs text-(--color-fg-muted)">
                    No trainers on staff yet. Invite one from Settings before assigning a coach.
                </p>
            ) : (
                <>
                    <Select value={selected} onValueChange={(value) => setSelected(value ?? '')} disabled={disabled}>
                        <SelectTrigger className="w-full" aria-label={`Coach for ${member.clientName}`}>
                            {/* Base UI shows the raw id without a render-prop. */}
                            <SelectValue>
                                {(value: string) =>
                                    trainers.find((t) => t.trainerProfileId === value)?.name ?? 'Select a trainer'
                                }
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                            {trainers.map((trainer) => (
                                <SelectItem key={trainer.trainerProfileId} value={trainer.trainerProfileId}>
                                    {trainer.name}
                                    {trainer.staffCode ? ` · ${trainer.staffCode}` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        type="button"
                        size="sm"
                        disabled={disabled || !changed || assignTrainer.isPending}
                        onClick={() =>
                            assignTrainer.mutate({
                                membershipId: member.membershipId,
                                trainerProfileId: selected,
                            })
                        }
                    >
                        {assignTrainer.isPending
                            ? 'Assigning…'
                            : member.assignedTrainerId
                              ? 'Change coach'
                              : 'Assign coach'}
                    </Button>
                </>
            )}

            {error ? (
                <p role="alert" className="text-sm text-(--color-danger)">
                    {error}
                </p>
            ) : (
                <p className="text-xs text-(--color-fg-muted)">
                    Coaching needs an in-date Trainer coaching add-on on the member&apos;s subscription.
                </p>
            )}
        </WorkQueueRailSection>
    );
}
