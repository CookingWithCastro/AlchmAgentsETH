import { WebSocketServer, WebSocket } from 'ws'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '../utils/logger.js'
import { planetaryHoursService } from '../services/planetary-hours.js'
import { tokenCalculatorService } from '../services/token-calculator.js'

interface WebSocketClient {
  id: string
  ws: WebSocket
  subscriptions: Set<string>
  location?: { lat: number; lon: number }
  lastPing: number
}

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping' | 'request'
  channel?: string
  data?: any
  requestId?: string
}

interface WebSocketResponse {
  type: 'update' | 'pong' | 'response' | 'error'
  channel?: string
  data?: any
  requestId?: string
  error?: string
}

class WebSocketManager {
  private clients = new Map<string, WebSocketClient>()
  private channels = new Map<string, Set<string>>() // channel -> set of client IDs
  private updateIntervals = new Map<string, NodeJS.Timeout>()

  constructor(private wss: WebSocketServer) {
    this.setupHeartbeat()
    this.startChannelUpdates()
  }

  setupConnection(ws: WebSocket): void {
    const clientId = uuidv4()
    const client: WebSocketClient = {
      id: clientId,
      ws,
      subscriptions: new Set(),
      lastPing: Date.now(),
    }

    this.clients.set(clientId, client)
    logger.info(`WebSocket client connected: ${clientId}`)

    ws.on('message', data => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString())
        this.handleMessage(clientId, message)
      } catch (error) {
        logger.error('Invalid WebSocket message:', error)
        this.sendError(clientId, 'Invalid message format')
      }
    })

    ws.on('close', () => {
      this.handleDisconnection(clientId)
    })

    ws.on('error', error => {
      logger.error(`WebSocket error for client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    })

    // Send welcome message
    this.sendMessage(clientId, {
      type: 'response',
      data: {
        clientId,
        availableChannels: ['planetary-hours', 'token-rates', 'thermodynamics', 'kinetics-power'],
        message: 'Connected to Planetary Agents WebSocket server',
      },
    })
  }

  private handleMessage(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.lastPing = Date.now()

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.channel!, message.data)
        break

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.channel!)
        break

      case 'ping':
        this.sendMessage(clientId, { type: 'pong' })
        break

      case 'request':
        this.handleRequest(clientId, message)
        break

      default:
        this.sendError(clientId, `Unknown message type: ${message.type}`)
    }
  }

  private handleSubscription(clientId: string, channel: string, data?: any): void {
    const client = this.clients.get(clientId)
    if (!client) return

    // Validate channel
    const validChannels = ['planetary-hours', 'token-rates', 'thermodynamics', 'kinetics-power']
    if (!validChannels.includes(channel)) {
      this.sendError(clientId, `Invalid channel: ${channel}`)
      return
    }

    // Store location if provided
    if (data?.location) {
      client.location = data.location
    }

    // Add to channel
    client.subscriptions.add(channel)
    if (!this.channels.has(channel)) {
      this.channels.set(channel, new Set())
    }
    this.channels.get(channel)!.add(clientId)

    logger.info(`Client ${clientId} subscribed to ${channel}`)

    this.sendMessage(clientId, {
      type: 'response',
      data: {
        subscribed: channel,
        message: `Subscribed to ${channel}`,
      },
    })

    // Send initial data
    this.sendInitialData(clientId, channel)
  }

  private handleUnsubscription(clientId: string, channel: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    client.subscriptions.delete(channel)
    this.channels.get(channel)?.delete(clientId)

    logger.info(`Client ${clientId} unsubscribed from ${channel}`)

    this.sendMessage(clientId, {
      type: 'response',
      data: {
        unsubscribed: channel,
        message: `Unsubscribed from ${channel}`,
      },
    })
  }

  private async handleRequest(clientId: string, message: WebSocketMessage): Promise<void> {
    const { requestId, data } = message
    const client = this.clients.get(clientId)
    if (!client) return

    try {
      let responseData: any = null

      switch (data?.action) {
        case 'getCurrentPlanetaryHour':
          if (client.location) {
            responseData = await planetaryHoursService.getCurrentPlanetaryHour(
              data.datetime ? new Date(data.datetime) : new Date(),
              client.location
            )
          } else {
            throw new Error('Location required for planetary hour requests')
          }
          break

        case 'getTokenRates':
          if (client.location) {
            const tokens = data.tokens || { Spirit: 1.0, Essence: 0.8, Matter: 0.6, Substance: 0.4 }
            responseData = await tokenCalculatorService.calculateTokens({
              tokens,
              location: client.location,
              timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
            })
          } else {
            throw new Error('Location required for token rate requests')
          }
          break

        default:
          throw new Error(`Unknown action: ${data?.action}`)
      }

      this.sendMessage(clientId, {
        type: 'response',
        requestId,
        data: responseData,
      })
    } catch (error) {
      this.sendMessage(clientId, {
        type: 'error',
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  private async sendInitialData(clientId: string, channel: string): Promise<void> {
    const client = this.clients.get(clientId)
    if (!client || !client.location) return

    try {
      let data: any = null

      switch (channel) {
        case 'planetary-hours':
          data = await planetaryHoursService.getCurrentPlanetaryHour(new Date(), client.location)
          break

        case 'token-rates': {
          const tokens = { Spirit: 1.0, Essence: 0.8, Matter: 0.6, Substance: 0.4 }
          data = await tokenCalculatorService.calculateTokens({
            tokens,
            location: client.location,
          })
          break
        }

        case 'thermodynamics':
          data = { message: 'Thermodynamics data requires specific elemental values' }
          break

        case 'kinetics-power':
          data = { message: 'Kinetics power data will be updated every 5 minutes' }
          break
      }

      if (data) {
        this.sendMessage(clientId, {
          type: 'update',
          channel,
          data,
        })
      }
    } catch (error) {
      logger.error(`Error sending initial data for ${channel}:`, error)
    }
  }

  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId)
    if (!client) return

    // Remove from all channels
    client.subscriptions.forEach(channel => {
      this.channels.get(channel)?.delete(clientId)
    })

    this.clients.delete(clientId)
    logger.info(`WebSocket client disconnected: ${clientId}`)
  }

  private sendMessage(clientId: string, message: WebSocketResponse): void {
    const client = this.clients.get(clientId)
    if (!client || client.ws.readyState !== WebSocket.OPEN) return

    try {
      client.ws.send(JSON.stringify(message))
    } catch (error) {
      logger.error(`Error sending message to client ${clientId}:`, error)
      this.handleDisconnection(clientId)
    }
  }

  private sendError(clientId: string, error: string): void {
    this.sendMessage(clientId, { type: 'error', error })
  }

  private broadcastToChannel(channel: string, message: WebSocketResponse): void {
    const clientIds = this.channels.get(channel)
    if (!clientIds) return

    clientIds.forEach(clientId => {
      this.sendMessage(clientId, message)
    })
  }

  private setupHeartbeat(): void {
    const heartbeatInterval = setInterval(() => {
      const now = Date.now()
      const timeout = 60000 // 60 seconds

      this.clients.forEach((client, clientId) => {
        if (now - client.lastPing > timeout) {
          logger.info(`Client ${clientId} timed out`)
          client.ws.terminate()
          this.handleDisconnection(clientId)
        }
      })
    }, 30000) // Check every 30 seconds

    // Clean up on process exit
    process.on('SIGTERM', () => clearInterval(heartbeatInterval))
  }

  private startChannelUpdates(): void {
    // Planetary hours update every hour
    this.updateIntervals.set(
      'planetary-hours',
      setInterval(
        async () => {
          const clientIds = this.channels.get('planetary-hours')
          if (!clientIds || clientIds.size === 0) return

          for (const clientId of clientIds) {
            const client = this.clients.get(clientId)
            if (client?.location) {
              try {
                const data = await planetaryHoursService.getCurrentPlanetaryHour(
                  new Date(),
                  client.location
                )
                this.sendMessage(clientId, {
                  type: 'update',
                  channel: 'planetary-hours',
                  data,
                })
              } catch (error) {
                logger.error(`Error updating planetary hours for client ${clientId}:`, error)
              }
            }
          }
        },
        60 * 60 * 1000
      )
    ) // Every hour

    // Token rates update every 5 minutes
    this.updateIntervals.set(
      'token-rates',
      setInterval(
        async () => {
          const clientIds = this.channels.get('token-rates')
          if (!clientIds || clientIds.size === 0) return

          for (const clientId of clientIds) {
            const client = this.clients.get(clientId)
            if (client?.location) {
              try {
                const tokens = { Spirit: 1.0, Essence: 0.8, Matter: 0.6, Substance: 0.4 }
                const data = await tokenCalculatorService.calculateTokens({
                  tokens,
                  location: client.location,
                })
                this.sendMessage(clientId, {
                  type: 'update',
                  channel: 'token-rates',
                  data,
                })
              } catch (error) {
                logger.error(`Error updating token rates for client ${clientId}:`, error)
              }
            }
          }
        },
        5 * 60 * 1000
      )
    ) // Every 5 minutes

    // Kinetics power update every 10 minutes
    this.updateIntervals.set(
      'kinetics-power',
      setInterval(
        () => {
          this.broadcastToChannel('kinetics-power', {
            type: 'update',
            channel: 'kinetics-power',
            data: {
              timestamp: new Date().toISOString(),
              powerLevel: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
              trend: Math.random() > 0.5 ? 'ascending' : 'descending',
              nextUpdate: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
            },
          })
        },
        10 * 60 * 1000
      )
    ) // Every 10 minutes
  }

  getStats(): {
    totalClients: number
    activeChannels: number
    channelSubscriptions: Record<string, number>
  } {
    const channelSubscriptions: Record<string, number> = {}
    this.channels.forEach((clients, channel) => {
      channelSubscriptions[channel] = clients.size
    })

    return {
      totalClients: this.clients.size,
      activeChannels: this.channels.size,
      channelSubscriptions,
    }
  }

  shutdown(): void {
    // Clear all intervals
    this.updateIntervals.forEach(interval => clearInterval(interval))
    this.updateIntervals.clear()

    // Close all connections
    this.clients.forEach(client => {
      client.ws.close()
    })
    this.clients.clear()
    this.channels.clear()

    logger.info('WebSocket manager shut down')
  }
}

let wsManager: WebSocketManager | null = null

export function setupWebSocketHandlers(wss: WebSocketServer): void {
  wsManager = new WebSocketManager(wss)

  wss.on('connection', ws => {
    wsManager!.setupConnection(ws)
  })

  logger.info('WebSocket handlers set up successfully')
}

export function getWebSocketStats() {
  return wsManager?.getStats() || { totalClients: 0, activeChannels: 0, channelSubscriptions: {} }
}

export function shutdownWebSocket(): void {
  wsManager?.shutdown()
}
