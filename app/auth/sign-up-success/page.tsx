import Link from 'next/link'
import { Header } from '@/components/header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, ArrowRight } from 'lucide-react'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto">
          <Card className="bg-card border-primary/30 kaiba-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                <Mail className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl" style={{ fontFamily: 'var(--font-orbitron)' }}>
                Check Your Email
              </CardTitle>
              <CardDescription>
                We&apos;ve sent you a verification link
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                You&apos;ve successfully signed up! Please check your email to
                confirm your account before signing in. The verification link will expire in 24 hours.
              </p>
              <Button asChild variant="outline" className="w-full border-primary/50 hover:bg-primary/10">
                <Link href="/auth/login">
                  Go to Login
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
