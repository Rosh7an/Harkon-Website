'use client'

import { useEffect, useState } from 'react'

interface AnimatedHeadingProps {
  text: string
  className?: string
  style?: React.CSSProperties
  initialDelay?: number
}

const CHAR_DELAY = 30

export default function AnimatedHeading({
  text,
  className,
  style,
  initialDelay = 200,
}: AnimatedHeadingProps) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), initialDelay)
    return () => clearTimeout(t)
  }, [initialDelay])

  const lines = text.split('\n')

  return (
    <h1 className={className} style={style}>
      {lines.map((line, lineIndex) => {
        const lineLength = line.length
        return (
          <span key={lineIndex} style={{ display: 'block' }}>
            {line.split('').map((char, charIndex) => {
              const delay = (lineIndex * lineLength * CHAR_DELAY) + (charIndex * CHAR_DELAY)
              return (
                <span
                  key={charIndex}
                  style={{
                    display: 'inline-block',
                    opacity: started ? 1 : 0,
                    transform: started ? 'translateX(0)' : 'translateX(-18px)',
                    transition: `opacity 500ms ${delay}ms, transform 500ms ${delay}ms`,
                  }}
                >
                  {char === ' ' ? ' ' : char}
                </span>
              )
            })}
          </span>
        )
      })}
    </h1>
  )
}
