import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    {
      error: 'Password registration has been retired. Continue with the unified Alchm sign-in.',
      signInUrl: '/auth/signin?callbackUrl=/profile',
    },
    { status: 410 }
  )
}
