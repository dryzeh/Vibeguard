import { StyleProp, ViewStyle } from 'react-native';
import { Marker, MarkerProps } from 'react-native-maps';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SECURITY' | 'STAFF';
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  deviceId?: string;
  nightclubId?: string;
  lastLogin?: Date;
  lastLocation?: GeoLocation;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface Nightclub {
  id: string;
  name: string;
  address: string;
  floorPlans: FloorPlan[];
  settings?: Record<string, unknown>;
}

export interface FloorPlan {
  id: string;
  name: string;
  imageUrl: string;
  nightclubId: string;
  zones: Zone[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Zone {
  id: string;
  name: string;
  coordinates: GeoPoint[];
  capacity: number;
  currentOccupancy?: number;
  floorPlanId: string;
  floorPlan: FloorPlan;
  nightclubId: string;
  alerts: Alert[];
  sensors: Sensor[];
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Sensor {
  id: string;
  type: 'MOTION' | 'TEMPERATURE' | 'HUMIDITY' | 'NOISE' | 'OCCUPANCY';
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FAULT';
  zoneId: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  lastReading?: Date;
}

export interface Alert {
  id: string;
  type: 'EMERGENCY' | 'BATTERY_LOW' | 'SIGNAL_LOSS' | 'ZONE_BREACH' | 'TAMPERING';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  braceletId: string;
  userId: string;
  zoneId: string;
  zone: Zone;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

export interface Emergency {
  id: string;
  status: 'ACTIVE' | 'RESPONDING' | 'ESCALATED' | 'RESOLVED';
  braceletId: string;
  zoneId: string;
  nightclubId: string;
  responderId?: string;
  responseTime?: number;
  escalationDetails?: Record<string, unknown>;
  resolutionDetails?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface Bracelet {
  id: string;
  deviceId: string;
  batteryLevel?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'LOST';
  nightclubId: string;
  lastSeen?: Date;
  metadata?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface MapMarker extends Omit<MarkerProps, 'coordinate'> {
  coordinate: GeoLocation;
  style?: StyleProp<ViewStyle>;
}

export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    error: string;
    text: string;
    disabled: string;
    placeholder: string;
    backdrop: string;
    notification: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: {
      regular: string;
      medium: string;
      bold: string;
    };
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
  };
  shadows: {
    sm: ViewStyle;
    md: ViewStyle;
    lg: ViewStyle;
  };
  animations: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: {
      easeInOut: string;
      easeIn: string;
      easeOut: string;
    };
  };
} 