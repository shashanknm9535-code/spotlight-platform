import type { RegistrationFormData, RegistrationResult } from '../types';

/**
 * Mock registration submission service for Phase 2.
 * Simulates async network delay and returns a generated Act ID payload.
 * Ready to be swapped with Supabase client in later phases.
 */
export const submitPerformerRegistration = async (
  formData: RegistrationFormData
): Promise<RegistrationResult> => {
  // Simulate network latency (1000ms)
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Generate dynamic mock Act ID: SPT-2026-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const actId = `SPT-2026-${randomSuffix}`;

  const result: RegistrationResult = {
    actId,
    submittedAt: new Date().toISOString(),
    status: 'PENDING REVIEW',
    formData: { ...formData },
  };

  return result;
};
