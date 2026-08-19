'use client';

import { useState, type SubmitEvent } from 'react';

import { ConfirmActionDialog } from '@/components/admin/confirm-action-dialog';
import { ContactActions } from '@/components/admin/contact-actions';
import { WorkQueueRailPanel, WorkQueueRailSection } from '@/components/admin/work-queue-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { statusToneBadgeVariant } from '@/lib/ui/status-tone';
import { cn } from '@/lib/utils';
import type { LeadRow } from '@/modules/leads/leads-desk';
import { useUpdateLead } from '@/modules/leads/leads-hooks';
import { isLeadStageMuted, LEAD_STATUSES, leadStatusLabel, leadStatusTone } from '@/modules/leads/leads-labels';
import type { LeadStatus } from '@/modules/leads/leads-ports';

/**
 * Everything about one lead, in the rail.
 *
 * This replaces an inline edit form per pipeline row. With twenty leads that
 * rendered twenty live forms — twenty sets of local state, and a page you had
 * to scroll past to read the list. Editing one lead at a time is what an Admin
 * actually does, so only one form exists.
 *
 * Status and delete are **not** owned here. Both are passed down from the
 * panel: a delete unmounts this component, which would take the mutation and
 * its error message with it (ADR-0011).
 */

type LeadDetailRailProps = {
    row: LeadRow | null;
    onStatusChange: (leadId: string, status: LeadStatus) => void;
    onDelete: (leadId: string) => void;
    rowActionsPending: boolean;
};

export function LeadDetailRail({ row, onStatusChange, onDelete, rowActionsPending }: LeadDetailRailProps) {
    if (!row) {
        return (
            <WorkQueueRailPanel>
                <p className="text-sm text-(--color-fg-muted)">
                    Select a lead to see their details, call them, or move them along the pipeline.
                </p>
            </WorkQueueRailPanel>
        );
    }

    const { lead } = row;

    return (
        <WorkQueueRailPanel>
            <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 text-base font-semibold break-words text-(--color-fg)">{lead.name}</h2>
                    <Badge
                        variant={statusToneBadgeVariant(leadStatusTone(lead.status))}
                        className={cn(isLeadStageMuted(lead.status) && 'opacity-60')}
                    >
                        {leadStatusLabel(lead.status)}
                    </Badge>
                </div>
                <p className="text-xs text-(--color-fg-muted)">{row.followUpLabel}</p>
            </div>

            <ContactActions phone={lead.phone} />

            <WorkQueueRailSection title="Pipeline stage">
                <Select
                    value={lead.status}
                    onValueChange={(value) => onStatusChange(lead.id, value as LeadStatus)}
                    disabled={rowActionsPending}
                >
                    <SelectTrigger className="w-full" aria-label={`Stage for ${lead.name}`}>
                        {/* Base UI shows the raw value without a render-prop. */}
                        <SelectValue>{(value: string) => leadStatusLabel(value as LeadStatus)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {LEAD_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                                {leadStatusLabel(status)}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </WorkQueueRailSection>

            {/* Keyed on the lead: without this the form keeps the previous
                lead's typed values when the selection moves. */}
            <LeadEditForm key={lead.id} row={row} disabled={rowActionsPending} />

            <WorkQueueRailSection title="Danger zone">
                <ConfirmActionDialog
                    trigger={<Button type="button" variant="destructive" className="w-full" />}
                    title={`Delete ${lead.name}?`}
                    description="The lead leaves the pipeline along with its notes and follow-up date. Capturing them again starts a blank record."
                    confirmLabel="Delete lead"
                    disabled={rowActionsPending}
                    onConfirm={() => onDelete(lead.id)}
                >
                    Delete lead
                </ConfirmActionDialog>
            </WorkQueueRailSection>
        </WorkQueueRailPanel>
    );
}

function LeadEditForm({ row, disabled }: { row: LeadRow; disabled: boolean }) {
    const { lead } = row;
    const [name, setName] = useState(lead.name);
    const [phone, setPhone] = useState(lead.phone);
    const [source, setSource] = useState(lead.source ?? '');
    const [interest, setInterest] = useState(lead.interest ?? '');
    const [notes, setNotes] = useState(lead.notes ?? '');
    const [followUpDate, setFollowUpDate] = useState(lead.followUpDate ?? '');

    // Safe to own here: a save never removes the row, so this component stays
    // mounted through the round trip and keeps its own error.
    const updateLead = useUpdateLead();
    const error = updateLead.error?.message ?? null;
    const warning = updateLead.data?.ok ? (updateLead.data.warning ?? null) : null;
    const saved = updateLead.isSuccess && !warning;

    function handleSave(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        updateLead.mutate({
            leadId: lead.id,
            name,
            phone,
            source,
            interest,
            notes,
            followUpDate: followUpDate || null,
        });
    }

    return (
        <form onSubmit={handleSave}>
            <WorkQueueRailSection title="Details">
                <div className="space-y-3">
                    <RailField id={`lead-name-${lead.id}`} label="Name">
                        <Input
                            id={`lead-name-${lead.id}`}
                            required
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                        />
                    </RailField>
                    <RailField id={`lead-phone-${lead.id}`} label="Phone">
                        <Input
                            id={`lead-phone-${lead.id}`}
                            required
                            inputMode="tel"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                        />
                    </RailField>
                    <RailField id={`lead-followup-${lead.id}`} label="Follow-up date">
                        <Input
                            id={`lead-followup-${lead.id}`}
                            type="date"
                            value={followUpDate}
                            onChange={(event) => setFollowUpDate(event.target.value)}
                        />
                    </RailField>
                    <div className="grid grid-cols-2 gap-2">
                        <RailField id={`lead-source-${lead.id}`} label="Source">
                            <Input
                                id={`lead-source-${lead.id}`}
                                value={source}
                                onChange={(event) => setSource(event.target.value)}
                            />
                        </RailField>
                        <RailField id={`lead-interest-${lead.id}`} label="Interest">
                            <Input
                                id={`lead-interest-${lead.id}`}
                                value={interest}
                                onChange={(event) => setInterest(event.target.value)}
                            />
                        </RailField>
                    </div>
                    <RailField id={`lead-notes-${lead.id}`} label="Notes">
                        <Textarea
                            id={`lead-notes-${lead.id}`}
                            rows={3}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </RailField>

                    {error ? (
                        <p role="alert" className="text-sm text-(--color-danger)">
                            {error}
                        </p>
                    ) : null}
                    {warning ? (
                        <p role="status" className="text-sm text-(--color-fg-muted)">
                            {warning}
                        </p>
                    ) : null}

                    <div className="flex items-center gap-2">
                        <Button type="submit" size="sm" disabled={disabled || updateLead.isPending}>
                            {updateLead.isPending ? 'Saving…' : 'Save changes'}
                        </Button>
                        {saved ? (
                            <span role="status" className="text-xs text-(--color-fg-muted)">
                                Saved
                            </span>
                        ) : null}
                    </div>
                </div>
            </WorkQueueRailSection>
        </form>
    );
}

function RailField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <label htmlFor={id} className="block text-xs font-medium text-(--color-fg-muted)">
                {label}
            </label>
            {children}
        </div>
    );
}
