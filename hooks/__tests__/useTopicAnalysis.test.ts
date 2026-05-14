import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTopicAnalysis } from '../useTopicAnalysis'

describe('useTopicAnalysis', () => {
  const mockOptions = {
    locale: 'zh' as const,
    t: (key: string) => key,
    isPaywalled: false,
    cost: 1
  }

  const mockCallbacks = {
    recordAnalysisTimestamp: vi.fn(),
    incrementUserAnalysisCount: vi.fn(),
    updateTopicHistory: vi.fn(),
    checkRateLimit: vi.fn(() => false),
    useCredits: vi.fn((amount: number) => 99),
    addCredits: vi.fn((amount: number) => 100)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useTopicAnalysis(mockOptions, mockCallbacks))

    expect(result.current.userInput).toBe('')
    expect(result.current.analysisReport).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('should update user input', () => {
    const { result } = renderHook(() => useTopicAnalysis(mockOptions, mockCallbacks))

    act(() => {
      result.current.setUserInput('AI 投资')
    })

    expect(result.current.userInput).toBe('AI 投资')
  })

  it('should clear analysis', () => {
    const { result } = renderHook(() => useTopicAnalysis(mockOptions, mockCallbacks))

    act(() => {
      result.current.clearAnalysis()
    })

    expect(result.current.analysisReport).toBeNull()
    expect(result.current.error).toBeNull()
  })
})
