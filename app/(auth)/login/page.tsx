import { redirect } from 'next/navigation';

import { LoginForm } from '@/modules/auth/components/login-form';
import { createAppServices } from '@/lib/api/composition';
import { getSession } from '@/lib/auth/session';
import { resolvePostAuthPath } from '@/modules/auth/resolve-post-auth-path';

export default async function LoginPage() {
    const session = await getSession();
    if (session) {
        let gymOrgCount = 0;
        if (session.lane === 'STAFF') {
            try {
                const { listGymOrgs } = createAppServices();
                const { gymOrgs } = await listGymOrgs({
                    accessToken: session.accessToken,
                });
                gymOrgCount = gymOrgs.length;
            } catch {
                gymOrgCount = 0;
            }
        }
        redirect(resolvePostAuthPath({ lane: session.lane, gymOrgCount }));
    }

    return (
        <div className="space-y-7">
            <div>
                <h1 className="text-3xl font-semibold tracking-tight text-(--color-fg)">Sign in</h1>
                <p className="mt-2 text-sm leading-relaxed text-(--color-fg-muted)">
                    Email code or Google — there is no separate sign-up. New accounts pick Staff or Member once;
                    returning users keep the same type.
                </p>
            </div>
            <LoginForm />
        </div>
    );
}
