/**
 * Session verification system
 * Shows random prompts during focus sessions to prevent AFK farming
 */

import { Alert } from 'react-native';
import { REWARDS } from './constants';

export class VerificationSystem {
  private verificationPending = false;
  private verificationTimeout: NodeJS.Timeout | null = null;
  private onVerificationFailed: (() => void) | null = null;
  private verificationPassed = true;

  /**
   * Schedule verification at random time during sprint
   */
  scheduleVerification(onFailed: () => void): void {
    this.onVerificationFailed = onFailed;
    this.verificationPassed = false;

    // Pick random verification time
    const times = REWARDS.VERIFICATION_TIMES;
    const randomTime = times[Math.floor(Math.random() * times.length)];
    const timeoutMs = randomTime * 60 * 1000; // Convert to milliseconds

    this.verificationTimeout = setTimeout(() => {
      this.showVerificationPrompt();
    }, timeoutMs);
  }

  /**
   * Show verification prompt to user
   */
  private showVerificationPrompt(): void {
    this.verificationPending = true;

    Alert.alert(
      '✋ Focus Check',
      'Are you still working? Tap to confirm.',
      [
        {
          text: "Yes, I'm focused!",
          onPress: () => this.handleVerificationSuccess()
        }
      ],
      { cancelable: false }
    );

    // Auto-fail after timeout
    setTimeout(() => {
      if (this.verificationPending) {
        this.handleVerificationFailure();
      }
    }, REWARDS.VERIFICATION_TIMEOUT * 1000);
  }

  /**
   * User passed verification
   */
  private handleVerificationSuccess(): void {
    this.verificationPending = false;
    this.verificationPassed = true;
    console.log('✅ Verification passed');
  }

  /**
   * User failed verification (timeout or no response)
   */
  private handleVerificationFailure(): void {
    this.verificationPending = false;
    this.verificationPassed = false;

    Alert.alert(
      '❌ Verification Failed',
      "You didn't respond in time. This session will not earn rewards.",
      [{ text: 'OK' }]
    );

    this.onVerificationFailed?.();
  }

  /**
   * Clear verification timer
   */
  clearVerification(): void {
    if (this.verificationTimeout) {
      clearTimeout(this.verificationTimeout);
      this.verificationTimeout = null;
    }
    this.verificationPending = false;
  }

  /**
   * Check if verification passed
   */
  isVerified(): boolean {
    return this.verificationPassed;
  }

  /**
   * Reset verification state
   */
  reset(): void {
    this.clearVerification();
    this.verificationPassed = true;
    this.verificationPending = false;
  }
}
