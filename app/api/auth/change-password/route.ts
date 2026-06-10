import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user.id

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await req.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'New password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Get user with current password hash
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    })

    if (!user?.passwordHash) {
      return NextResponse.json(
        { error: 'User account not found or missing password' },
        { status: 404 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { passwordHash: hashedNewPassword },
    })

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
