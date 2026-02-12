export type AlertType = 'follow' | 'subscription' | 'donation' | 'raid';

export interface Alert {
  id: string;
  type: AlertType;
  username: string;
  message?: string;
  amount?: number;
  currency?: string;
  duration?: number; // duration in ms
  image?: string;
}
