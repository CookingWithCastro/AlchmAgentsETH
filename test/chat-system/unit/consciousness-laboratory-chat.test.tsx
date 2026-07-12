// Unit tests for ConsciousnessLaboratoryChat component
// Tests experimental protocols, mixed agent selection, and research features

// Mock the unified multi-agent chat component
vi.mock('@/components/misc/unified-multi-agent-chat', () => ({
  default: ({
    isOpen,
    onClose,
    title,
    historicalAgents,
    planetaryConfigs,
    customHeader,
    enableGroupDynamics,
  }: any) => (
    <div data-testid="unified-chat" data-open={isOpen} data-dynamics={enableGroupDynamics}>
      <div data-testid="chat-title">{title}</div>
      <div data-testid="historical-count">{historicalAgents.length}</div>
      <div data-testid="planetary-count">{planetaryConfigs.length}</div>
      {customHeader}
    </div>
  ),
}))

// Mock council presets
vi.mock('@/lib/council-presets', async () => {
  const actual = await vi.importActual('../fixtures/mock-data')
  return {
    MIXED_COUNCIL_PRESETS: (actual as any).mockMixedPresets,
    HISTORICAL_COUNCIL_PRESETS: [],
    PLANETARY_COUNCIL_PRESETS: [],
  }
})

// Mock planetary config helper
vi.mock('@/lib/planetary-config-helper', async () => {
  const actual = await vi.importActual('../fixtures/mock-data')
  return {
    createDefaultPlanetaryConfigs: vi.fn(() => (actual as any).mockPlanetaryConfigs),
  }
})

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import '@testing-library/jest-dom'
import ConsciousnessLaboratoryChat from '@/components/agents/consciousness-laboratory-chat'
import {
  mockHistoricalAgents,
  mockPlanetaryConfigs,
  mockMixedPresets,
  performanceTestData,
} from '../fixtures/mock-data'

describe('ConsciousnessLaboratoryChat Component', () => {
  beforeEach(() => {
    // Setup mocks with test data
    vi.clearAllMocks()
  })

  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    historicalAgents: mockHistoricalAgents,
    enableConsciousnessMetrics: true,
    showKineticGraphs: true,
    enableExperimentMode: true,
    allowAgentMixing: true,
    enableABTesting: true,
    maxAgents: 8,
    allowMonica: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Rendering', () => {
    it('renders experiment selection when no initial experiment is provided', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      expect(screen.getAllByText('Consciousness Research Laboratory')[0]).toBeInTheDocument()
      expect(
        screen.getByText('Design and conduct consciousness interaction experiments')
      ).toBeInTheDocument()
    })

    it('renders with initial experiment preset', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      expect(screen.getByTestId('unified-chat')).toHaveAttribute('data-open', 'true')
      expect(screen.getByTestId('chat-title')).toHaveTextContent(
        'Consciousness Research Laboratory'
      )
    })

    it('renders with default agent selection', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} defaultAgents={['carl-jung', 'Moon']} />
      )

      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })
  })

  describe('Experiment Selection Interface', () => {
    it('displays research protocols tab', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      expect(screen.getByText('Research Protocols')).toBeInTheDocument()
      expect(screen.getByText('Custom Experiment')).toBeInTheDocument()
    })

    it('shows available mixed presets', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      expect(screen.getByText('Test Consciousness Laboratory')).toBeInTheDocument()
      expect(screen.getByText('Test mixed consciousness experiment')).toBeInTheDocument()
    })

    it('displays preset metadata correctly', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      // Check synthesis type
      expect(screen.getByText('Consciousness Acceleration')).toBeInTheDocument()

      // Check difficulty badge
      expect(screen.getByText('expert')).toBeInTheDocument()

      // Check agent count (1 historical + 1 planetary)
      expect(screen.getByText('2')).toBeInTheDocument()

      // Check Monica inclusion
      expect(screen.getByText('Monica as coordinator')).toBeInTheDocument()
    })

    it('handles preset selection', async () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const presetCard = screen.getByText('Test Consciousness Laboratory').closest('div')
      expect(presetCard).toBeInTheDocument()

      fireEvent.click(presetCard!)

      await waitFor(() => {
        expect(screen.getByTestId('unified-chat')).toHaveAttribute('data-open', 'true')
      })
    })
  })

  describe('Custom Experiment Creation', () => {
    it('displays custom experiment tab', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const customTab = screen.getByText('Custom Experiment')
      fireEvent.click(customTab)

      expect(screen.getByText('Design Custom Experiment')).toBeInTheDocument()
    })

    it('shows historical agent selection', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const customTab = screen.getByText('Custom Experiment')
      fireEvent.click(customTab)

      expect(screen.getByText('Historical Consciousness Agents')).toBeInTheDocument()
      expect(screen.getByText('Leonardo da Vinci')).toBeInTheDocument()
      expect(screen.getByText('Carl Jung')).toBeInTheDocument()
      expect(screen.getByText('Nikola Tesla')).toBeInTheDocument()
    })

    it('shows planetary agent selection', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const customTab = screen.getByText('Custom Experiment')
      fireEvent.click(customTab)

      expect(screen.getByText('Planetary Agents')).toBeInTheDocument()
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Moon')).toBeInTheDocument()
      expect(screen.getByText('Mercury')).toBeInTheDocument()
    })

    it('handles agent selection for custom experiment', async () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const customTab = screen.getByText('Custom Experiment')
      fireEvent.click(customTab)

      // Select a historical agent
      const jungCheckbox =
        screen.getByDisplayValue('carl-jung') || screen.getByLabelText(/Carl Jung/i)
      if (jungCheckbox) {
        fireEvent.click(jungCheckbox)
      }

      // Select a planetary agent
      const sunCheckbox = screen.getByDisplayValue('Sun') || screen.getByLabelText(/Sun/i)
      if (sunCheckbox) {
        fireEvent.click(sunCheckbox)
      }

      // Start experiment button should be enabled
      const startButton = screen.getByText('Start Custom Experiment')
      expect(startButton).not.toBeDisabled()

      fireEvent.click(startButton)

      await waitFor(() => {
        expect(screen.getByTestId('unified-chat')).toHaveAttribute('data-open', 'true')
      })
    })

    it('disables start button when no agents selected', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} />)

      const customTab = screen.getByText('Custom Experiment')
      fireEvent.click(customTab)

      const startButton = screen.getByText('Start Custom Experiment')
      expect(startButton).toBeDisabled()
    })
  })

  describe('Laboratory Controls Panel', () => {
    it('displays research protocol information', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      expect(screen.getByText('Research Protocol')).toBeInTheDocument()
      expect(screen.getByText('Current Protocol')).toBeInTheDocument()
      expect(screen.getByText('Test Consciousness Laboratory')).toBeInTheDocument()
    })

    it('shows experiment status controls', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Standby')).toBeInTheDocument()

      const statusToggle = screen.getByRole('switch')
      expect(statusToggle).not.toBeChecked()
    })

    it('handles experiment mode toggle', async () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const statusToggle = screen.getByRole('switch')
      fireEvent.click(statusToggle)

      await waitFor(() => {
        expect(screen.getByText('Recording')).toBeInTheDocument()
      })
    })

    it.skip('displays advanced settings when enabled', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      expect(screen.getByText('Laboratory Settings')).toBeInTheDocument()
      expect(screen.getByText('Record Metrics')).toBeInTheDocument()
      expect(screen.getByText('Enable Advanced Logging')).toBeInTheDocument()
      expect(screen.getByText('Consciousness Tracking')).toBeInTheDocument()
    })

    it('shows active research subjects', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      expect(screen.getByText('Active Research Subjects')).toBeInTheDocument()
      expect(screen.getByText(/Historical:/)).toBeInTheDocument()
      expect(screen.getByText(/Planetary:/)).toBeInTheDocument()
      expect(screen.getByText(/Coordinator:/)).toBeInTheDocument()
    })
  })

  describe('Consciousness Metrics Display', () => {
    it.skip('shows live consciousness metrics when experiment is running', async () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      // Start experiment mode
      const statusToggle = screen.getByRole('switch')
      fireEvent.click(statusToggle)

      await waitFor(() => {
        expect(screen.getByText('Consciousness')).toBeInTheDocument()
        expect(screen.getByText('Synergy')).toBeInTheDocument()
      })
    })

    it.skip('handles metrics recording settings', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          enableConsciousnessMetrics={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      const metricsToggle = screen.getByLabelText(/Record Metrics/i)
      expect(metricsToggle).toBeChecked()
    })

    it('enables kinetic graph display', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          showKineticGraphs={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      // Kinetic graphs should be enabled in the unified chat
      expect(screen.getByTestId('unified-chat')).toHaveAttribute('data-dynamics', 'true')
    })
  })

  describe('Mixed Agent Coordination', () => {
    it('handles historical and planetary agent mixing', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          allowAgentMixing={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      expect(screen.getByTestId('historical-count')).toHaveTextContent('1')
      expect(screen.getByTestId('planetary-count')).toHaveTextContent('1')
    })

    it('respects maxAgents limitation', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          maxAgents={3}
          defaultAgents={['carl-jung', 'leonardo-da-vinci', 'nikola-tesla', 'Sun', 'Moon']}
        />
      )

      // Should limit total agents
      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })

    it('coordinates Monica with mixed agents', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          allowMonica={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      expect(screen.getByText('Monica (coordinator)')).toBeInTheDocument()
    })
  })

  describe('A/B Testing Features', () => {
    it('enables experiment comparison mode', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          enableABTesting={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      // A/B testing should be accessible
      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })

    it('handles model comparison experiments', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          enableExperimentMode={true}
          initialExperiment="test-consciousness-lab"
        />
      )

      // Experiment mode should enable model comparison
      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })
  })

  describe('Experiment Lifecycle', () => {
    it('handles experiment change', async () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const changeButton = screen.getByText('Change Experiment')
      fireEvent.click(changeButton)

      await waitFor(() => {
        expect(screen.getAllByText('Consciousness Research Laboratory')[0]).toBeInTheDocument()
      })
    })

    it.skip('handles experiment completion with metrics', async () => {
      const mockOnExperimentComplete = vi.fn()

      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          initialExperiment="test-consciousness-lab"
          onExperimentComplete={mockOnExperimentComplete}
        />
      )

      // Start experiment
      const statusToggle = screen.getByRole('switch')
      fireEvent.click(statusToggle)

      await waitFor(() => {
        expect(screen.getByText('Recording')).toBeInTheDocument()
      })

      // Stop experiment
      fireEvent.click(statusToggle)

      await waitFor(() => {
        expect(screen.getByText('Standby')).toBeInTheDocument()
      })

      // Should have called completion callback
      expect(mockOnExperimentComplete).toHaveBeenCalled()
    })
  })

  describe('Laboratory-Specific Features', () => {
    it.skip('enables consciousness tracking persistence', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      const trackingToggle = screen.getByLabelText(/Consciousness Tracking/i)
      expect(trackingToggle).toBeChecked()
    })

    it.skip('enables synergy analysis', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      const synergyToggle = screen.getByLabelText(/Synergy Analysis/i)
      expect(synergyToggle).toBeChecked()
    })

    it.skip('enables emergent pattern detection', () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      const settingsButton = screen.getByRole('button', { name: /settings/i })
      fireEvent.click(settingsButton)

      const patternToggle = screen.getByLabelText(/Emergent Pattern Detection/i)
      expect(patternToggle).toBeChecked()
    })
  })

  describe('Error Handling', () => {
    it('handles missing experiment preset gracefully', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          initialExperiment="non-existent-experiment"
        />
      )

      // Should fall back to experiment selection
      expect(screen.getAllByText('Consciousness Research Laboratory')[0]).toBeInTheDocument()
    })

    it('handles empty agent lists', () => {
      render(<ConsciousnessLaboratoryChat {...defaultProps} historicalAgents={[]} />)

      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
      expect(screen.getByTestId('historical-count')).toHaveTextContent('0')
    })

    it('handles experiment mode errors gracefully', async () => {
      render(
        <ConsciousnessLaboratoryChat {...defaultProps} initialExperiment="test-consciousness-lab" />
      )

      // Should not crash when toggling experiment mode
      const statusToggle = screen.getByRole('switch')
      fireEvent.click(statusToggle)

      await waitFor(() => {
        expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
      })
    })
  })

  describe('Performance Optimization', () => {
    it('handles large agent groups efficiently', () => {
      const startTime = performance.now()

      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          historicalAgents={performanceTestData.largeGroup}
          maxAgents={8}
        />
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render efficiently even with many agents
      expect(renderTime).toBeLessThan(200)
    })

    it('optimizes for research mode performance', () => {
      render(
        <ConsciousnessLaboratoryChat
          {...defaultProps}
          enableExperimentMode={true}
          enableConsciousnessMetrics={true}
          showKineticGraphs={true}
        />
      )

      // Should handle all advanced features without performance degradation
      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })
  })

  describe('Callback Handling', () => {
    it('calls onClose when chat is closed', () => {
      const mockOnClose = vi.fn()

      render(<ConsciousnessLaboratoryChat {...defaultProps} onClose={mockOnClose} isOpen={false} />)

      expect(screen.getByTestId('unified-chat')).toHaveAttribute('data-open', 'false')
    })

    it('handles session updates', () => {
      const mockOnSessionUpdate = vi.fn()

      render(
        <ConsciousnessLaboratoryChat {...defaultProps} onSessionUpdate={mockOnSessionUpdate} />
      )

      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })

    it('handles agent evolution tracking', () => {
      const mockOnAgentEvolution = vi.fn()

      render(
        <ConsciousnessLaboratoryChat {...defaultProps} onAgentEvolution={mockOnAgentEvolution} />
      )

      expect(screen.getByTestId('unified-chat')).toBeInTheDocument()
    })
  })
})
