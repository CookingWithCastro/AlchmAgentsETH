import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Legacy login has been retired. Use the unified Alchm sign-in.',
      signInUrl: '/auth/signin?callbackUrl=/profile',
    },
    { status: 410 }
  )
}
