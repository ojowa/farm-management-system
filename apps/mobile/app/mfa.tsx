import MFAVerificationScreen from '@/screens/auth/MFAVerificationScreen';
import { useAppSelector } from '@/hooks/useAuth';

export default function MFAScreen() {
  const { mfaSessionToken } = useAppSelector((state) => state.auth);

  if (!mfaSessionToken) {
    return null;
  }

  return <MFAVerificationScreen mfaSessionToken={mfaSessionToken} />;
}


