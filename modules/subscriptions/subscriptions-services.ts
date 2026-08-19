import type { HttpClient } from '@/lib/api/client';
import { areE2eFixturesEnabled } from '@/lib/api/e2e/store';
import { createE2eSubscriptionsAdapter } from '@/modules/subscriptions/subscriptions-e2e-fixtures';
import { createSubscriptionsAdapter } from '@/modules/subscriptions/subscriptions-adapter';
import {
    createListClientSubscriptions,
    createListRenewalsDue,
    createUpdateSubscriptionPayment,
} from '@/modules/subscriptions/subscriptions-use-cases';

/** Binds the subscriptions port to its adapter and use-cases (ADR-0007). */
export function subscriptionsServices(http: HttpClient) {
    const subscriptions = areE2eFixturesEnabled() ? createE2eSubscriptionsAdapter() : createSubscriptionsAdapter(http);
    return {
        subscriptions,
        listRenewalsDue: createListRenewalsDue({ subscriptions }),
        listClientSubscriptions: createListClientSubscriptions({ subscriptions }),
        updateSubscriptionPayment: createUpdateSubscriptionPayment({
            subscriptions,
        }),
    };
}
