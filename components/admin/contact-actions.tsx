import { Mail, MessageCircle, Phone } from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Reach the person the rail is about. Shared because two surfaces want the
 * identical affordance for different domains — a renewals member and a CRM
 * lead — and the interesting part (India-first: WhatsApp is the channel an
 * Indian gym actually uses, not email) should not be decided twice.
 *
 * Renders only the channels that exist. A member with no phone gets email
 * alone, never a dead `tel:` link.
 */

/** `wa.me` wants digits only, no `+` and no separators. */
export function whatsappHref(phone: string): string {
    return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

const linkClass = cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'flex-1 justify-center');

export function ContactActions({ phone, email }: { phone?: string | null; email?: string | null }) {
    if (!phone && !email) {
        return null;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {phone ? (
                <>
                    <a className={linkClass} href={`tel:${phone}`}>
                        <Phone aria-hidden />
                        Call
                    </a>
                    <a className={linkClass} href={whatsappHref(phone)} target="_blank" rel="noreferrer noopener">
                        <MessageCircle aria-hidden />
                        WhatsApp
                    </a>
                </>
            ) : null}
            {email ? (
                <a className={linkClass} href={`mailto:${email}`}>
                    <Mail aria-hidden />
                    Email
                </a>
            ) : null}
        </div>
    );
}
