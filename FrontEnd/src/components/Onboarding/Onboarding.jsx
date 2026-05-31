import { useEffect, useRef } from 'react'

import { ONBOARDING_STEPS } from '../../lib/constants/onboardingSteps.js'
import { useOnboardingStore } from '../../stores/useOnboardingStore.js'

import styles from './Onboarding.module.css'

export const Onboarding = () => {
  const stepIndex = useOnboardingStore((state) => state.stepIndex)
  const nextStep = useOnboardingStore((state) => state.nextStep)
  const skip = useOnboardingStore((state) => state.skip)
  const videoRef = useRef(null)

  const step = ONBOARDING_STEPS[stepIndex]
  const stepCount = ONBOARDING_STEPS.length

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.load()
    const playPromise = video.play()
    if (playPromise?.catch) {
      playPromise.catch(() => {})
    }
  }, [stepIndex, step.videoSrc])

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Знакомство с приложением">
      <div className={styles.page}>
        <div className={styles.videoFrame}>
          <video
            ref={videoRef}
            key={step.id}
            className={styles.video}
            src={step.videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            aria-hidden="true"
          />
        </div>

        <div className={styles.textBlock}>
          <h1 className={styles.title}>{step.title}</h1>
          <p className={styles.description}>{step.description}</p>
        </div>

        <div className={styles.footer}>
          <ul className={styles.dots} aria-label={`Шаг ${stepIndex + 1} из ${stepCount}`}>
            {ONBOARDING_STEPS.map((item, index) => (
              <li
                key={item.id}
                className={[styles.dot, index === stepIndex ? styles.dotActive : null]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={index === stepIndex ? 'step' : undefined}
              />
            ))}
          </ul>

          <button type="button" className={styles.nextButton} onClick={nextStep}>
            Далее
          </button>

          <button type="button" className={styles.skipButton} onClick={skip}>
            Пропустить
          </button>
        </div>
      </div>
    </div>
  )
}
