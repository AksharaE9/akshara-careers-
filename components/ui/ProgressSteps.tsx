/**
 * components/ui/ProgressSteps.tsx
 *
 * §2.6 & §21.1 — ProgressSteps primitive to show form completion step with high visual contrast.
 * Uses --color-rust (#A8432A) for step counter and progress fill.
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
      className="flex flex-col gap-2.5 w-full"
      role="progressbar"
      aria-label="Application Progress"
      aria-valuenow={currentStep}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuetext={`Step ${currentStep} of ${totalSteps}: ${stepsLabels[currentStep - 1]}`}
    >
      {/* Step Numbers & Labels */}
      <div className="flex justify-between items-center text-[clamp(0.80rem,0.77rem+0.15vw,0.89rem)]">
        <div className="flex items-center gap-1.5 font-mono text-(--color-rust) font-bold">
          <span>0{currentStep}</span>
          <span className="text-(--color-muted)">/</span>
          <span className="text-(--color-muted)">0{totalSteps}</span>
        </div>
        <span className="font-bold text-(--color-ink) tracking-wider uppercase font-mono text-[clamp(0.69rem,0.66rem+0.12vw,0.78rem)]">
          {stepsLabels[currentStep - 1]}
        </span>
      </div>

      {/* Progress Bar Container */}
      <div className="h-[5px] w-full bg-(--color-hairline) rounded-full overflow-hidden">
        <div
          className="h-full bg-(--color-rust) transition-all duration-300 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Step dots for context */}
      <div className="flex gap-2 mt-0.5">
        {Array.from({ length: totalSteps }).map((_, idx) => {
          const stepNum = idx + 1
          const isActive = stepNum === currentStep
          const isCompleted = stepNum < currentStep

          return (
            <div
              key={stepNum}
              className={[
                'h-[6px] w-[6px] rounded-full transition-colors duration-150',
                isCompleted || isActive
                  ? 'bg-(--color-rust)'
                  : 'bg-(--color-hairline)',
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
