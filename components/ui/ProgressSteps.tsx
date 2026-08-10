/**
 * components/ui/ProgressSteps.tsx
 *
 * §2.6 — ProgressSteps primitive to show form completion step (e.g. 1 of 3).
 * ARIA: role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax.
 */

interface ProgressStepsProps {
  currentStep: number // 1, 2, or 3
  totalSteps?: number
  stepsLabels?: string[]
}

export function ProgressSteps({
  currentStep,
  totalSteps = 3,
  stepsLabels = ['Personal Details', 'Academic Status', 'Resume & Review'],
}: ProgressStepsProps) {
  const percentage = (currentStep / totalSteps) * 100

  return (
    <div
      className="flex flex-col gap-[--spacing-s3] w-full"
      role="progressbar"
      aria-label="Application Progress"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={`Step ${currentStep} of ${totalSteps}: ${stepsLabels[currentStep - 1]}`}
    >
      {/* Step Numbers & Labels */}
      <div className="flex justify-between items-center text-[--font-size-step--1]">
        <div className="flex items-center gap-[--spacing-s2] font-mono text-[--color-marigold]">
          <span className="font-bold">0{currentStep}</span>
          <span className="opacity-50">/</span>
          <span className="opacity-50">0{totalSteps}</span>
        </div>
        <span className="font-medium text-[--color-ink-900] tracking-wide uppercase font-mono">
          {stepsLabels[currentStep - 1]}
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="h-[3px] w-full bg-[--color-ink-900]/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-[--color-marigold] transition-all duration-[--duration-slow] ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step dots for context */}
      <div className="flex gap-[--spacing-s2] mt-[--spacing-s1]">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep

          return (
            <div
              key={stepNum}
              className={[
                'h-[6px] w-[6px] rounded-full transition-colors duration-[--duration-base]',
                isCompleted
                  ? 'bg-[--color-ink-900]'
                  : isActive
                    ? 'bg-[--color-marigold]'
                    : 'bg-[--color-ink-900]/15',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            />
          )
        })}
      </div>
    </div>
  )
}
