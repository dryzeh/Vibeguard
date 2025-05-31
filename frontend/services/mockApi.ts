import { Emergency, SecurityStatus } from '../types/security';
import { AuthUser } from '../types/auth';

// Demo user data
const mockUser: AuthUser = {
  id: '1',
  email: 'demo@vibeguard.se',
  businessName: 'Demo Club',
  role: 'staff'
};

// Demo data
const mockEmergencies: Emergency[] = [
  {
    id: '1',
    type: 'medical',
    location: {
      latitude: 59.3293,
      longitude: 18.0686,
      description: 'Main Entrance'
    },
    status: 'active',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    description: 'Medical emergency reported at main entrance',
    priority: 'high'
  },
  {
    id: '2',
    type: 'security',
    location: {
      latitude: 59.3294,
      longitude: 18.0687,
      description: 'VIP Section'
    },
    status: 'responding',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    description: 'Security incident in VIP section',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'fire',
    location: {
      latitude: 59.3292,
      longitude: 18.0685,
      description: 'Kitchen Area'
    },
    status: 'active',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 minutes ago
    description: 'Fire alarm triggered in kitchen area',
    priority: 'high'
  }
];

let mockStatus: SecurityStatus = {
  isOnDuty: false,
  lastLocationUpdate: new Date().toISOString(),
  activeAlerts: 2,
  respondingTo: '2'
};

// Mock API implementation
export const mockApi = {
  // Login
  async login(credentials: { email: string; password: string }): Promise<{ user: AuthUser; token: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (credentials.email === 'demo@vibeguard.se' && credentials.password === 'demo123') {
      return {
        user: mockUser,
        token: 'mock-jwt-token'
      };
    }
    throw new Error('Invalid credentials');
  },

  // Get all emergencies
  async getEmergencies(): Promise<Emergency[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [...mockEmergencies];
  },

  // Get current security status
  async getStatus(): Promise<SecurityStatus> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return { ...mockStatus };
  },

  // Update duty status
  async updateDutyStatus(isOnDuty: boolean): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockStatus = {
      ...mockStatus,
      isOnDuty
    };
  },

  // Update security location
  async updateLocation(latitude: number, longitude: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 300));
    mockStatus = {
      ...mockStatus,
      lastLocationUpdate: new Date().toISOString()
    };
  },

  // Respond to an emergency
  async respondToEmergency(emergencyId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const emergency = mockEmergencies.find(e => e.id === emergencyId);
    if (emergency) {
      emergency.status = 'responding';
      mockStatus = {
        ...mockStatus,
        respondingTo: emergencyId,
        activeAlerts: mockStatus.activeAlerts - 1
      };
    }
  },

  // Resolve an emergency
  async resolveEmergency(emergencyId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const emergency = mockEmergencies.find(e => e.id === emergencyId);
    if (emergency) {
      emergency.status = 'resolved';
      mockStatus = {
        ...mockStatus,
        respondingTo: null
      };
    }
  }
}; 