import type { RegistrationFormData, RegistrationResult, TeamMember } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase/client';
import type { DbAct, DbActMember, ActInsert, ActMemberInsert } from '../types/database';

/**
 * Generates a unique Act Code in the format: SPT-ACT-XXXX
 * e.g., SPT-ACT-4821
 */
export const generateActCode = (): string => {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `SPT-ACT-${randomSuffix}`;
};

/**
 * Uploads a performer stage photo to the `performer-photos` Supabase Storage bucket.
 * Uses a unique folder and filename path: performer-photos/{actCode}/{timestamp}_{random}.{ext}
 */
export const uploadPerformerPhoto = async (
  file: File,
  actCode: string
): Promise<{ filePath: string; publicUrl: string }> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const fileExt = file.name.split('.').pop() || 'jpg';
  const sanitizeExt = fileExt.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
  const uniqueName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${sanitizeExt}`;
  const filePath = `${actCode}/${uniqueName}`;

  const { data, error } = await supabase.storage
    .from('performer-photos')
    .upload(filePath, file, {
      contentType: file.type || `image/${sanitizeExt}`,
      upsert: false,
    });

  if (error || !data) {
    console.error('[RegistrationService] Photo upload failed:', error);
    throw new Error("We couldn't upload your photo. Please try again.");
  }

  const { data: publicUrlData } = supabase.storage
    .from('performer-photos')
    .getPublicUrl(data.path);

  return {
    filePath: data.path,
    publicUrl: publicUrlData.publicUrl,
  };
};

/**
 * Removes an uploaded photo from storage (used for rollback on failure).
 */
export const removeUploadedPhoto = async (filePath: string): Promise<void> => {
  if (!supabase || !filePath) return;
  try {
    await supabase.storage.from('performer-photos').remove([filePath]);
  } catch (err) {
    console.warn('[RegistrationService] Failed to remove photo during rollback:', err);
  }
};

/**
 * Creates an `acts` record in Supabase with status PENDING.
 * Safely handles act_code unique constraint collisions by retrying up to 5 times.
 */
export const createAct = async (
  formData: RegistrationFormData,
  photoUrl: string | null
): Promise<DbAct> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  const perfType =
    formData.performanceType === 'Other'
      ? formData.otherPerformanceType || 'Other'
      : formData.performanceType;

  const maxRetries = 5;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const actId = crypto.randomUUID();
    const code = generateActCode();
    const now = new Date().toISOString();

    const actPayload: ActInsert = {
      id: actId,
      act_code: code,
      category: formData.category === 'group' ? 'GROUP' : 'SOLO',
      title: perfType,
      performer_name: formData.name.trim(),
      department: formData.department || null,
      year: formData.year || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
      photo_url: photoUrl,
      performance_type: perfType,
      bio: formData.blurb.trim() || null,
      self_rating: formData.selfRating,
      status: 'PENDING',
      running_order: null,
    };

    const { error } = await supabase
      .from('acts')
      .insert(actPayload as any);

    if (!error) {
      return {
        ...actPayload,
        created_at: now,
        updated_at: now,
      } as DbAct;
    }

    // Postgres unique constraint violation on act_code or id -> retry with new code & id
    if (error && (error.code === '23505' || error.message?.includes('act_code'))) {
      console.warn(`[RegistrationService] Collision on act_code ${code}. Retrying (${attempt + 1}/${maxRetries})...`);
      lastError = error;
      continue;
    }

    console.error('[RegistrationService] Failed to insert act:', error);
    lastError = error;
    break;
  }

  throw new Error(lastError?.message || "We couldn't submit your registration. Please try again.");
};

/**
 * Deletes a created act record (used for rollback on failure).
 */
export const deleteActRecord = async (actId: string): Promise<void> => {
  if (!supabase || !actId) return;
  try {
    await supabase.from('acts').delete().eq('id', actId);
  } catch (err) {
    console.warn('[RegistrationService] Failed to delete act record during rollback:', err);
  }
};

/**
 * Inserts group member records into `act_members` referencing the created act_id.
 */
export const createActMembers = async (
  actId: string,
  teamMembers: TeamMember[]
): Promise<DbActMember[]> => {
  if (!supabase) {
    throw new Error('Supabase client is not configured.');
  }

  if (teamMembers.length === 0) return [];

  const now = new Date().toISOString();

  const rowsToInsert: ActMemberInsert[] = teamMembers.map((m) => ({
    id: crypto.randomUUID(),
    act_id: actId,
    name: m.name.trim(),
    department: m.department || null,
    year: m.year || null,
  }));

  const { error } = await supabase
    .from('act_members')
    .insert(rowsToInsert as any);

  if (error) {
    console.error('[RegistrationService] Failed to insert act members:', error);
    throw new Error("We couldn't submit your registration team roster. Please try again.");
  }

  return rowsToInsert.map((r) => ({
    id: r.id!,
    act_id: r.act_id,
    name: r.name,
    department: r.department || null,
    year: r.year || null,
    created_at: now,
  })) as DbActMember[];
};

/**
 * Retrieves a single act registration by act_code or UUID.
 */
export const getRegistration = async (actCodeOrId: string): Promise<DbAct | null> => {
  if (!isSupabaseEnabled || !supabase) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actCodeOrId);
  const column = isUuid ? 'id' : 'act_code';

  const { data, error } = await supabase
    .from('acts')
    .select('*, act_members(*)')
    .eq(column, actCodeOrId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
};

/**
 * Main registration submission service.
 * Supports both live Supabase persistence (when VITE_USE_SUPABASE=true)
 * and seamless fallback to mock data (when VITE_USE_SUPABASE=false).
 */
export const submitPerformerRegistration = async (
  formData: RegistrationFormData
): Promise<RegistrationResult> => {
  // ── MOCK MODE FALLBACK ──────────────────────────────────────────────────────
  if (!isSupabaseEnabled || !supabase) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const mockActId = `SPT-2026-${randomSuffix}`;

    return {
      actId: mockActId,
      submittedAt: new Date().toISOString(),
      status: 'PENDING REVIEW',
      formData: { ...formData },
    };
  }

  // ── SUPABASE LIVE PERSISTENCE ───────────────────────────────────────────────
  let uploadedFilePath: string | null = null;
  let createdActId: string | null = null;

  try {
    // 1. Upload photo if provided
    let photoUrl: string | null = formData.photoPreview || null;

    if (formData.photo) {
      const tempActCode = generateActCode();
      const uploadRes = await uploadPerformerPhoto(formData.photo, tempActCode);
      uploadedFilePath = uploadRes.filePath;
      photoUrl = uploadRes.publicUrl;
    }

    // 2. Create Act in Supabase (status = PENDING)
    let createdAct: DbAct;
    try {
      createdAct = await createAct(formData, photoUrl);
      createdActId = createdAct.id;
    } catch (actErr) {
      // Rollback uploaded photo if act creation fails
      if (uploadedFilePath) {
        await removeUploadedPhoto(uploadedFilePath);
      }
      throw actErr;
    }

    // 3. Create Group Members if category === 'group'
    if (formData.category === 'group' && formData.teamMembers.length > 0) {
      try {
        await createActMembers(createdAct.id, formData.teamMembers);
      } catch (membersErr) {
        // Rollback created act and uploaded photo if group member insertion fails
        if (createdActId) {
          await deleteActRecord(createdActId);
        }
        if (uploadedFilePath) {
          await removeUploadedPhoto(uploadedFilePath);
        }
        throw membersErr;
      }
    }

    // 4. Return success result with real Act Code and PENDING REVIEW status
    return {
      actId: createdAct.act_code,
      submittedAt: createdAct.created_at || new Date().toISOString(),
      status: 'PENDING REVIEW',
      formData: { ...formData },
    };
  } catch (err: any) {
    console.error('[RegistrationService] Submission error:', err);
    throw new Error(err?.message || "We couldn't submit your registration. Please try again.");
  }
};
