import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import ClaimInviteClient from './claim-client'

function ClaimLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ClaimInvitePage() {
  return (
    <Suspense fallback={<ClaimLoading />}>
      <ClaimInviteClient />
    </Suspense>
  )
}
