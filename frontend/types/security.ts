export interface Emergency {
  id: string;
  type: 'medical' | 'security' | 'fire' | 'other';
  location: {
    latitude: number;
    longitude: number;
    description: string;
  };
  status: 'active' | 'responding' | 'resolved';
  timestamp: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface SecurityStatus {
  isOnDuty: boolean;
  lastLocationUpdate: string;
  activeAlerts: number;
  respondingTo: string | null;
}

export interface ApiResponse<T> {
  data: T;
} 