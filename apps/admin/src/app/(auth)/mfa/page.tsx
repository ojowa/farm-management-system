'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, RotateCcw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { mfaSchema, type MFAInput } from '@/lib/validation';
import { authAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toasts';
import { useRouter, useSearchParams } from 'next/navigation';

export default function MFAPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [resendCooldown, setResendCooldown] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const mfaSessionToken = searchParams.get('mfaSessionToken') ||
    (typeof window !== 'undefined' ? localStorage.getItem('mfaSessionToken') : null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MFAInput>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: '',
    },
  });

  // Handle resend cooldown
  React.useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const onSubmit = async (data: MFAInput) => {
    if (!mfaSessionToken) {
      setError('MFA session expired. Please log in again.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { data: response } = await authAPI.verifyMFA({
        mfaSessionToken,
        code: data.code,
      });

      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.removeItem('mfaSessionToken');

      toast({
        type: 'success',
        title: 'Verification successful!',
        message: 'You have been logged in.',
      });
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code. Please try again.';
      setError(message);
      toast({
        type: 'error',
        title: 'Verification failed',
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!mfaSessionToken) {
      setError('MFA session expired. Please log in again.');
      return;
    }

    setIsResending(true);
    try {
      // Call resend MFA endpoint (you may need to add this to authAPI)
      await authAPI.verifyMFA({
        mfaSessionToken,
        code: 'resend', // Special code to trigger resend
      });
      setResendCooldown(60);
      toast({
        type: 'success',
        title: 'Code sent',
        message: 'A new verification code has been sent to your email.',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resend code. Please try again.';
      setError(message);
      toast({
        type: 'error',
        title: 'Resend failed',
        message,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleBackToLogin = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mfaSessionToken');
    }
    router.push('/(auth)/login');
  };

  return (
    <div className="w-full">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to your email address
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div
              className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-destructive text-sm"
              role="alert"
            >
              <RotateCcw className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                className="text-center text-2xl tracking-widest font-mono"
                {...register('code')}
                disabled={isLoading}
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'code-error' : undefined}
              />
              {errors.code && (
                <p id="code-error" className="text-sm text-destructive text-center" role="alert">
                  {errors.code.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isLoading}
              disabled={isLoading}
            >
              Verify Code
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
            >
              {resendCooldown > 0 ? (
                <>
                  <RotateCcw className="mr-2 h-4 w-4 animate-spin" />
                  Resend in {resendCooldown}s
                </>
              ) : isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Resend Code
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleBackToLogin}
              disabled={isLoading || isResending}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <p className="text-center text-sm text-muted-foreground">
            Didn&apos;t receive the code? Check your spam folder or{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              className="text-primary hover:underline font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              request a new one
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}