import MFAVerificationScreen from '../../src/screens/auth/MFAVerificationScreen';
import { useAppSelector } from '../../src/hooks/useAuth';

export default function MFAScreen() {
  const { mfaSessionToken } = useAppSelector((state) => state.auth);

  if (!mfaSessionToken) {
    return null;
  }

  return <MFAVerificationScreen mfaSessionToken={mfaSessionToken} />;
}
