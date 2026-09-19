import type { RegistrationFormData, RegistrationResult } from '../types';
// TODO(Phase 8B): import { supabase, isSupabaseEnabled } from '@/lib/supabase/client';

/**
 * Mock registration submission service for Phase 2.
 * Simulates async network delay and returns a generated Act ID payload.
 *
 * Phase 8B Integration Path:
 *   if (isSupabaseEnabled && supabase) {
 *     const { data, error } = await supabase.from('acts').insert({
 *       act_code: actId,
 *       category: formData.category?.toUpperCase(),
 *       title: formData.performanceType,
 *       performer_name: formData.name,
 *       department: formData.department,
 *       year: formData.year,
 *       phone: formData.phone,
 *       email: formData.email,
 *       bio: formData.blurb,
 *       self_rating: formData.selfRating,
 *       status: 'PENDING',
 *     }).select().single();
 *     if (data) {
 *       // insert act_members if group
 *       // upload photo to performer-photos bucket
 *       return { actId: data.act_code, ... };
 *     }
 *   }
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

