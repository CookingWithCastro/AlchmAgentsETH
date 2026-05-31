import { NextResponse } from 'next/server'
import { AgentAttachmentsService } from '@/lib/agent-attachments-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const agentId = searchParams.get('agentId')
    const type = searchParams.get('type')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    if (!agentId) {
      return NextResponse.json(
        {
          error: 'agentId parameter is required',
        },
        { status: 400 }
      )
    }

    const attachments = await AgentAttachmentsService.getAgentAttachments(
      agentId,
      type || undefined,
      activeOnly
    )

    return NextResponse.json({
      success: true,
      attachments,
      count: attachments.length,
    })
  } catch (error) {
    console.error('Error fetching agent attachments:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch attachments',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { agentId, type, name, description } = body

    if (!agentId) {
      return NextResponse.json(
        {
          error: 'agentId is required',
        },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        {
          error: 'type is required (birth_chart, moment_chart, rune, or custom)',
        },
        { status: 400 }
      )
    }

    let attachment

    switch (type) {
      case 'birth_chart': {
        const { birthDate, birthTime, birthLocation } = body
        if (!birthDate || !birthLocation) {
          return NextResponse.json(
            {
              error: 'birthDate and birthLocation are required for birth charts',
            },
            { status: 400 }
          )
        }

        attachment = await AgentAttachmentsService.addBirthChart(
          agentId,
          {
            date: new Date(birthDate),
            time: birthTime,
            location: birthLocation,
            name,
          },
          description
        )
        break
      }

      case 'moment_chart': {
        const { momentDate, momentTime, momentLocation, momentName } = body
        if (!momentDate || !momentLocation || !momentName) {
          return NextResponse.json(
            {
              error: 'momentDate, momentLocation, and momentName are required for moment charts',
            },
            { status: 400 }
          )
        }

        attachment = await AgentAttachmentsService.addMomentChart(
          agentId,
          {
            date: new Date(momentDate),
            time: momentTime,
            location: momentLocation,
            name,
          },
          momentName,
          description
        )
        break
      }

      case 'rune': {
        const { runeType, runePower, runeEffects, runeCost } = body
        if (!runeType || !runePower || !runeEffects) {
          return NextResponse.json(
            {
              error: 'runeType, runePower, and runeEffects are required for runes',
            },
            { status: 400 }
          )
        }

        attachment = await AgentAttachmentsService.addRune(
          agentId,
          {
            runeType,
            runePower: parseFloat(runePower),
            runeEffects: Array.isArray(runeEffects) ? runeEffects : [runeEffects],
            runeCost: runeCost || { spirit: 0, essence: 0, matter: 0, substance: 0 },
          },
          name || `${runeType} Rune`,
          description
        )
        break
      }

      default:
        return NextResponse.json(
          {
            error: `Unsupported attachment type: ${type}`,
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      attachment,
      message: `${type} attachment created successfully`,
    })
  } catch (error) {
    console.error('Error creating agent attachment:', error)
    return NextResponse.json(
      {
        error: 'Failed to create attachment',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { attachmentId, ...updates } = body

    if (!attachmentId) {
      return NextResponse.json(
        {
          error: 'attachmentId is required',
        },
        { status: 400 }
      )
    }

    const attachment = await AgentAttachmentsService.updateAttachment(attachmentId, updates)

    return NextResponse.json({
      success: true,
      attachment,
      message: 'Attachment updated successfully',
    })
  } catch (error) {
    console.error('Error updating agent attachment:', error)
    return NextResponse.json(
      {
        error: 'Failed to update attachment',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json(
        {
          error: 'attachmentId parameter is required',
        },
        { status: 400 }
      )
    }

    await AgentAttachmentsService.deleteAttachment(attachmentId)

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting agent attachment:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete attachment',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
