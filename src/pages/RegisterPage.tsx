import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ActCategory, RegistrationFormData, RegistrationResult, TeamMember } from '../types';
import { submitPerformerRegistration } from '../services/registrationService';
import { PageContainer } from '../components/ui/PageContainer';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { RegistrationProgress } from '../components/registration/RegistrationProgress';
import { StepActType } from '../components/registration/StepActType';
import { StepPerformerDetails } from '../components/registration/StepPerformerDetails';
import { StepPerformanceDetails } from '../components/registration/StepPerformanceDetails';
import { StepPhotoRating } from '../components/registration/StepPhotoRating';
import { RegistrationReview } from '../components/registration/RegistrationReview';
import { RegistrationSuccess } from '../components/registration/RegistrationSuccess';
import { ArrowLeft, ArrowRight } from 'lucide-react';

const STEP_TITLES = [
  'ACT TYPE',
  'PERFORMER DETAILS',
  'PERFORMANCE',
  'PHOTO & RATING',
  'REVIEW',
];

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const trackParam = searchParams.get('track');

  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<RegistrationResult | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<RegistrationFormData>({
    category: trackParam === 'solo' || trackParam === 'group' ? (trackParam as ActCategory) : null,
    name: '',
    department: '',
    year: '',
    phone: '',
    email: '',
    performanceType: '',
    otherPerformanceType: '',
    blurb: '',
    photo: null,
    photoPreview: null,
    selfRating: 8,
    teamMembers: [],
    isConfirmed: false,
  });

  // Scroll to top on step transition
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Update Field Handler
  const handleFieldChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Team Member Management
  const handleAddTeamMember = () => {
    if (formData.teamMembers.length >= 11) return;
    const newMember: TeamMember = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      department: '',
      year: '',
    };
    setFormData((prev) => ({
      ...prev,
      teamMembers: [...prev.teamMembers, newMember],
    }));
    if (errors.teamMembers) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.teamMembers;
        return next;
      });
    }
  };

  const handleRemoveTeamMember = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.filter((m) => m.id !== id),
    }));
  };

  const handleUpdateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setFormData((prev) => ({
      ...prev,
      teamMembers: prev.teamMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    }));
  };

  // Photo Select Handler
  const handleSelectPhoto = (file: File | null, previewUrl: string | null) => {
    setFormData((prev) => ({
      ...prev,
      photo: file,
      photoPreview: previewUrl,
    }));
    if (errors.photo) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.photo;
        return next;
      });
    }
  };

  // Step Validation Logic
  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!formData.category) {
        newErrors.category = 'Please select an act category (Solo or Group) to continue.';
      }
    }

    if (currentStep === 2) {
      if (!formData.name.trim()) newErrors.name = 'Full name is required.';
      if (!formData.department) newErrors.department = 'Department is required.';
      if (!formData.year) newErrors.year = 'Academic year is required.';
      if (!formData.phone.trim() || formData.phone.length < 8) {
        newErrors.phone = 'Valid phone number is required.';
      }
      if (!formData.email.trim() || !formData.email.includes('@')) {
        newErrors.email = 'Valid email address is required.';
      }

      if (formData.category === 'group') {
        if (formData.teamMembers.length === 0) {
          newErrors.teamMembers = 'Group acts require at least 1 additional team member.';
        } else {
          const incompleteMember = formData.teamMembers.find(
            (m) => !m.name.trim() || !m.department || !m.year
          );
          if (incompleteMember) {
            newErrors.teamMembers = 'All team members must have a Name, Department, and Year filled out.';
          }
        }
      }
    }

    if (currentStep === 3) {
      if (!formData.performanceType) {
        newErrors.performanceType = 'Please select a performance category.';
      }
      if (formData.performanceType === 'Other' && !formData.otherPerformanceType?.trim()) {
        newErrors.otherPerformanceType = 'Please specify your custom performance category.';
      }
      if (!formData.blurb.trim() || formData.blurb.trim().length < 15) {
        newErrors.blurb = 'Please provide an act description (minimum 15 characters).';
      }
    }

    if (currentStep === 4) {
      if (!formData.photoPreview) {
        newErrors.photo = 'A spotlight stage photo is required.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navigation Button Click
  const handleNextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    }
  };

  // Final Form Submission
  const handleSubmitRegistration = async () => {
    if (!formData.isConfirmed) {
      setErrors({ confirm: 'You must confirm that your information is accurate.' });
      return;
    }

    // Full validation before sending
    let isValid = true;
    for (let s = 1; s <= 4; s++) {
      if (!validateStep(s)) {
        isValid = false;
        setStep(s);
        return;
      }
    }

    if (!isValid) return;

    setIsSubmitting(true);
    try {
      const result = await submitPerformerRegistration(formData);
      setSubmissionResult(result);
      setStep(6); // Success screen
    } catch (err) {
      setErrors({ submit: 'An error occurred submitting registration. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen pt-32 pb-24 bg-[#08080C] bg-noise">
      <PageContainer size="wide">
        {/* EDITORIAL PAGE HEADER */}
        {step < 6 && (
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <div className="inline-block mb-3">
              <Badge variant="gold">PERFORMER REGISTRATION</Badge>
            </div>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black text-white uppercase tracking-tight leading-[0.95] mb-4">
              TAKE YOUR PLACE IN THE <span className="text-amber-400 spotlight-text-glow">SPOTLIGHT.</span>
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 font-sans max-w-xl mx-auto leading-relaxed">
              Tell us about your act. We'll take it from here.
            </p>
          </div>
        )}

        {/* STEP PROGRESS BAR */}
        {step < 6 && (
          <RegistrationProgress
            currentStep={step}
            totalSteps={5}
            stepTitles={STEP_TITLES}
            onStepClick={(targetStep) => {
              if (targetStep < step) {
                setStep(targetStep);
              }
            }}
          />
        )}

        {/* ACTIVE STEP CONTENT */}
        <div className="mb-12">
          {step === 1 && (
            <StepActType
              selectedCategory={formData.category}
              onSelectCategory={(cat) => handleFieldChange('category', cat)}
              error={errors.category}
            />
          )}

          {step === 2 && formData.category && (
            <StepPerformerDetails
              category={formData.category}
              name={formData.name}
              department={formData.department}
              year={formData.year}
              phone={formData.phone}
              email={formData.email}
              teamMembers={formData.teamMembers}
              errors={errors}
              onChangeField={handleFieldChange}
              onAddTeamMember={handleAddTeamMember}
              onRemoveTeamMember={handleRemoveTeamMember}
              onUpdateTeamMember={handleUpdateTeamMember}
            />
          )}

          {step === 3 && (
            <StepPerformanceDetails
              performanceType={formData.performanceType}
              otherPerformanceType={formData.otherPerformanceType || ''}
              blurb={formData.blurb}
              errors={errors}
              onChangeField={handleFieldChange}
            />
          )}

          {step === 4 && (
            <StepPhotoRating
              photo={formData.photo}
              photoPreview={formData.photoPreview}
              selfRating={formData.selfRating}
              errors={errors}
              onSelectPhoto={handleSelectPhoto}
              onChangeRating={(r) => handleFieldChange('selfRating', r)}
            />
          )}

          {step === 5 && (
            <RegistrationReview
              formData={formData}
              isSubmitting={isSubmitting}
              onEditStep={(targetStep) => setStep(targetStep)}
              onToggleConfirm={(conf) => handleFieldChange('isConfirmed', conf)}
              onSubmit={handleSubmitRegistration}
              error={errors.submit}
            />
          )}

          {step === 6 && submissionResult && (
            <RegistrationSuccess result={submissionResult} />
          )}
        </div>

        {/* BOTTOM NAVIGATION BUTTONS (FOR STEPS 1 TO 4) */}
        {step >= 1 && step <= 4 && (
          <div className="max-w-4xl mx-auto flex items-center justify-between pt-6 border-t border-[#1C1C2A]">
            {step > 1 ? (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handlePrevStep}
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleNextStep}
              icon={<ArrowRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          </div>
        )}
      </PageContainer>
    </main>
  );
};
