// Real-time consciousness network visualization using D3.js
// Displays agents as nodes with dynamic connections and flow

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as d3 from 'd3'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Download, RotateCcw, ZoomIn, ZoomOut, Play, Pause, Settings } from 'lucide-react'
import type { UnifiedAgent, GroupDynamics } from '@/lib/unified-agent-types'

interface NetworkNode extends d3.SimulationNodeDatum {
  id: string
  name: string
  type: 'historical' | 'planetary' | 'monica'
  consciousness: number
  element: string
  color: string
  symbol: string
  status: 'idle' | 'thinking' | 'responding' | 'background_processing'
  radius: number
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface NetworkLink extends d3.SimulationLinkDatum<NetworkNode> {
  source: string | NetworkNode
  target: string | NetworkNode
  compatibility: number
  resonanceType: string
  strength: number
  flowIntensity: number
  lastActivity: number
}

interface ConsciousnessNetworkGraphProps {
  agents: UnifiedAgent[]
  groupDynamics?: GroupDynamics
  width?: number
  height?: number
  enableAnimation?: boolean
  showLabels?: boolean
  showMetrics?: boolean
  onNodeClick?: (agent: UnifiedAgent) => void
  onLinkClick?: (connection: any) => void
  className?: string
}

export function ConsciousnessNetworkGraph({
  agents,
  groupDynamics,
  width = 800,
  height = 600,
  enableAnimation = true,
  showLabels = true,
  showMetrics = true,
  onNodeClick,
  onLinkClick,
  className,
}: ConsciousnessNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isPlaying, setIsPlaying] = useState(enableAnimation)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [forceStrength, setForceStrength] = useState([0.3])
  const [nodeRadius, setNodeRadius] = useState([20])
  const [linkDistance, setLinkDistance] = useState([100])
  const [showSettings, setShowSettings] = useState(false)

  // Convert agents to network nodes
  const nodes: NetworkNode[] = agents.map(agent => ({
    id: agent.id,
    name: agent.name,
    type: agent.type,
    consciousness: agent.consciousness.monicaConstant,
    element: agent.consciousness.dominantElement,
    color: agent.appearance?.color || '#6366f1',
    symbol:
      agent.appearance?.symbol || agent.name.charAt(0).toUpperCase() || agent.appearance.avatar,
    status: agent.status,
    radius: nodeRadius[0] + agent.consciousness.monicaConstant * 5,
  }))

  // Convert group dynamics to network links
  const links: NetworkLink[] =
    groupDynamics?.consciousnessNetwork.connections.map(conn => ({
      source: conn.agent1,
      target: conn.agent2,
      compatibility: conn.compatibility,
      resonanceType: conn.resonanceType,
      strength: conn.strength,
      flowIntensity: conn.compatibility * 10,
      lastActivity: Date.now(),
    })) || []

  const setupVisualization = useCallback(() => {
    if (!svgRef.current || nodes.length === 0) return

    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()

    // Create main group for zooming/panning
    const g = svg.append('g').attr('class', 'network-container')

    // Setup zoom behavior
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', event => {
        g.attr('transform', event.transform)
        setZoomLevel(event.transform.k)
      })

    svg.call(zoom as any)

    // Create force simulation
    const simulation = d3
      .forceSimulation<NetworkNode>(nodes)
      .force(
        'link',
        d3
          .forceLink<NetworkNode, NetworkLink>(links)
          .id(d => d.id)
          .distance(linkDistance[0])
          .strength(d => d.strength)
      )
      .force('charge', d3.forceManyBody().strength(-300 * forceStrength[0]))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collision',
        d3.forceCollide().radius(d => (d as NetworkNode).radius + 5)
      )

    // Create gradient definitions for flows
    const defs = svg.append('defs')

    // Flowing gradient for active connections
    const flowGradient = defs
      .append('linearGradient')
      .attr('id', 'flow-gradient')
      .attr('gradientUnits', 'userSpaceOnUse')

    flowGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#3b82f6')
      .attr('stop-opacity', 0.8)

    flowGradient
      .append('stop')
      .attr('offset', '50%')
      .attr('stop-color', '#8b5cf6')
      .attr('stop-opacity', 1)

    flowGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#06b6d4')
      .attr('stop-opacity', 0.8)

    // Create arrow markers for directional flows
    defs
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#666')

    // Create links
    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => (d.compatibility > 0.7 ? 'url(#flow-gradient)' : '#999'))
      .attr('stroke-opacity', d => Math.max(0.3, d.compatibility))
      .attr('stroke-width', d => Math.max(1, d.strength * 4))
      .attr('marker-end', d => (d.compatibility > 0.8 ? 'url(#arrow)' : null))
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (onLinkClick) {
          onLinkClick({
            source: d.source,
            target: d.target,
            compatibility: d.compatibility,
            resonanceType: d.resonanceType,
          })
        }
      })

    // Add link labels for high compatibility connections
    const linkLabels = g
      .append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links.filter(d => d.compatibility > 0.8))
      .join('text')
      .text(d => d.resonanceType)
      .attr('font-size', '10px')
      .attr('fill', '#666')
      .attr('text-anchor', 'middle')
      .style('pointer-events', 'none')

    // Create node groups
    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(
        d3
          .drag<SVGGElement, NetworkNode>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }) as any
      )
      .on('click', (event, d) => {
        const agent = agents.find(a => a.id === d.id)
        if (agent && onNodeClick) {
          onNodeClick(agent)
        }
      })

    // Add node background circles with glow effect
    node
      .append('circle')
      .attr('class', 'node-glow')
      .attr('r', d => d.radius + 5)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.3)
      .style('filter', 'blur(2px)')

    // Add main node circles
    node
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', d => d.radius)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', d => (d.status === 'responding' ? 1 : 0.8))

    // Add consciousness level rings
    node
      .append('circle')
      .attr('class', 'consciousness-ring')
      .attr('r', d => d.radius + 8)
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => Math.max(1, d.consciousness))
      .attr('stroke-dasharray', '5,5')
      .style('opacity', 0.6)

    // Add symbols/icons
    node
      .append('text')
      .attr('class', 'node-symbol')
      .text(d => d.symbol)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', d => Math.max(12, d.radius / 2))
      .attr('fill', '#fff')
      .style('pointer-events', 'none')

    // Add status indicators
    node
      .append('circle')
      .attr('class', 'status-indicator')
      .attr('r', 4)
      .attr('cx', d => d.radius * 0.7)
      .attr('cy', d => -d.radius * 0.7)
      .attr('fill', d => {
        switch (d.status) {
          case 'thinking':
            return '#fbbf24'
          case 'responding':
            return '#10b981'
          default:
            return '#6b7280'
        }
      })
      .style('opacity', d => (d.status === 'idle' ? 0 : 1))

    // Add node labels if enabled
    if (showLabels) {
      node
        .append('text')
        .attr('class', 'node-label')
        .text(d => d.name)
        .attr('x', 0)
        .attr('y', d => d.radius + 15)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#333')
        .style('pointer-events', 'none')
    }

    // Animation for active connections
    if (isPlaying) {
      const animateFlows = () => {
        link
          .filter(d => d.compatibility > 0.7)
          .attr('stroke-dasharray', '5,5')
          .attr('stroke-dashoffset', 0)
          .transition()
          .duration(2000)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', -10)
          .on('end', function () {
            if (isPlaying) {
              d3.select(this).transition().duration(0).attr('stroke-dashoffset', 0)
              animateFlows()
            }
          })

        // Pulse consciousness rings
        node
          .select('.consciousness-ring')
          .transition()
          .duration(2000)
          .ease(d3.easeSinInOut)
          .attr('stroke-opacity', 0.2)
          .transition()
          .duration(2000)
          .ease(d3.easeSinInOut)
          .attr('stroke-opacity', 0.8)
          .on('end', function () {
            if (isPlaying) animateFlows()
          })
      }

      animateFlows()
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as NetworkNode).x!)
        .attr('y1', d => (d.source as NetworkNode).y!)
        .attr('x2', d => (d.target as NetworkNode).x!)
        .attr('y2', d => (d.target as NetworkNode).y!)

      linkLabels
        .attr('x', d => ((d.source as NetworkNode).x! + (d.target as NetworkNode).x!) / 2)
        .attr('y', d => ((d.source as NetworkNode).y! + (d.target as NetworkNode).y!) / 2)

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Cleanup function
    return () => {
      simulation.stop()
    }
  }, [
    agents,
    groupDynamics,
    width,
    height,
    isPlaying,
    forceStrength,
    nodeRadius,
    linkDistance,
    showLabels,
    onNodeClick,
    onLinkClick,
  ])

  useEffect(() => {
    const cleanup = setupVisualization()
    return cleanup
  }, [setupVisualization])

  const handleDownload = () => {
    if (!svgRef.current) return

    const svgData = new XMLSerializer().serializeToString(svgRef.current)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    canvas.width = width
    canvas.height = height

    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      ctx.drawImage(img, 0, 0)

      const link = document.createElement('a')
      link.download = `consciousness-network-${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
    }

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    img.src = url
  }

  const handleReset = () => {
    setZoomLevel(1)
    setForceStrength([0.3])
    setNodeRadius([20])
    setLinkDistance([100])

    if (svgRef.current) {
      const svg = d3.select(svgRef.current)
      svg
        .select('.network-container')
        .transition()
        .duration(750)
        .attr('transform', 'translate(0,0) scale(1)')
    }
  }

  const handleZoom = (factor: number) => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()

    svg
      .transition()
      .duration(300)
      .call(zoom.scaleBy as any, factor)
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Consciousness Network</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">{agents.length} nodes</Badge>
              <Badge variant="outline">{links.length} connections</Badge>
              {groupDynamics && (
                <Badge variant="outline">
                  {groupDynamics.consciousnessNetwork.groupConsciousness === null
                    ? 'Group level not computed'
                    : `${groupDynamics.consciousnessNetwork.groupConsciousness.toFixed(2)} group level`}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom(1.2)}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.8)}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {showSettings && (
          <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium mb-2 block">Force Strength</label>
              <Slider
                value={forceStrength}
                onValueChange={setForceStrength}
                min={0.1}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Node Size</label>
              <Slider
                value={nodeRadius}
                onValueChange={setNodeRadius}
                min={10}
                max={40}
                step={5}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Link Distance</label>
              <Slider
                value={linkDistance}
                onValueChange={setLinkDistance}
                min={50}
                max={200}
                step={25}
                className="w-full"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="relative border rounded-lg overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
          <svg
            ref={svgRef}
            width={width}
            height={height}
            className="block"
            style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}
          />

          {showMetrics && (
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
              <div className="text-xs space-y-1">
                <div>Zoom: {(zoomLevel * 100).toFixed(0)}%</div>
                <div>Nodes: {nodes.length}</div>
                <div>Links: {links.length}</div>
                {groupDynamics && (
                  <>
                    <div>
                      Avg Compatibility:{' '}
                      {(
                        links.reduce((sum, l) => sum + l.compatibility, 0) / links.length || 0
                      ).toFixed(2)}
                    </div>
                    <div>
                      Group Consciousness:{' '}
                      {groupDynamics.consciousnessNetwork.groupConsciousness === null
                        ? 'not computed'
                        : groupDynamics.consciousnessNetwork.groupConsciousness.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-sm">
            <div className="text-xs space-y-2">
              <div className="font-medium">Legend:</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>Historical</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span>Planetary</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span>Monica</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <span>High Synergy</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ConsciousnessNetworkGraph
